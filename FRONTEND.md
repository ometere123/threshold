# Frontend

Next.js 16 (Turbopack) app. All capital numbers are contract reads — there is no mock-data mode in
this version of Threshold; without `NEXT_PUBLIC_CONTRACT_ADDRESS` set, reads return empty/null and
writes throw.

## Pages

| Route | Purpose |
|---|---|
| `/` | Landing page — funded outage cover positioning |
| `/app` | Risk Desk — live dashboard stats, active cover, open claims, recent verdicts |
| `/app/pools` | List of risk pools |
| `/app/pools/new` | Create Pool — payable, requires initial GEN deposit |
| `/app/pools/[poolId]` | Pool detail — full accounting breakdown, Fund Pool, Withdraw (owner only) |
| `/app/policies` | My Policies — toggle between "mine" (by connected wallet) and all |
| `/app/policies/new` | Buy Cover — payable, premium calculated client-side and verified on-chain |
| `/app/policies/[policyId]` | Policy detail — coverage terms, Submit Claim, Expire Policy |
| `/app/claims` | Claims list |
| `/app/claims/new` | Submit Claim — policy ID, evidence URL, incident summary |
| `/app/claims/[claimId]` | Claim detail / Validator Replay — evidence, verdict, confidence, payout band, reason, payout amount, Resolve button |
| `/app/verdicts` | Verdict Archive — filterable by verdict / payout band |
| `/app/accounting` | Solvency View — contract balance + full accounting breakdown |

## Wallet integration

`src/store/wallet.tsx` wraps `window.ethereum` (MetaMask, Rabby, or any injected EIP-1193
provider) via `ethers.BrowserProvider`. It exposes `connect`, `disconnect`, `switchNetwork` (adds
GenLayer StudioNet, chain ID `61999`, if the wallet doesn't already have it), and reactive
`accountsChanged` / `chainChanged` listeners.

## Contract client

`src/lib/contract.ts` wraps `genlayer-js` (`createClient`, `createAccount` for the read client;
the injected wallet's `provider` is threaded through for writes). Every write function accepts a
`value: bigint` in wei and passes it straight to `writeContract`:

```ts
await client.writeContract({
  address: contractAddress,
  functionName: "buy_policy",
  args: [poolId, policyId, coverageAmountWei, durationSeconds],
  value: premiumWei,
});
```

## GEN amount helpers

`src/lib/utils.ts` provides the wei ⇄ GEN conversion used everywhere in the UI:

```ts
export const WEI_PER_GEN = 10n ** 18n;
export function parseGEN(value: string): bigint { /* human string -> wei bigint */ }
export function formatGEN(amount: string | bigint | number): string { /* wei -> "X GEN" */ }
export function formatGENPlain(amount: string | bigint): string { /* wei -> "X" for inputs */ }
```

`parseGEN` does its own fixed-point string arithmetic (splitting on the decimal point and padding
to 18 digits) rather than `Number(value) * 1e18`, to avoid floating-point precision loss on larger
GEN amounts.

## Removed from the previous (unfunded) build

The earlier cold-chain demo included temperature/route-specific components
(`ThresholdMeter`, `RouteColdline`, `EvidenceMatrix`, `ConsensusVerdictCard`) and an
`/app/evidence/[claimId]` page. None of these concepts (target temperature ranges, checkpoints,
multi-source evidence matrices) exist in the funded outage-cover model, so these files were deleted
rather than adapted. The claim detail page now serves as the single "Validator Replay" view.
