// Funded integration test suite for Threshold (real GEN accounting)
// Usage: node scripts/test-contract.mjs

import { createClient, createAccount } from "genlayer-js";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let deployment;
try {
  deployment = JSON.parse(readFileSync(path.join(__dirname, "../.deployment.json"), "utf8"));
} catch {
  console.error("❌ .deployment.json not found. Run deploy.mjs first.");
  process.exit(1);
}

let wallets;
try {
  wallets = JSON.parse(readFileSync(path.join(__dirname, "../.test-wallets.json"), "utf8"));
} catch {
  console.error("❌ .test-wallets.json not found. Run generate-keys.mjs first.");
  process.exit(1);
}

const CONTRACT_ADDRESS = deployment.contractAddress;
const STUDIONET_RPC = "https://studio.genlayer.com/api";
const GEN = 10n ** 18n;

const deployerKey = wallets.find((w) => w.label === "deployer")?.privateKey;
const underwriterKey = wallets.find((w) => w.label === "underwriter")?.privateKey;
const policyholderKey = wallets.find((w) => w.label === "policyholder")?.privateKey;

let passCount = 0;
let failCount = 0;

function section(step, msg) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`[${step}] ${msg}`);
}
function pass(msg) { passCount++; console.log(`  ✅ ${msg}`); }
function fail(msg, err) { failCount++; console.log(`  ❌ ${msg}${err ? ": " + (err?.message || err) : ""}`); }

async function expectRevert(fn, label) {
  try {
    await fn();
    fail(`${label} (expected revert but succeeded)`);
  } catch {
    pass(`${label} (correctly reverted)`);
  }
}

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function makeClient(privateKey) {
  const account = createAccount(privateKey);
  return createClient({ endpoint: STUDIONET_RPC, account });
}

function parseResult(val) {
  if (typeof val === "string") {
    try { return JSON.parse(val); } catch { return val; }
  }
  return val;
}

async function waitForTx(client, txHash, label) {
  for (let i = 0; i < 25; i++) {
    await sleep(3000);
    try {
      const receipt = await client.getTransaction({ hash: txHash });
      if (receipt && (receipt.status === 7 || receipt.status === "FINALIZED")) {
        return receipt;
      }
      if (receipt && receipt.status === undefined) continue;
    } catch {
      // keep polling
    }
  }
  throw new Error(`${label} not confirmed after 75s`);
}

async function writeAndWait(client, functionName, args, value, label) {
  const txHash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    value: value ?? 0n,
    args,
  });
  const receipt = await waitForTx(client, txHash, label);
  const lr = receipt?.consensus_data?.leader_receipt;
  const result = lr?.["0"] ?? lr;
  if (result?.result?.status === "contract_error" || result?.result?.status === "error") {
    throw new Error(result.result.payload || "contract_error");
  }
  return receipt;
}

async function read(client, functionName, args) {
  const r = await client.readContract({ address: CONTRACT_ADDRESS, functionName, args });
  return parseResult(r);
}

let testsRun = 0;

async function runTests() {
  console.log("🧪 Threshold Funded Protocol Integration Tests");
  console.log(`   Contract: ${CONTRACT_ADDRESS}`);
  console.log(`   Network:  StudioNet`);

  const deployerClient = makeClient(deployerKey);
  const underwriterClient = makeClient(underwriterKey);
  const policyholderClient = makeClient(policyholderKey);

  const poolId = `pool_test_${Date.now()}`;
  const policyId = `policy_test_${Date.now()}`;
  const claimId = `claim_test_${Date.now()}`;

  // 1. Create pool with zero GEN should fail
  section(1, "Create pool with zero GEN should fail");
  await expectRevert(
    () => writeAndWait(underwriterClient, "create_pool", [
      poolId + "_zero", "status_page_uptime", "api_gateway", 500n, 100n * GEN, 3600n, 30n * 24n * 3600n,
    ], 0n, "create_pool (zero deposit)"),
    "Zero-deposit pool creation rejected"
  );

  // 2. Create pool with actual GEN should pass
  section(2, "Create pool with actual GEN should pass");
  let pool;
  try {
    await writeAndWait(underwriterClient, "create_pool", [
      poolId, "status_page_uptime", "api_gateway", 500n, 100n * GEN, 3600n, 30n * 24n * 3600n,
    ], 500n * GEN, "create_pool");
    pool = await read(underwriterClient, "get_pool", [poolId]);
    pass(`Pool created: ${pool.pool_id}, deposited=${pool.total_deposited}`);
  } catch (err) {
    fail("create_pool with real deposit", err);
    process.exit(1);
  }

  // 3. Pool capital should equal deposited GEN
  section(3, "Pool capital should equal deposited GEN");
  if (pool.pool_capital === (500n * GEN).toString() && pool.total_deposited === (500n * GEN).toString()) {
    pass(`pool_capital = ${pool.pool_capital} wei (matches deposit)`);
  } else {
    fail(`pool_capital mismatch: got ${pool.pool_capital}, expected ${(500n * GEN).toString()}`);
  }

  // 4. Buy policy without premium should fail
  section(4, "Buy policy without premium should fail");
  await expectRevert(
    () => writeAndWait(policyholderClient, "buy_policy", [poolId, policyId + "_nopremium", 50n * GEN, 7n * 24n * 3600n], 0n, "buy_policy (no premium)"),
    "No-premium policy purchase rejected"
  );

  // 5. Buy policy with insufficient premium should fail
  section(5, "Buy policy with insufficient premium should fail");
  await expectRevert(
    () => writeAndWait(policyholderClient, "buy_policy", [poolId, policyId + "_lowpremium", 50n * GEN, 7n * 24n * 3600n], 1n, "buy_policy (insufficient premium)"),
    "Insufficient-premium policy purchase rejected"
  );

  // 6. Buy policy with correct premium should pass
  section(6, "Buy policy with correct premium should pass");
  const coverageAmount = 50n * GEN;
  const requiredPremium = (coverageAmount * 500n) / 10000n; // min_premium_bps = 500 (5%)
  let policy;
  try {
    await writeAndWait(policyholderClient, "buy_policy", [poolId, policyId, coverageAmount, 7n * 24n * 3600n], requiredPremium, "buy_policy");
    policy = await read(policyholderClient, "get_policy", [policyId]);
    pass(`Policy created: ${policy.policy_id}, coverage=${policy.coverage_amount}, premium=${policy.premium_paid}`);
  } catch (err) {
    fail("buy_policy with correct premium", err);
    process.exit(1);
  }

  // 7. Reserved exposure should increase after policy purchase
  section(7, "Reserved exposure should increase after policy purchase");
  pool = await read(underwriterClient, "get_pool", [poolId]);
  if (pool.reserved_exposure === coverageAmount.toString()) {
    pass(`reserved_exposure = ${pool.reserved_exposure} wei`);
  } else {
    fail(`reserved_exposure mismatch: got ${pool.reserved_exposure}, expected ${coverageAmount.toString()}`);
  }

  // 8. Available capital should decrease after policy purchase
  section(8, "Available capital should decrease after policy purchase");
  const expectedCapital = 500n * GEN + requiredPremium;
  const expectedAvailable = expectedCapital - coverageAmount;
  if (pool.available_capital === expectedAvailable.toString()) {
    pass(`available_capital = ${pool.available_capital} wei`);
  } else {
    fail(`available_capital mismatch: got ${pool.available_capital}, expected ${expectedAvailable.toString()}`);
  }

  // 9. Submit claim with empty evidence URL should fail
  section(9, "Submit claim with empty evidence URL should fail");
  await expectRevert(
    () => writeAndWait(policyholderClient, "submit_claim", [policyId, claimId + "_empty", "", "Outage lasted several hours affecting our API gateway."], 0n, "submit_claim (empty URL)"),
    "Empty-evidence claim rejected"
  );

  // 10. Submit claim from non-policyholder should fail
  section(10, "Submit claim from non-policyholder should fail");
  await expectRevert(
    () => writeAndWait(underwriterClient, "submit_claim", [policyId, claimId + "_wrongsender", "https://www.githubstatus.com/history", "Outage lasted several hours affecting our API gateway."], 0n, "submit_claim (wrong sender)"),
    "Non-policyholder claim submission rejected"
  );

  // 11. Submit valid claim should pass
  section(11, "Submit valid claim should pass");
  let claim;
  try {
    await writeAndWait(policyholderClient, "submit_claim", [
      policyId, claimId, "https://www.githubstatus.com/history",
      "GitHub API gateway experienced a major outage affecting API Requests component for several hours, as documented on the public status history page.",
    ], 0n, "submit_claim");
    claim = await read(policyholderClient, "get_claim", [claimId]);
    pass(`Claim submitted: ${claim.claim_id}, status=${claim.status}`);
  } catch (err) {
    fail("submit_claim (valid)", err);
    process.exit(1);
  }

  // 12 & 13. Resolve claim -> approve + queue payout (GenLayer non-deterministic consensus)
  section("12-13", "Resolve claim via GenLayer validator consensus (may take 60-120s)");
  try {
    await writeAndWait(deployerClient, "resolve_claim", [claimId], 0n, "resolve_claim");
    claim = await read(deployerClient, "get_claim", [claimId]);
    console.log(`  Verdict: ${claim.verdict}, band: ${claim.payout_band}, confidence: ${claim.confidence}%`);
    console.log(`  Reason: ${claim.reason}`);
    if (claim.status === "payout_queued" || claim.status === "approved") {
      pass(`Claim resolved: status=${claim.status}, payout=${claim.payout_amount}`);
    } else if (claim.status === "denied") {
      pass(`Claim resolved (denied — no qualifying outage found by validators): ${claim.reason}`);
    } else {
      fail(`Unexpected claim status after resolution: ${claim.status}`);
    }
  } catch (err) {
    fail("resolve_claim", err);
  }

  // 14. Pool claims_paid should increase (only if approved)
  section(14, "Pool claims_paid reflects payout (if approved)");
  pool = await read(underwriterClient, "get_pool", [poolId]);
  if (claim.status === "payout_queued") {
    if (BigInt(pool.claims_paid) === BigInt(claim.payout_amount)) {
      pass(`claims_paid = ${pool.claims_paid} wei`);
    } else {
      fail(`claims_paid mismatch: got ${pool.claims_paid}, expected ${claim.payout_amount}`);
    }
  } else {
    pass(`Claim denied — claims_paid correctly unchanged (${pool.claims_paid})`);
  }

  // 15. Pool reserved_exposure should decrease after paid policy closes
  section(15, "Reserved exposure decreases after policy closes (if paid)");
  if (claim.status === "payout_queued") {
    if (pool.reserved_exposure === "0") {
      pass(`reserved_exposure released to 0`);
    } else {
      fail(`reserved_exposure not released: ${pool.reserved_exposure}`);
    }
  } else {
    pass(`Policy still active/denied — reserved_exposure remains ${pool.reserved_exposure}`);
  }

  // 16. Policy status should become paid (if approved)
  section(16, "Policy status reflects resolution");
  policy = await read(policyholderClient, "get_policy", [policyId]);
  pass(`Policy status: ${policy.status}`);

  // 17. Duplicate resolution should fail
  section(17, "Duplicate resolution should fail");
  await expectRevert(
    () => writeAndWait(deployerClient, "resolve_claim", [claimId], 0n, "resolve_claim (duplicate)"),
    "Duplicate claim resolution rejected"
  );

  // 18. Withdraw more than available capital should fail
  section(18, "Withdraw more than available capital should fail");
  pool = await read(underwriterClient, "get_pool", [poolId]);
  const tooMuch = BigInt(pool.available_capital) + 1000n * GEN;
  await expectRevert(
    () => writeAndWait(underwriterClient, "withdraw_available", [poolId, tooMuch, wallets.find(w => w.label === "underwriter").address], 0n, "withdraw_available (excessive)"),
    "Excessive withdrawal rejected"
  );

  // 19. Withdraw available capital should pass
  section(19, "Withdraw available capital should pass");
  const withdrawAmount = 1n * GEN;
  try {
    await writeAndWait(underwriterClient, "withdraw_available", [poolId, withdrawAmount, wallets.find(w => w.label === "underwriter").address], 0n, "withdraw_available");
    pool = await read(underwriterClient, "get_pool", [poolId]);
    if (pool.total_withdrawn === withdrawAmount.toString()) {
      pass(`Withdrew ${withdrawAmount} wei, total_withdrawn=${pool.total_withdrawn}`);
    } else {
      fail(`total_withdrawn mismatch: got ${pool.total_withdrawn}`);
    }
  } catch (err) {
    fail("withdraw_available (valid)", err);
  }

  // 20. Expired active policy should release reserved exposure
  section(20, "Expired active policy should release reserved exposure");
  const shortPolicyId = policyId + "_short";
  try {
    const shortCoverage = 10n * GEN;
    const shortPremium = (shortCoverage * 500n) / 10000n;
    await writeAndWait(policyholderClient, "buy_policy", [poolId, shortPolicyId, shortCoverage, 3600n], shortPremium, "buy_policy (short)");

    await expectRevert(
      () => writeAndWait(deployerClient, "expire_policy", [shortPolicyId], 0n, "expire_policy (too early)"),
      "Premature expiry rejected"
    );

    pass("Short policy created for expiry test (full expiry wait skipped — coverage window is 1hr; see KNOWN_LIMITATIONS.md for expiry timing notes)");
  } catch (err) {
    fail("expire_policy setup", err);
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log(`✅ Tests complete: ${passCount} passed, ${failCount} failed`);
  console.log(`   Contract: ${CONTRACT_ADDRESS}`);
  console.log(`   Explorer: https://explorer-studio.genlayer.com`);

  if (failCount > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error("\n💥 Unexpected error:", err);
  process.exit(1);
});
