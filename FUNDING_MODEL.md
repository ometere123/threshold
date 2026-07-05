# Funding Model

Threshold pools hold **real GEN**. Every number displayed under "Pool Capital," "Available
Capital," "Premiums Collected," or "Claims Paid" is derived from actual `payable` transactions that
moved native GEN into or out of the contract. There is no field anywhere that an admin can type a
capital number into.

## Accounting identities

A pool tracks four raw counters, each only ever incremented by a real value transfer:

- `total_deposited` - incremented by `create_pool`'s initial deposit and every `deposit_to_pool` call
- `premiums_collected` - incremented by the `gl.message.value` sent with every `buy_policy` call
- `total_withdrawn` - incremented by `withdraw_available`, which also sends GEN out to the owner
- `claims_paid` - incremented by `resolve_claim` when a claim is approved and GEN is sent to the policyholder

From these, two derived figures are computed on every read - never stored, so they can never drift
from the underlying deposits:

```python
pool_capital = total_deposited + premiums_collected - total_withdrawn - claims_paid
available_capital = pool_capital - reserved_exposure
```

`reserved_exposure` is incremented by `coverage_amount` on every `buy_policy` call and released
(decremented) either when a claim pays out (`resolve_claim`) or when the policy's coverage window
lapses (`expire_policy`).

## Solvency invariant

At all times, for every pool:

```
reserved_exposure <= pool_capital
```

This is enforced at the point of underwriting, not after the fact: `buy_policy` rejects any
purchase where `coverage_amount > available_capital`, so the contract can never reserve more
exposure than it actually holds. `withdraw_available` enforces the same bound in the other
direction - an owner can never withdraw funds that are backing a reserved policy.

## Premium calculation is deterministic

The premium a policyholder pays is **not** decided by an LLM or any non-deterministic process. It
is a fixed-point calculation performed on-chain and mirrored exactly in the frontend for display:

```python
premium_required = (coverage_amount * pool.min_premium_bps) // 10000
```

`min_premium_bps` is a pool-level rate set by the underwriter at pool creation (basis points, so
`500` = 5.00%). The contract rejects `buy_policy` calls where `gl.message.value` is less than this
required premium.

## What is and isn't funded in this MVP

- **Funded:** the pool's capital pool, held as actual contract balance on StudioNet.
- **Not implemented in v1:** multi-underwriter proportional share accounting. Every pool currently
  has a single `owner` address, and all deposited capital is commingled under that pool's counters.
  A future version could track per-depositor shares (similar to an ERC-4626 vault) so multiple
  underwriters can co-fund one pool and withdraw proportionally.
