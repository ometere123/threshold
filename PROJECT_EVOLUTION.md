# Project Evolution

Threshold is one continued project, not a bundle of small demos.

## Current direction

The current build is a funded parametric outage cover protocol:

- underwriters create pools with real payable GEN deposits
- policyholders buy coverage with real GEN premiums
- the contract reserves exposure against available capital
- claims are resolved from public outage evidence fetched by validators
- approved claims emit a real GEN transfer to the policyholder

The GenLayer-specific part is not "better AI answers." Consensus sits at the settlement boundary:
validators fetch public, messy, off-chain evidence and agree on whether money should move under
deterministic payout rules.

## What changed from earlier iterations

Earlier drafts explored a medical cold-chain framing with route checkpoints, temperature ranges,
and multi-source evidence UI. That model was removed rather than lightly renamed. The current
protocol focuses on hosted-service outage cover because public status pages and incident histories
are naturally available to validators through contract-side web fetching.

Removed cold-chain concepts include:

- route and checkpoint components
- temperature threshold widgets
- mixed private/public evidence matrices
- cold-chain-specific claim pages

Those removals are documented in `FRONTEND.md`; the surviving product surface is pools, policies,
claims, verdicts, and solvency.

## Depth still planned

The next meaningful iterations are depth-oriented:

- multiple public evidence URLs per claim, with explicit conflict rules
- multi-underwriter share accounting instead of single-owner pools
- stronger reviewer verification artifacts from live test runs
- frontend tests for GEN parsing, premium calculation, and status displays
- more transparent validator replay once GenLayer exposes richer consensus receipts
