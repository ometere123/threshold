// Generate test wallets for StudioNet
// Usage: node scripts/generate-keys.mjs

import { ethers } from "ethers";
import { writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function generateWallet(label) {
  const wallet = ethers.Wallet.createRandom();
  return {
    label,
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic?.phrase || "N/A",
  };
}

console.log("🔑 Generating test wallets for GenLayer StudioNet...\n");

const wallets = [
  generateWallet("deployer"),
  generateWallet("underwriter"),
  generateWallet("policyholder"),
  generateWallet("claimant"),
];

console.log("═══════════════════════════════════════════════════════════");
wallets.forEach((w) => {
  console.log(`\n[${w.label.toUpperCase()}]`);
  console.log(`  Address:     ${w.address}`);
  console.log(`  Private Key: ${w.privateKey}`);
  console.log(`  Mnemonic:    ${w.mnemonic}`);
});
console.log("\n═══════════════════════════════════════════════════════════");

// Save to file
const keysPath = path.join(__dirname, "../.test-wallets.json");
writeFileSync(keysPath, JSON.stringify(wallets, null, 2));
console.log(`\n💾 Wallets saved to .test-wallets.json (DO NOT COMMIT)`);
console.log(
  `\n⚠️  Fund these addresses at: https://studio.genlayer.com/faucet`
);
console.log(
  `\nTo deploy: DEPLOYER_PRIVATE_KEY=${wallets[0].privateKey} node scripts/deploy.mjs`
);

// Generate .env.test for test script
const envTest = wallets
  .map((w) => `TEST_${w.label.toUpperCase()}_KEY=${w.privateKey}`)
  .join("\n");
writeFileSync(path.join(__dirname, "../.env.test"), envTest + "\n");
console.log(`💾 Test env written to .env.test`);
