# Known Limitations

Threshold currently runs on GenLayer StudioNet.

Funds are real contract-held StudioNet GEN, not hardcoded dashboard numbers.

This is not a licensed insurance product.

The current MVP uses owner-funded pools; multi-underwriter share accounting can be added later —
today every pool has a single `owner` address and all deposits are commingled under that pool's
counters, with no per-depositor share tracking or proportional withdrawal rights.

Payouts depend on public evidence URLs being accessible to validators. If a status page or
incident-history URL is down, rate-limited, or requires authentication at resolution time, the
claim will most likely resolve as `insufficient_evidence` with no payout — there is no retry
mechanism or evidence re-submission flow in v1 beyond filing a new claim (which isn't supported
for a policy that already has one).

Approved payouts are emitted as finalized external value transfers
(`_Recipient(...).emit_transfer(value=...)`) within the same `resolve_claim` transaction — the
claim status is set to `payout_queued` rather than `paid` to reflect that this is an outbound
transfer request finalized by GenLayer consensus, not a separately-awaited receipt.

## Other constraints of this build

- **One claim per policy.** Once a claim is submitted, a policy cannot accept a second claim even
  if the first is denied. This avoids unbounded multi-claim risk accounting in v1.
- **No premium market.** `min_premium_bps` is a fixed rate set once at pool creation by the
  underwriter; there is no dynamic pricing based on utilization or claims history.
- **No partial withdrawals during an open claim window per-policy** — withdrawals are governed
  purely by the pool-level `available_capital` bound, not by any finer-grained lock tied to
  individual open claims (a claim's coverage is already reflected in `reserved_exposure`, so this
  is covered, but there's no separate claim-level hold beyond that).
- **Policy expiry is manual.** `expire_policy` must be called by someone (anyone can call it) once
  the coverage window has passed; exposure is not automatically released on a timer.
- **Test suite timing.** The 20-case integration suite in `TESTING.md` includes a full expiry test
  only up to the "premature expiry correctly reverts" check — waiting out a full real-time coverage
  window (even the shortest, 1 hour) inside an automated test run was intentionally skipped for
  practicality; the `expire_policy` logic itself is exercised and reverts correctly against the
  `now_ts < end_ts` guard.
- **No frontend unit tests.** Correctness is verified via the funded contract integration suite and
  manual browser verification against live contract state, not a separate frontend test harness.
- **`get_contract_balance` may return `0` on StudioNet.** It calls `gl.contract_balance()` wrapped
  in a `try/except`; if that API isn't exposed to the contract runtime on the current GenLayer
  version, it silently returns `"0"` rather than reverting. The authoritative accounting figure in
  that case is `pool_capital` (`total_deposited + premiums_collected - total_withdrawn -
  claims_paid`), which is derived purely from real transaction amounts and does not depend on this
  API. The Solvency View page surfaces this caveat directly next to the balance figure.
