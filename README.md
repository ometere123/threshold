<p align="center">
  <img src="public/logo.svg" alt="Threshold logo" width="120" height="120" />
</p>

<h1 align="center">THRESHOLD — Funded Outage Cover Protocol</h1>

<p align="center">
Real GEN-funded parametric outage cover on GenLayer. Underwriters deposit real GEN into risk pools.
Policyholders buy cover with real GEN premiums. When an outage happens, GenLayer validators
independently evaluate public evidence, reach non-deterministic consensus on a verdict, and the
contract pays the policyholder from the funded pool — or it doesn't. No admin-entered capital, no
simulated balances, no human adjuster.
</p>

## What it is

Connect your wallet, fund a risk pool with real GEN, and set the terms — service, covered
component, premium rate, max payout, duration bounds. Policyholders buy cover by paying a
deterministically-calculated premium, reserving exposure against the pool's real available
capital. When an incident occurs, the policyholder files a claim with one public evidence URL.
GenLayer's validator network fetches that URL directly, evaluates it against the policy terms, and
reaches consensus on a verdict — the result is written to contract state, not a server or database.

- **Funded, not promised** — every pool capital figure is backed by a real `payable` GEN transfer, verifiable on StudioNet
- **Deterministic pricing** — premiums are a fixed basis-points calculation on-chain, never LLM-decided
- **AI consensus resolution** — GenLayer validators independently fetch evidence and reach agreement via `gl.eq_principle.prompt_comparative` before any verdict is stored
- **Real payout path** — approved claims trigger an on-chain GEN transfer to the policyholder, not a UI status change
- **No off-chain storage** — no database, no admin panel. All pool, policy, and claim state lives in the GenLayer contract

## How it works

```
Underwriter creates a pool with real GEN deposit
Policyholder buys outage cover with real GEN premium
Contract reserves exposure from the funded pool
Policyholder submits claim with public incident evidence
GenLayer validators evaluate evidence using non-deterministic consensus
If claim qualifies, contract pays real GEN to the policyholder
If claim fails, no payout is made
When policy expires, reserved exposure is released
```

### For underwriters

1. Create a risk pool with a real GEN deposit, a covered service/component, a premium rate, and duration bounds
2. Fund the pool further at any time — anyone can deposit
3. Withdraw unreserved capital at any time — reserved exposure can never be withdrawn

### For policyholders

1. Buy cover: pick a pool, a coverage amount, and a duration — pay the deterministically-calculated premium in real GEN
2. If an outage happens, submit a claim with a public evidence URL and an incident summary
3. Trigger GenLayer validator consensus to resolve the claim
4. If approved, receive real GEN from the pool. If denied, no payout — the policy runs its course

## Claim resolution

`resolve_claim` fetches the claim's evidence URL via `gl.get_webpage`, builds a prompt from the
policy terms and the fetched content, and runs it through `gl.nondet.exec_prompt` wrapped in
`gl.eq_principle.prompt_comparative` so GenLayer validators must independently agree on the verdict
category, payout band, and confidence band before anything is written to state.

Allowed verdicts:

```
qualifying_outage       major_outage            minor_degradation
scheduled_maintenance   not_covered_component   outside_policy_window
insufficient_evidence   excluded_event          no_incident
```

| Verdict | Payout |
|---|---|
| `qualifying_outage`, `major_outage` | full coverage amount |
| `minor_degradation` | 50% of coverage amount |
| everything else | none |

Approved payouts move real GEN from the pool to the policyholder in the same transaction via the
external value-transfer pattern (`_Recipient(...).emit_transfer(value=...)`), and the pool's
`reserved_exposure` / `claims_paid` counters update atomically. See
[`CLAIM_RESOLUTION.md`](CLAIM_RESOLUTION.md) for the full flow.

## Funded accounting

Nothing is stored as a raw capital figure. `pool_capital` and `available_capital` are computed on
every read from real transaction counters:

```
pool_capital      = total_deposited + premiums_collected - total_withdrawn - claims_paid
available_capital = pool_capital - reserved_exposure
```

`buy_policy` rejects any purchase where `coverage_amount > available_capital`, and
`withdraw_available` rejects any withdrawal that would touch reserved exposure — so
`reserved_exposure <= pool_capital` holds at all times. See [`FUNDING_MODEL.md`](FUNDING_MODEL.md).

## Contract

| Field | Value |
|---|---|
| Network | GenLayer StudioNet |
| Chain ID | `61999` |
| RPC | `https://studio.genlayer.com/api` |
| Explorer | https://explorer-studio.genlayer.com |
| Contract | see [`.deployment.json`](.deployment.json) |
| Source | [`contract/threshold.py`](contract/threshold.py) |

## Tech stack

| Layer | Tech |
|---|---|
| Intelligent contract | GenLayer Python — `@allow_storage` dataclasses, `TreeMap` storage, `gl.public.write.payable`, `gl.nondet.exec_prompt`, `gl.eq_principle.prompt_comparative` |
| Frontend | Next.js 16 App Router (Turbopack) · TypeScript · Tailwind CSS 4 |
| Web3 | `genlayer-js` 1.1.8 · `ethers` (injected wallet provider) |
| Wallet | Any injected EIP-1193 provider — MetaMask, Rabby, etc. |
| Storage | None — all state on-chain |

## Repository layout

```
contract/threshold.py       GenLayer intelligent contract — all on-chain accounting and logic
scripts/                    Key generation, faucet funding, deployment, integration tests
src/lib/contract.ts         genlayer-js client wrapper (typed reads/writes)
src/lib/types.ts            Pool / Policy / Claim TypeScript types
src/lib/utils.ts            GEN <-> wei conversion, formatting, status chips
src/store/wallet.tsx        Injected wallet provider (connect, network switch, event listeners)
src/app/page.tsx            Landing page
src/app/app/                Risk Desk, Pools, Policies, Claims, Verdicts, Solvency pages
public/logo.svg             Logo (also used as favicon via src/app/icon.svg)
```

## Getting started

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

Open http://localhost:3000.

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

## Disclaimer

Threshold currently runs on GenLayer StudioNet. Funds are real contract-held StudioNet GEN, not
hardcoded dashboard numbers. This is not a licensed insurance product. See
[`KNOWN_LIMITATIONS.md`](KNOWN_LIMITATIONS.md) for the full list of honest constraints.
