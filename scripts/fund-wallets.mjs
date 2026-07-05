// Fund test wallets with GEN via StudioNet simulator faucet
// Usage: node scripts/fund-wallets.mjs
import { createClient, createAccount } from "genlayer-js";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STUDIONET_RPC = "https://studio.genlayer.com/api";

const wallets = JSON.parse(readFileSync(path.join(__dirname, "../.test-wallets.json"), "utf8"));

// 10,000 GEN each (well under JS safe-integer issues since we pass Number)
const FUND_AMOUNT = 10000 * 1e18;

async function main() {
  for (const w of wallets) {
    const account = createAccount(w.privateKey);
    const client = createClient({ endpoint: STUDIONET_RPC, account });
    try {
      await client.fundAccount({ address: account.address, amount: FUND_AMOUNT });
      const bal = await client.getBalance({ address: account.address });
      console.log(`✅ ${w.label} (${account.address}) balance: ${bal}`);
    } catch (err) {
      console.error(`❌ ${w.label}:`, err.message);
    }
  }
}

main();
