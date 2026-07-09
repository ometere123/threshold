# Claim Resolution

## Submission

`submit_claim(policy_id, claim_id, evidence_url, incident_summary)` requires:

- caller is the policy's `holder`
- policy status is `active`
- `evidence_url` is non-empty
- `incident_summary` is at least 10 characters

Unlike the earlier medical-cold-chain draft of this protocol, v1 only accepts a **single** public
evidence URL per claim (a status page, incident history, or uptime report) - not a set of mixed
public/private sources. This keeps the evaluation surface small and avoids ambiguity about which
source "wins" during consensus.

Submitting a claim moves the policy to `claimed` status; only one claim is supported per policy in
v1 (see [`KNOWN_LIMITATIONS.md`](KNOWN_LIMITATIONS.md)).

## Resolution - GenLayer non-deterministic consensus

`resolve_claim(claim_id)` is a public write method (not payable) that anyone can call once a claim
is `submitted`. It:

1. Rejects non-public or authentication-oriented URLs before fetching. v1 blocks non-HTTP(S)
   schemes, localhost, loopback hosts, common private IPv4 ranges (`10.*`, `172.16.*` -
   `172.31.*`, `192.168.*`), link-local addresses, and login/auth/session paths.
2. Fetches `claim.evidence_url` via `gl.get_webpage(url, mode="text")`.
3. Builds a prompt containing the policy terms (service, component, coverage window, coverage
   amount), the claimant's incident summary, and the fetched evidence content. The prompt states
   that the summary is only context, not evidence: if the fetched public evidence does not
   independently support the claim, validators should return a non-paying verdict.
4. Passes that prompt through `gl.nondet.exec_prompt(...)`, wrapped in
   `gl.eq_principle.prompt_comparative(...)` so that GenLayer validators can independently execute
   the LLM call and reach agreement on an equivalence class of results rather than requiring
   byte-identical output.

The equivalence principle used for the verdict:

> Two results are equivalent if they agree on the verdict category, the payout_band category, and
> confidence values within the same band (low 0-39, medium 40-69, high 70-100). The exact wording
> of `short_reason` does not need to match, only convey the same meaning.

## Canonical verdict JSON

The non-deterministic step returns only this minimal, canonical shape (no loose natural language is
treated as the final settlement object):

```json
{
  "verdict": "qualifying_outage",
  "payout_band": "full",
  "confidence": 95,
  "short_reason": "Public status evidence confirms a qualifying outage affecting the covered component."
}
```

## Allowed verdicts

```
qualifying_outage
major_outage
minor_degradation
scheduled_maintenance
not_covered_component
outside_policy_window
insufficient_evidence
excluded_event
no_incident
```

## Allowed payout bands

```
none
partial
full
manual_review
```

## Payout logic

| Verdict | Payout |
|---|---|
| `qualifying_outage`, `major_outage` | full coverage amount |
| `minor_degradation` | 50% of coverage amount |
| `scheduled_maintenance`, `not_covered_component`, `outside_policy_window`, `insufficient_evidence`, `excluded_event`, `no_incident` | none |

Payout amount is capped twice before any transfer happens: it can never exceed the policy's
`coverage_amount`, and it can never exceed the pool's current `reserved_exposure`. Both checks
`raise Exception(...)` (revert) rather than silently clamping, since either condition indicates a
contract invariant violation.

## Closing the loop

- **Approved (payout > 0):** `pool.claims_paid` increases, `pool.reserved_exposure` decreases by the
  policy's full coverage amount, `claim.status` becomes `payout_queued`, `policy.status` becomes
  `paid`, and GEN is sent to the policyholder via `_Recipient(...).emit_transfer(value=...)`.
- **Denied (payout = 0):** `claim.status` becomes `denied` (or `approved` with zero payout is not
  possible by construction - non-qualifying verdicts always map to `denied`), and `policy.status`
  reverts to `active` so the policyholder could theoretically appeal by waiting for expiry or the
  policy simply runs its course.

`payout_queued` rather than `paid` is used at the claim level because the external value transfer
is emitted, not awaited in-contract - GenLayer finalizes it as part of the same transaction, but the
naming reflects that this is an outbound transfer request, not a separately-confirmed receipt.

## Idempotency

`resolve_claim` requires `claim.status == "submitted"`; once resolved the status moves off that
value, so calling `resolve_claim` again on the same claim reverts with "claim is not pending
resolution." This was verified directly against the deployed contract (test case 17).
