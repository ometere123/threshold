# Threshold

Threshold is a funded GenLayer outage cover protocol.

Underwriters deposit real GEN into risk pools. Policyholders buy cover by paying real GEN
premiums. When a service outage happens, the policyholder submits public evidence. GenLayer
validators evaluate the evidence using non-deterministic consensus. If the claim qualifies, the
contract pays the policyholder from the funded pool.

There is no fake pool capital, no admin-entered balances, and no simulated numbers anywhere in
this build. Every capital figure shown in the frontend is a live read from the deployed contract.

## Live deployment

- Network: GenLayer StudioNet (Chain ID `61999`)
- RPC: `https://studio.genlayer.com/api`
- Contract address: see [`.deployment.json`](.deployment.json)
- Explorer: https://explorer-studio.genlayer.com

## How it works

```
Underwriter creates a pool with real GEN deposit
Policyholder buys outage cover with real GEN premium
Contract reserves exposure from the funded pool
Policyholder submits claim with public incident evidence
GenLayer validators evaluate evidence using nondeterministic consensus
If claim qualifies, contract pays real GEN to the policyholder
If claim fails, no payout is made
When policy expires, reserved exposure is released
```

## Repository layout

```
contract/threshold.py       GenLayer Intelligent Contract (payable, funded accounting)
scripts/                    Deployment, funding, and integration test scripts
src/lib/contract.ts         genlayer-js client wrapper (typed reads/writes)
src/lib/types.ts            Pool / Policy / Claim TypeScript types
src/app/app/                Risk Desk, Pools, Policies, Claims, Verdicts, Solvency pages
src/store/wallet.tsx        Injected wallet (MetaMask / Rabby) provider
```

## Running locally

```bash
npm install
npm run dev
```

Set `.env.local`:

```
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_CHAIN_ID=61999
NEXT_PUBLIC_RPC_URL=https://studio.genlayer.com/api
NEXT_PUBLIC_EXPLORER_URL=https://explorer-studio.genlayer.com
```

## Deploying and testing the contract

```bash
node scripts/generate-keys.mjs                 # generate test wallets
node scripts/fund-wallets.mjs                  # fund them via the StudioNet faucet RPC
DEPLOYER_PRIVATE_KEY=0x... node scripts/deploy.mjs
node scripts/test-contract.mjs                 # 20-case funded integration test suite
```

## Further reading

- [`CONTRACT.md`](CONTRACT.md) — contract architecture and method reference
- [`FUNDING_MODEL.md`](FUNDING_MODEL.md) — pool accounting and solvency invariants
- [`CLAIM_RESOLUTION.md`](CLAIM_RESOLUTION.md) — GenLayer validator consensus flow
- [`FRONTEND.md`](FRONTEND.md) — page map and wallet integration
- [`TESTING.md`](TESTING.md) — the 20-case integration test suite
- [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md) — a walkthrough script for demoing the protocol live
- [`KNOWN_LIMITATIONS.md`](KNOWN_LIMITATIONS.md) — honest constraints of the current MVP
