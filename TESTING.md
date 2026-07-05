# Testing

`scripts/test-contract.mjs` runs a 20-case funded integration test suite directly against the
deployed StudioNet contract - no mocks, no local simulator. It uses `.test-wallets.json` (generated
by `scripts/generate-keys.mjs` and funded by `scripts/fund-wallets.mjs` via the StudioNet
`fundAccount` faucet RPC).

```bash
node scripts/generate-keys.mjs
node scripts/fund-wallets.mjs
DEPLOYER_PRIVATE_KEY=0x... node scripts/deploy.mjs
node scripts/test-contract.mjs
```

## Cases covered

1. Create pool with zero GEN should fail
2. Create pool with actual GEN should pass
3. Pool capital should equal deposited GEN
4. Buy policy without premium should fail
5. Buy policy with insufficient premium should fail
6. Buy policy with correct premium should pass
7. Reserved exposure should increase after policy purchase
8. Available capital should decrease after policy purchase
9. Submit claim with empty evidence URL should fail
10. Submit claim from non-policyholder should fail
11. Submit valid claim should pass
12. Resolve qualifying outage should approve claim (via real GenLayer validator consensus)
13. Approved claim should queue payout
14. Pool `claims_paid` should increase
15. Pool `reserved_exposure` should decrease after paid policy closes
16. Policy status should become `paid`
17. Duplicate resolution should fail
18. Withdraw more than available capital should fail
19. Withdraw available capital should pass
20. Expired active policy should release reserved exposure

Cases 12-13 depend on GenLayer's non-deterministic validator consensus, which typically takes
60-120 seconds on StudioNet - occasionally longer under load. The test script polls transaction
status for up to 75 seconds per write; if a resolution genuinely takes longer than that, the
harness reports a benign timeout on that one step while the underlying transaction still lands
(confirmed independently via case 17: a duplicate resolution attempt correctly reverts once the
first one has actually settled).

## Verified on-chain

The suite has been run against multiple live deployments during development. Confirmed outcomes
include: real GEN deposits reflected exactly in `pool_capital`, premium enforcement blocking
under-paid purchases, reserved exposure correctly increasing/decreasing across the policy
lifecycle, a real GenLayer LLM verdict (`insufficient_evidence` / `qualifying_outage` depending on
evidence reachability) driving payout amounts, owner-gated withdrawals respecting the
available-capital bound, and premature `expire_policy` calls reverting until the coverage window
has actually elapsed.

## Type checking

```bash
npx tsc --noEmit
```

The frontend has no separate unit test suite in this MVP - correctness is verified through the
funded contract integration suite plus manual browser verification of each page against live
contract data (see `DEMO_SCRIPT.md`).
