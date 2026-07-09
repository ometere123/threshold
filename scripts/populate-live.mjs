// Populates the deployed contract with real, resolved claims - including at least one
// APPROVED (paid) claim - using genuine public evidence URLs, so the dashboard has
// non-trivial state and the full payout path is proven end-to-end on real StudioNet
// GenLayer validator consensus (no mocks).
//
// Usage: node scripts/populate-live.mjs
import { createClient, createAccount } from "genlayer-js";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const deployment = JSON.parse(readFileSync(path.join(__dirname, "../.deployment.json"), "utf8"));
const wallets = JSON.parse(readFileSync(path.join(__dirname, "../.test-wallets.json"), "utf8"));

const CONTRACT_ADDRESS = deployment.contractAddress;
const STUDIONET_RPC = "https://studio.genlayer.com/api";
const GEN = 10n ** 18n;

const key = (label) => wallets.find((w) => w.label === label)?.privateKey;
const addr = (label) => wallets.find((w) => w.label === label)?.address;

function makeClient(privateKey) {
  return createClient({ endpoint: STUDIONET_RPC, account: createAccount(privateKey) });
}

function parseResult(val) {
  if (typeof val === "string") {
    try { return JSON.parse(val); } catch { return val; }
  }
  return val;
}

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function waitForTx(client, txHash) {
  for (let i = 0; i < 40; i++) {
    await sleep(3000);
    try {
      const receipt = await client.getTransaction({ hash: txHash });
      if (receipt && (receipt.status === 7 || receipt.status === "FINALIZED")) return receipt;
    } catch {
      // keep polling
    }
  }
  throw new Error("not confirmed after 120s");
}

async function writeAndWait(client, functionName, args, value, label) {
  console.log(`  -> ${label}`);
  const txHash = await client.writeContract({ address: CONTRACT_ADDRESS, functionName, value: value ?? 0n, args });
  const receipt = await waitForTx(client, txHash);
  const lr = receipt?.consensus_data?.leader_receipt;
  const result = lr?.["0"] ?? lr;
  if (result?.result?.status === "contract_error" || result?.result?.status === "error") {
    throw new Error(result.result.payload || "contract_error");
  }
  return receipt;
}

async function read(client, functionName, args) {
  return parseResult(await client.readContract({ address: CONTRACT_ADDRESS, functionName, args }));
}

async function runScenario({ label, poolId, serviceSlug, component, policyholderLabel, evidenceUrl, incidentSummary, coverageAmount, minPremiumBps, deposit }) {
  console.log(`\n${"═".repeat(70)}\n${label}\n${"═".repeat(70)}`);

  const underwriterClient = makeClient(key("underwriter"));
  const holderClient = makeClient(key(policyholderLabel));
  const deployerClient = makeClient(key("deployer"));

  const policyId = `${poolId}_policy`;
  const claimId = `${poolId}_claim`;

  await writeAndWait(underwriterClient, "create_pool", [
    poolId, serviceSlug, component, minPremiumBps, coverageAmount, 3600n, 30n * 24n * 3600n,
  ], deposit, "create_pool");
  let pool = await read(underwriterClient, "get_pool", [poolId]);
  console.log(`     pool_capital=${pool.pool_capital}`);

  const requiredPremium = (coverageAmount * minPremiumBps) / 10000n;
  await writeAndWait(holderClient, "buy_policy", [poolId, policyId, coverageAmount, 7n * 24n * 3600n], requiredPremium, "buy_policy");
  let policy = await read(holderClient, "get_policy", [policyId]);
  console.log(`     policy status=${policy.status}, coverage=${policy.coverage_amount}`);

  await writeAndWait(holderClient, "submit_claim", [policyId, claimId, evidenceUrl, incidentSummary], 0n, "submit_claim");
  let claim = await read(holderClient, "get_claim", [claimId]);
  console.log(`     claim status=${claim.status}`);

  console.log("  -> resolve_claim (GenLayer validator consensus, ~60-120s)");
  await writeAndWait(deployerClient, "resolve_claim", [claimId], 0n, "resolve_claim");
  claim = await read(deployerClient, "get_claim", [claimId]);
  policy = await read(deployerClient, "get_policy", [policyId]);
  pool = await read(deployerClient, "get_pool", [poolId]);

  console.log(`\n  VERDICT: ${claim.verdict}`);
  console.log(`  payout_band: ${claim.payout_band}, confidence: ${claim.confidence}%`);
  console.log(`  reason: ${claim.reason}`);
  console.log(`  claim.status: ${claim.status}, payout_amount: ${claim.payout_amount}`);
  console.log(`  policy.status: ${policy.status}`);
  console.log(`  pool.claims_paid: ${pool.claims_paid}, pool.reserved_exposure: ${pool.reserved_exposure}`);

  return { poolId, policyId, claimId, claim, policy, pool };
}

async function main() {
  console.log("Populating live StudioNet contract with real-evidence claims");
  console.log(`Contract: ${CONTRACT_ADDRESS}`);

  // Optional: node scripts/populate-live.mjs A,C  -> run only scenarios A and C
  const only = process.argv[2] ? process.argv[2].split(",") : null;
  const shouldRun = (key) => !only || only.includes(key);

  const results = [];

  // Scenario A: real, severe, recently-resolved GitHub Actions incident (96% run-start
  // failures for a 20-min window inside a multi-hour critical-impact event). Uses the
  // incident's own permalink (server-rendered by statuspage.io, unlike the JS-driven
  // /history index) so gl.get_webpage can reliably fetch real text content.
  if (shouldRun("A")) results.push(await runScenario({
    label: "Scenario A: GitHub Actions - critical incident (expect qualifying/major outage)",
    poolId: `pool_actions_${Date.now()}`,
    serviceSlug: "status_page_uptime",
    component: "GitHub Actions",
    policyholderLabel: "policyholder",
    evidenceUrl: "https://www.githubstatus.com/api/v2/incidents/cstx3v63mklm.json",
    incidentSummary:
      "GitHub Actions suffered a critical-impact incident: run-start delays exceeding 5 minutes " +
      "escalating to roughly 96% of Actions runs failing to start during a sustained window, with " +
      "Pages builds and Copilot services also degraded, before mitigation and recovery.",
    coverageAmount: 50n * GEN,
    minPremiumBps: 500n,
    deposit: 500n * GEN,
  }));

  // Scenario B: real, moderate/minor GitHub Pages incident (deployment latency during a
  // demand surge, service stayed reachable) - expect a lesser verdict (minor_degradation /
  // insufficient_evidence / outside_policy_window are all plausible real outcomes here,
  // demonstrating the non-full-payout path with genuine evidence too.
  if (shouldRun("B")) results.push(await runScenario({
    label: "Scenario B: GitHub Pages - moderate incident (expect minor/partial or a real deny)",
    poolId: `pool_pages_${Date.now()}`,
    serviceSlug: "status_page_uptime",
    component: "GitHub Pages",
    policyholderLabel: "claimant",
    evidenceUrl: "https://www.githubstatus.com/api/v2/incidents/5bnwwg9tzd4q.json",
    incidentSummary:
      "GitHub Pages experienced degraded deployment performance and slow/failing deployments due " +
      "to a demand surge exceeding processing capacity; Pages access itself remained available " +
      "throughout while deployments were delayed for several hours.",
    coverageAmount: 20n * GEN,
    minPremiumBps: 500n,
    deposit: 200n * GEN,
  }));

  // Scenario C: synthetic-but-real, publicly hosted test fixture describing a full,
  // unplanned, 100%-availability outage dated within the policy's coverage window (real
  // incidents are always dated before a freshly-purchased policy's start_ts, which
  // correctly triggers outside_policy_window - see Scenarios A/B above). This proves the
  // full approve -> payout_queued -> GEN transfer path against real GenLayer validator
  // consensus, not a mock.
  if (shouldRun("C")) results.push(await runScenario({
    label: "Scenario C: fixture full outage (expect qualifying/major outage, full payout)",
    poolId: `pool_fixture_full_${Date.now()}`,
    serviceSlug: "threshold-demo-uptime",
    component: "Demo API Gateway",
    policyholderLabel: "policyholder",
    evidenceUrl: "https://raw.githubusercontent.com/ometere123/threshold/master/public/test-fixtures/demo-outage-full.html",
    incidentSummary:
      "Demo API Gateway has a complete, unplanned, currently-ongoing outage (100% error rate, " +
      "full loss of availability), first reported today and not yet resolved, confirmed on the " +
      "public demo status page. Not scheduled maintenance, not caused by a third party.",
    coverageAmount: 50n * GEN,
    minPremiumBps: 500n,
    deposit: 500n * GEN,
  }));

  // Scenario D: same idea, but a brief partial-latency degradation - proves the
  // minor_degradation -> 50% partial-payout path.
  if (shouldRun("D")) results.push(await runScenario({
    label: "Scenario D: fixture minor degradation (expect minor_degradation, partial payout)",
    poolId: `pool_fixture_minor_${Date.now()}`,
    serviceSlug: "threshold-demo-uptime",
    component: "Demo Web Hosting",
    policyholderLabel: "claimant",
    evidenceUrl: "https://raw.githubusercontent.com/ometere123/threshold/master/public/test-fixtures/demo-outage-minor.html",
    incidentSummary:
      "Demo Web Hosting saw elevated latency for about 15% of requests for under an hour today, " +
      "confirmed on the public demo status page. The component never fully went down.",
    coverageAmount: 20n * GEN,
    minPremiumBps: 500n,
    deposit: 200n * GEN,
  }));

  console.log(`\n${"═".repeat(70)}\nSUMMARY\n${"═".repeat(70)}`);
  for (const r of results) {
    console.log(`${r.poolId}: verdict=${r.claim.verdict} band=${r.claim.payout_band} claim.status=${r.claim.status} payout=${r.claim.payout_amount}`);
  }
}

main().catch((err) => {
  console.error("\nFailed:", err);
  process.exit(1);
});
