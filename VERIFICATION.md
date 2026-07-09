# Verification

## Current deployed contract

Current configured deployment:

| Field | Value |
|---|---|
| Network | GenLayer StudioNet |
| Chain ID | `61999` |
| Contract | `0x061d4D3db6d4Ea0aB891D244740AEf08858Fe52A` |
| Deployment tx | not recorded in this repo |
| Deployed at | not recorded in this repo |
| Explorer | https://explorer-studio.genlayer.com/address/0x061d4D3db6d4Ea0aB891D244740AEf08858Fe52A |

If `contract/threshold.py` changes again after this deployment, redeploy before using the live app
as final reviewer evidence.

## Reviewer checklist

1. Open the deployed app with `NEXT_PUBLIC_CONTRACT_ADDRESS` set to the current contract.
2. Create a pool with a real StudioNet GEN deposit.
3. Buy a policy with a real GEN premium.
4. Confirm `reserved_exposure` increases and `available_capital` decreases.
5. Submit a claim using a public status or incident-history URL.
6. Resolve the claim with GenLayer consensus.
7. Confirm the verdict, payout band, confidence, reason, and payout amount are stored on-chain.
8. If approved, confirm `claims_paid` increases and `reserved_exposure` is released.
9. Confirm withdrawals cannot exceed available capital.

## Automated checks

Run:

```bash
npx tsc --noEmit
npm run lint
node scripts/test-contract.mjs
```

`scripts/test-contract.mjs` is a funded StudioNet integration suite. It does not use mocks or a
local simulator, so the claim-resolution case can take longer when validator consensus is slow.
