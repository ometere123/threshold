// Deploy Threshold contract to GenLayer StudioNet
// Usage: DEPLOYER_PRIVATE_KEY=0x... node scripts/deploy.mjs

import { createClient, createAccount } from "genlayer-js";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const STUDIONET_RPC = "https://studio.genlayer.com/api";
const CHAIN_ID = 61999;
const EXPLORER = "https://explorer-studio.genlayer.com";

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function deploy() {
  console.log("🚀 Deploying Threshold to GenLayer StudioNet...\n");

  const contractPath = path.join(__dirname, "../contract/threshold.py");
  const contractCode = readFileSync(contractPath, "utf8");

  const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!deployerPrivateKey) {
    console.error("❌ DEPLOYER_PRIVATE_KEY env var required");
    process.exit(1);
  }

  const account = createAccount(deployerPrivateKey);
  console.log(`   Deployer: ${account.address}`);

  const client = createClient({ endpoint: STUDIONET_RPC, account });

  try {
    console.log("📦 Deploying contract (sending tx)...");

    // deployContract returns the tx hash
    const txHash = await client.deployContract({
      code: contractCode,
      args: [],
    });

    console.log(`   Deploy tx: ${txHash}`);
    console.log(`   Explorer: ${EXPLORER}/tx/${txHash}`);
    console.log("⏳ Waiting for confirmation...");

    // Wait for receipt and extract contract address
    let contractAddress = null;
    for (let i = 0; i < 30; i++) {
      await sleep(4000);
      try {
        const receipt = await client.getTransaction({ hash: txHash });
        if (receipt) {
          // Try multiple fields where the contract address may appear
          // GenLayer StudioNet: contract address is in to_address field
          contractAddress =
            receipt?.to_address ||
            receipt?.txDataDecoded?.contractAddress ||
            receipt?.contractAddress ||
            receipt?.to ||
            receipt?.data?.contractAddress;

          if (contractAddress) {
            console.log(`✅ Contract deployed!`);
            console.log(`   Address: ${contractAddress}`);
            break;
          }
          // If receipt exists but no address yet, keep polling
          process.stdout.write(".");
        }
      } catch {
        process.stdout.write(".");
      }
    }

    if (!contractAddress) {
      // Fall back: derive from tx hash (GenLayer uses deterministic addressing)
      // On StudioNet the contract address is sometimes in a different field
      console.log("\n⚠️  Could not extract contract address from receipt.");
      console.log("   Using tx hash as contract reference. Check explorer for actual address.");
      contractAddress = txHash; // Temporary — user should check explorer
    }

    console.log("\n");

    const deployInfo = {
      contractAddress,
      transactionHash: txHash,
      network: "StudioNet",
      chainId: CHAIN_ID,
      deployedAt: new Date().toISOString(),
      explorerUrl: `${EXPLORER}/tx/${txHash}`,
    };

    const deployPath = path.join(__dirname, "../.deployment.json");
    writeFileSync(deployPath, JSON.stringify(deployInfo, null, 2));
    console.log(`💾 Deployment saved to .deployment.json`);

    const envContent = `NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}
NEXT_PUBLIC_CHAIN_ID=${CHAIN_ID}
NEXT_PUBLIC_RPC_URL=${STUDIONET_RPC}
NEXT_PUBLIC_EXPLORER_URL=${EXPLORER}
`;
    writeFileSync(path.join(__dirname, "../.env.local"), envContent);
    console.log(`💾 .env.local updated with contract address`);
    console.log(`\n🔍 View deployment: ${EXPLORER}/tx/${txHash}`);

    return contractAddress;
  } catch (error) {
    console.error("❌ Deployment failed:", error.message || error);
    process.exit(1);
  }
}

deploy();
