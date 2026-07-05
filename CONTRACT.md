# Contract Architecture

`contract/threshold.py` is a GenLayer Intelligent Contract (`class Threshold(gl.Contract)`),
written in Python against `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`.

## Storage model

Storage uses `@allow_storage @dataclass` records inside `TreeMap`s - the pattern that reliably
deploys on GenLayer (a plain `dict` is not storage-safe and fails to compile as a `TreeMap` value
type):

```python
@allow_storage
@dataclass
class Pool: ...

@allow_storage
@dataclass
class Policy: ...

@allow_storage
@dataclass
class Claim: ...

class Threshold(gl.Contract):
    pools: TreeMap[str, Pool]
    policies: TreeMap[str, Policy]
    claims: TreeMap[str, Claim]
    pool_counter: u256
    policy_counter: u256
    claim_counter: u256
```

All amounts are `u256` denominated in **wei** (1 GEN = 10^18 wei). All view methods return plain
`dict`/`list` - genlayer-js decodes these directly into JS objects, no manual JSON parsing needed
on the frontend for top-level values (nested JSON-string fields don't exist in this version; every
field is a first-class primitive).

## Pool fields

```
pool_id, owner, service_slug, covered_component, active
total_deposited, total_withdrawn, premiums_collected, claims_paid, reserved_exposure
min_premium_bps, max_policy_payout, min_duration_seconds, max_duration_seconds
created_at, created_seq
```

`pool_capital` and `available_capital` are not stored - they're computed on every read (see
[`FUNDING_MODEL.md`](FUNDING_MODEL.md)).

## Policy fields

```
policy_id, pool_id, holder
coverage_amount, premium_paid, start_ts, end_ts
service_slug, covered_component, status (active | claimed | paid | expired | cancelled)
created_at, created_seq
```

## Claim fields

```
claim_id, policy_id, pool_id, claimant
evidence_url, incident_summary
status (submitted | approved | denied | insufficient_evidence | payout_queued | paid)
verdict, confidence, payout_amount, payout_band, reason
submitted_at, submitted_seq, resolved_at, resolved_seq
```

## Public methods

| Method | Payable | Purpose |
|---|---|---|
| `create_pool` | yes | Fund a new pool with an initial GEN deposit |
| `deposit_to_pool` | yes | Add more GEN to an existing pool |
| `update_pool_status` | no | Owner-only pause/unpause |
| `withdraw_available` | no | Owner-only withdrawal of unreserved capital, sends GEN out |
| `buy_policy` | yes | Purchase cover, pays the deterministic premium |
| `expire_policy` | no | Release reserved exposure once the coverage window has passed |
| `submit_claim` | no | Policyholder files a claim with one public evidence URL |
| `resolve_claim` | no | Triggers GenLayer validator consensus, may pay out |
| `get_pool` / `get_all_pools` | view | Live pool accounting |
| `get_policy` / `get_all_policies` / `get_policies_by_holder` | view | Policy reads |
| `get_claim` / `get_all_claims` / `get_claims_by_policy` / `get_recent_verdicts` | view | Claim reads |
| `get_dashboard_stats` | view | Aggregate solvency figures across all pools |
| `get_contract_balance` | view | The contract's actual native GEN balance |

## No timestamps from `gl.message`

GenLayer contracts have no wall-clock primitive comparable to `block.timestamp`. `created_at` /
`submitted_at` fields on `Pool`/`Policy`/`Claim` are populated from `gl.message_raw["datetime"]`
(an ISO string derived from the transaction context) for display purposes, and `created_seq` /
`submitted_seq` / `resolved_seq` monotonic counters are the authoritative ordering fields. Policy
`start_ts` / `end_ts` are real Unix timestamps derived from that same transaction datetime, used
for `expire_policy`'s coverage-window check.

## Paying out GEN

Payouts and withdrawals use the external value-transfer pattern:

```python
@gl.evm.contract_interface
class _Recipient:
    class View: pass
    class Write: pass

_Recipient(Address(str(policy.holder))).emit_transfer(value=int(payout_amount))
```

This is only ever called at the end of `resolve_claim` / `withdraw_available`, after all storage
state (pool accounting, claim/policy status) has already been finalized - never speculatively, and
never using an `on="accepted"` hook.
