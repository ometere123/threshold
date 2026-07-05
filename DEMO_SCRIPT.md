# Demo Script

A live walkthrough of Threshold, funded end-to-end on GenLayer StudioNet.

## 1. Landing page (`/`)

Open the landing page. Point out the framing: "no fake pool capital... every GEN figure is a live
read from the deployed contract." Click **Open Risk Desk**.

## 2. Risk Desk (`/app`)

Show the stat row: Active Cover, Open Claims, Pool Capital, Available Capital, Reserved Exposure,
Premiums Collected, Claims Paid, Avg Claim Confidence. Note that every one of these is a
`get_dashboard_stats` contract read - refresh the page and the numbers don't change unless a
transaction changed them.

## 3. Create a risk pool (`/app/pools/new`)

Connect wallet (MetaMask or Rabby). Fill in:

- Covered service: `Status Page Uptime`
- Covered component: `API Gateway`
- Initial deposit: `500` GEN
- Min premium: `500` bps (5%)
- Max policy payout: `100` GEN
- Duration bounds: `1`–`30` days

Submit. This sends a real payable transaction - 500 GEN leaves the connected wallet and lands in
the contract. Show the resulting pool detail page: `total_deposited` and `pool_capital` both read
exactly `500 GEN`.

## 4. Buy cover (`/app/policies/new`)

Pick the pool just created. Enter coverage amount `50` GEN, duration `7` days. The UI computes the
premium deterministically (`coverage * min_premium_bps / 10000` = `2.5 GEN`) and shows it before
submission. Submit - this sends `2.5 GEN` as the real premium. Show the pool detail page again:
`reserved_exposure` is now `50 GEN`, `available_capital` dropped by the same amount, and
`premiums_collected` increased by `2.5 GEN`.

## 5. Submit a claim (`/app/claims/new`)

Using the policy ID just created, submit a claim with a real public evidence URL (e.g.
`https://www.githubstatus.com/history`) and an incident summary describing an outage of the
covered component.

## 6. Resolve with GenLayer (`/app/claims/[claimId]`)

Click **Resolve with GenLayer**. This triggers `resolve_claim`, which fetches the evidence URL live
and runs it through `gl.nondet.exec_prompt` wrapped in `gl.eq_principle.prompt_comparative` - real
GenLayer validators independently evaluate the same evidence and reach consensus. This step takes
60-120 seconds. When it resolves, the page shows the full Validator Replay: verdict, payout band,
confidence, reason, and payout amount.

If the verdict qualifies, real GEN moves from the pool to the policyholder's wallet - show the
wallet balance increasing, and the pool detail page's `claims_paid` and `reserved_exposure`
updating.

## 7. Solvency view (`/app/accounting`)

Show the full accounting breakdown and the contract's actual on-chain GEN balance
(`get_contract_balance`), demonstrating that the dashboard numbers reconcile with the real balance
held by the contract.

## 8. Withdraw (`/app/pools/[poolId]`)

As the pool owner, withdraw a small amount of the now-available capital to demonstrate that
withdrawals are capped at `available_capital` and cannot touch reserved exposure.
