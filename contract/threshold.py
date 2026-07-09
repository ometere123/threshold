# v0.2.18
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
import re
from dataclasses import dataclass
from genlayer import *

ALLOWED_VERDICTS = {
    "qualifying_outage",
    "major_outage",
    "minor_degradation",
    "scheduled_maintenance",
    "not_covered_component",
    "outside_policy_window",
    "insufficient_evidence",
    "excluded_event",
    "no_incident",
}

ALLOWED_PAYOUT_BANDS = {"none", "partial", "full", "manual_review"}

FULL_PAYOUT_VERDICTS = {"qualifying_outage", "major_outage"}
PARTIAL_PAYOUT_VERDICTS = {"minor_degradation"}
NO_PAYOUT_VERDICTS = {
    "scheduled_maintenance",
    "not_covered_component",
    "outside_policy_window",
    "insufficient_evidence",
    "excluded_event",
    "no_incident",
}


def _strip_html(html: str) -> str:
    # gl.nondet.web.render(mode="html") returns raw markup; there is no "text" mode,
    # so script/style blocks and tags are stripped here to keep the prompt readable
    # and within its character budget.
    html = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", html)
    html = re.sub(r"(?s)<[^>]+>", " ", html)
    html = re.sub(r"&nbsp;", " ", html)
    html = re.sub(r"\s+", " ", html)
    return html.strip()


@gl.evm.contract_interface
class _Recipient:
    class View:
        pass

    class Write:
        pass


@allow_storage
@dataclass
class Pool:
    pool_id: str
    owner: Address
    service_slug: str
    covered_component: str
    active: bool

    total_deposited: u256
    total_withdrawn: u256
    premiums_collected: u256
    claims_paid: u256
    reserved_exposure: u256

    min_premium_bps: u256
    max_policy_payout: u256
    min_duration_seconds: u256
    max_duration_seconds: u256

    created_at: str
    created_seq: u256


@allow_storage
@dataclass
class Policy:
    policy_id: str
    pool_id: str
    holder: Address

    coverage_amount: u256
    premium_paid: u256
    start_ts: u256
    end_ts: u256

    service_slug: str
    covered_component: str
    status: str  # active, claimed, paid, expired, cancelled

    created_at: str
    created_seq: u256


@allow_storage
@dataclass
class Claim:
    claim_id: str
    policy_id: str
    pool_id: str
    claimant: Address

    evidence_url: str
    incident_summary: str

    status: str  # submitted, approved, denied, insufficient_evidence, payout_queued, paid

    verdict: str
    confidence: u256
    payout_amount: u256
    payout_band: str
    reason: str

    submitted_at: str
    submitted_seq: u256
    resolved_at: str
    resolved_seq: u256


class Threshold(gl.Contract):
    pools: TreeMap[str, Pool]
    policies: TreeMap[str, Policy]
    claims: TreeMap[str, Claim]

    pool_counter: u256
    policy_counter: u256
    claim_counter: u256

    def __init__(self) -> None:
        self.pool_counter = u256(0)
        self.policy_counter = u256(0)
        self.claim_counter = u256(0)

    # ------------------------------------------------------------------
    # Internal accounting helpers
    # ------------------------------------------------------------------

    def _pool_capital(self, pool: Pool) -> u256:
        return u256(
            int(pool.total_deposited)
            + int(pool.premiums_collected)
            - int(pool.total_withdrawn)
            - int(pool.claims_paid)
        )

    def _pool_available_capital(self, pool: Pool) -> u256:
        return u256(int(self._pool_capital(pool)) - int(pool.reserved_exposure))

    def _now_iso(self) -> str:
        return gl.message_raw["datetime"]

    def _now_ts(self) -> int:
        from datetime import datetime

        raw = gl.message_raw["datetime"]
        return int(datetime.fromisoformat(raw.replace("Z", "+00:00")).timestamp())

    def _ts_to_iso(self, ts: int) -> str:
        from datetime import datetime, timezone

        return datetime.fromtimestamp(int(ts), tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    def _is_rejected_evidence_url(self, url: str) -> bool:
        lowered = url.strip().lower()
        if not (lowered.startswith("https://") or lowered.startswith("http://")):
            return True

        host = lowered.split("://", 1)[1].split("/", 1)[0].split("@")[-1].split(":", 1)[0]
        host = host.strip("[]")

        exact_blocklist = {
            "",
            "localhost",
            "0.0.0.0",
            "127.0.0.1",
            "::1",
        }
        private_prefixes = (
            "127.",
            "10.",
            "192.168.",
            "169.254.",
            "172.16.",
            "172.17.",
            "172.18.",
            "172.19.",
            "172.20.",
            "172.21.",
            "172.22.",
            "172.23.",
            "172.24.",
            "172.25.",
            "172.26.",
            "172.27.",
            "172.28.",
            "172.29.",
            "172.30.",
            "172.31.",
        )
        auth_markers = ("/login", "/signin", "/sign-in", "/auth", "/oauth", "/session")

        return (
            host in exact_blocklist
            or host.endswith(".localhost")
            or host.startswith(private_prefixes)
            or any(marker in lowered for marker in auth_markers)
        )

    # ------------------------------------------------------------------
    # Pools
    # ------------------------------------------------------------------

    @gl.public.write.payable
    def create_pool(
        self,
        pool_id: str,
        service_slug: str,
        covered_component: str,
        min_premium_bps: u256,
        max_policy_payout: u256,
        min_duration_seconds: u256,
        max_duration_seconds: u256,
    ) -> None:
        if pool_id in self.pools:
            raise Exception("pool_id already exists")

        deposit = gl.message.value

        if deposit == u256(0):
            raise Exception("initial pool deposit required")
        if max_policy_payout == u256(0):
            raise Exception("max payout required")
        if int(deposit) < int(max_policy_payout):
            raise Exception("initial deposit must cover at least one max payout")
        if len(service_slug.strip()) == 0:
            raise Exception("service_slug required")
        if len(covered_component.strip()) == 0:
            raise Exception("covered_component required")
        if int(min_premium_bps) == 0:
            raise Exception("min_premium_bps required")
        if int(min_duration_seconds) == 0 or int(max_duration_seconds) < int(min_duration_seconds):
            raise Exception("invalid duration bounds")

        self.pool_counter += 1

        self.pools[pool_id] = Pool(
            pool_id=pool_id,
            owner=gl.message.sender_address,
            service_slug=service_slug,
            covered_component=covered_component,
            active=True,
            total_deposited=deposit,
            total_withdrawn=u256(0),
            premiums_collected=u256(0),
            claims_paid=u256(0),
            reserved_exposure=u256(0),
            min_premium_bps=min_premium_bps,
            max_policy_payout=max_policy_payout,
            min_duration_seconds=min_duration_seconds,
            max_duration_seconds=max_duration_seconds,
            created_at=self._now_iso(),
            created_seq=u256(int(self.pool_counter)),
        )

    @gl.public.write.payable
    def deposit_to_pool(self, pool_id: str) -> None:
        amount = gl.message.value

        if amount == u256(0):
            raise Exception("deposit must be greater than zero")

        pool = self.pools[pool_id]
        if not pool.active:
            raise Exception("pool is not active")

        pool.total_deposited = u256(int(pool.total_deposited) + int(amount))

    @gl.public.write
    def update_pool_status(self, pool_id: str, active: bool) -> None:
        pool = self.pools[pool_id]
        if gl.message.sender_address != pool.owner:
            raise Exception("only pool owner may update status")
        pool.active = active

    @gl.public.write
    def withdraw_available(self, pool_id: str, amount: u256, recipient: str) -> None:
        pool = self.pools[pool_id]

        if gl.message.sender_address != pool.owner:
            raise Exception("only pool owner can withdraw")

        available = self._pool_available_capital(pool)
        if int(amount) > int(available):
            raise Exception("cannot withdraw reserved capital")
        if int(amount) == 0:
            raise Exception("withdraw amount must be greater than zero")

        pool.total_withdrawn = u256(int(pool.total_withdrawn) + int(amount))

        _Recipient(Address(recipient)).emit_transfer(value=int(amount))

    def _pool_to_dict(self, pool: Pool) -> dict:
        capital = self._pool_capital(pool)
        available = self._pool_available_capital(pool)
        return {
            "pool_id": pool.pool_id,
            "owner": pool.owner.as_hex,
            "service_slug": pool.service_slug,
            "covered_component": pool.covered_component,
            "active": pool.active,
            "total_deposited": str(int(pool.total_deposited)),
            "total_withdrawn": str(int(pool.total_withdrawn)),
            "premiums_collected": str(int(pool.premiums_collected)),
            "claims_paid": str(int(pool.claims_paid)),
            "reserved_exposure": str(int(pool.reserved_exposure)),
            "pool_capital": str(int(capital)),
            "available_capital": str(int(available)),
            "min_premium_bps": str(int(pool.min_premium_bps)),
            "max_policy_payout": str(int(pool.max_policy_payout)),
            "min_duration_seconds": str(int(pool.min_duration_seconds)),
            "max_duration_seconds": str(int(pool.max_duration_seconds)),
            "created_at": pool.created_at,
            "created_seq": int(pool.created_seq),
        }

    @gl.public.view
    def get_pool(self, pool_id: str) -> dict:
        return self._pool_to_dict(self.pools[pool_id])

    @gl.public.view
    def get_all_pools(self) -> list:
        return [self._pool_to_dict(p) for p in self.pools.values()]

    # ------------------------------------------------------------------
    # Policies
    # ------------------------------------------------------------------

    @gl.public.write.payable
    def buy_policy(
        self,
        pool_id: str,
        policy_id: str,
        coverage_amount: u256,
        duration_seconds: u256,
    ) -> None:
        if policy_id in self.policies:
            raise Exception("policy_id already exists")

        premium_sent = gl.message.value
        pool = self.pools[pool_id]

        if not pool.active:
            raise Exception("pool is not active")
        if int(coverage_amount) == 0:
            raise Exception("coverage amount required")
        if int(coverage_amount) > int(pool.max_policy_payout):
            raise Exception("coverage exceeds pool max payout")
        if int(duration_seconds) < int(pool.min_duration_seconds):
            raise Exception("duration too short")
        if int(duration_seconds) > int(pool.max_duration_seconds):
            raise Exception("duration too long")

        premium_required = (int(coverage_amount) * int(pool.min_premium_bps)) // 10000
        if int(premium_sent) < premium_required:
            raise Exception("insufficient premium")

        available_capital = self._pool_available_capital(pool)
        if int(coverage_amount) > int(available_capital):
            raise Exception("insufficient available pool capital")

        pool.premiums_collected = u256(int(pool.premiums_collected) + int(premium_sent))
        pool.reserved_exposure = u256(int(pool.reserved_exposure) + int(coverage_amount))

        self.policy_counter += 1
        now_ts = self._now_ts()

        self.policies[policy_id] = Policy(
            policy_id=policy_id,
            pool_id=pool_id,
            holder=gl.message.sender_address,
            coverage_amount=coverage_amount,
            premium_paid=premium_sent,
            start_ts=u256(now_ts),
            end_ts=u256(now_ts + int(duration_seconds)),
            service_slug=pool.service_slug,
            covered_component=pool.covered_component,
            status="active",
            created_at=self._now_iso(),
            created_seq=u256(int(self.policy_counter)),
        )

    @gl.public.write
    def expire_policy(self, policy_id: str) -> None:
        policy = self.policies[policy_id]

        if policy.status != "active":
            raise Exception("policy is not active")

        now_ts = self._now_ts()
        if now_ts < int(policy.end_ts):
            raise Exception("policy has not yet reached its end time")

        pool = self.pools[policy.pool_id]
        pool.reserved_exposure = u256(int(pool.reserved_exposure) - int(policy.coverage_amount))
        policy.status = "expired"

    def _policy_to_dict(self, policy: Policy) -> dict:
        return {
            "policy_id": policy.policy_id,
            "pool_id": policy.pool_id,
            "holder": policy.holder.as_hex,
            "coverage_amount": str(int(policy.coverage_amount)),
            "premium_paid": str(int(policy.premium_paid)),
            "start_ts": int(policy.start_ts),
            "end_ts": int(policy.end_ts),
            "service_slug": policy.service_slug,
            "covered_component": policy.covered_component,
            "status": policy.status,
            "created_at": policy.created_at,
            "created_seq": int(policy.created_seq),
        }

    @gl.public.view
    def get_policy(self, policy_id: str) -> dict:
        return self._policy_to_dict(self.policies[policy_id])

    @gl.public.view
    def get_all_policies(self) -> list:
        return [self._policy_to_dict(p) for p in self.policies.values()]

    @gl.public.view
    def get_policies_by_holder(self, holder: str) -> list:
        return [
            self._policy_to_dict(p)
            for p in self.policies.values()
            if p.holder.as_hex.lower() == holder.lower()
        ]

    # ------------------------------------------------------------------
    # Claims
    # ------------------------------------------------------------------

    @gl.public.write
    def submit_claim(
        self,
        policy_id: str,
        claim_id: str,
        evidence_url: str,
        incident_summary: str,
    ) -> None:
        if claim_id in self.claims:
            raise Exception("claim_id already exists")

        policy = self.policies[policy_id]

        if gl.message.sender_address != policy.holder:
            raise Exception("only policyholder can submit claim")
        if policy.status != "active":
            raise Exception("policy is not active")
        if evidence_url.strip() == "":
            raise Exception("evidence URL required")
        if len(incident_summary.strip()) < 10:
            raise Exception("incident_summary must be descriptive")

        self.claim_counter += 1

        self.claims[claim_id] = Claim(
            claim_id=claim_id,
            policy_id=policy_id,
            pool_id=policy.pool_id,
            claimant=gl.message.sender_address,
            evidence_url=evidence_url,
            incident_summary=incident_summary,
            status="submitted",
            verdict="",
            confidence=u256(0),
            payout_amount=u256(0),
            payout_band="",
            reason="",
            submitted_at=self._now_iso(),
            submitted_seq=u256(int(self.claim_counter)),
            resolved_at="",
            resolved_seq=u256(0),
        )
        policy.status = "claimed"

    # ------------------------------------------------------------------
    # Resolution (non-deterministic)
    # ------------------------------------------------------------------

    @gl.public.write
    def resolve_claim(self, claim_id: str) -> dict:
        claim = self.claims[claim_id]
        if claim.status != "submitted":
            raise Exception("claim is not pending resolution")

        policy = self.policies[claim.policy_id]
        pool = self.pools[claim.pool_id]

        evidence_url = claim.evidence_url
        evidence_rejected = self._is_rejected_evidence_url(evidence_url)

        def get_verdict() -> str:
            # The web fetch must happen inside this nondet block (leader and each
            # validator independently render the page); it cannot run outside it.
            if evidence_rejected:
                evidence = {"status": "rejected_non_public_url", "content": ""}
            else:
                try:
                    raw_html = gl.nondet.web.render(evidence_url, mode="html")
                    evidence = {"status": "fetched", "content": _strip_html(raw_html or "")[:2000]}
                except Exception as e:
                    evidence = {"status": "inaccessible", "content": str(e)[:200]}

            prompt = f"""
You are a GenLayer validator resolving a funded parametric outage cover claim for Threshold.

POLICY:
- Policy ID: {policy.policy_id}
- Covered service: {policy.service_slug}
- Covered component: {policy.covered_component}
- Coverage window: {self._ts_to_iso(policy.start_ts)} to {self._ts_to_iso(policy.end_ts)} (raw unix timestamps: {policy.start_ts} to {policy.end_ts})
- Coverage amount: {int(policy.coverage_amount)} wei

CLAIM:
- Claim ID: {claim.claim_id}
- Incident summary from claimant: {claim.incident_summary}

EVIDENCE (public URL: {evidence_url}):
Status: {evidence.get('status')}
Content:
{evidence.get('content', '')[:1600]}

INSTRUCTIONS:
Decide whether the evidence supports a qualifying outage of the covered component
within the coverage window. Do not invent facts not present in the evidence.
Treat the claimant's incident summary only as context for what to look for. It is
not evidence. If the fetched public evidence does not independently support the
claim, return insufficient_evidence, no_incident, outside_policy_window, or another
non-paying verdict as appropriate.
If evidence status is not "fetched", return insufficient_evidence.
Compare dates using the human-readable coverage window dates given above (YYYY-MM-DD),
not the raw unix timestamps. Only return outside_policy_window if the incident's date in
the evidence clearly falls before the coverage window's start date or after its end date.

ALLOWED VERDICTS: qualifying_outage | major_outage | minor_degradation | scheduled_maintenance | not_covered_component | outside_policy_window | insufficient_evidence | excluded_event | no_incident
ALLOWED PAYOUT BANDS: none | partial | full | manual_review

Return only canonical JSON matching this schema, nothing else:
{{
  "verdict": "string from ALLOWED VERDICTS",
  "payout_band": "string from ALLOWED PAYOUT BANDS",
  "confidence": 0-100,
  "short_reason": "max 240 chars"
}}
Do not include markdown or private reasoning.
"""
            result = gl.nondet.exec_prompt(prompt).replace("```json", "").replace("```", "").strip()
            return json.dumps(json.loads(result), sort_keys=True)

        verdict_json = gl.eq_principle.prompt_comparative(
            get_verdict,
            principle=(
                "Two results are equivalent if they agree on the verdict "
                "category, the payout_band category, and confidence values "
                "within the same band (low 0-39, medium 40-69, high "
                "70-100). The exact wording of short_reason does not need "
                "to match, only convey the same meaning."
            ),
        )
        verdict_data = json.loads(verdict_json)

        verdict = verdict_data.get("verdict")
        if verdict not in ALLOWED_VERDICTS:
            verdict = "insufficient_evidence"
        band = verdict_data.get("payout_band")
        if band not in ALLOWED_PAYOUT_BANDS:
            band = "none"
        confidence = int(verdict_data.get("confidence", 0))
        confidence = max(0, min(100, confidence))
        reason = str(verdict_data.get("short_reason", ""))[:240]

        payout_amount = u256(0)

        if verdict in FULL_PAYOUT_VERDICTS:
            payout_amount = policy.coverage_amount
        elif verdict in PARTIAL_PAYOUT_VERDICTS:
            payout_amount = u256(int(policy.coverage_amount) // 2)

        if int(payout_amount) > int(policy.coverage_amount):
            raise Exception("payout exceeds coverage")
        if int(payout_amount) > int(pool.reserved_exposure):
            raise Exception("payout exceeds reserved exposure")

        claim.verdict = verdict
        claim.payout_band = band
        claim.confidence = u256(confidence)
        claim.reason = reason
        claim.resolved_at = self._now_iso()
        self.claim_counter += 1
        claim.resolved_seq = u256(int(self.claim_counter))

        if int(payout_amount) > 0:
            pool.claims_paid = u256(int(pool.claims_paid) + int(payout_amount))
            pool.reserved_exposure = u256(int(pool.reserved_exposure) - int(policy.coverage_amount))
            claim.payout_amount = payout_amount
            claim.status = "payout_queued"
            policy.status = "paid"

            _Recipient(Address(str(policy.holder))).emit_transfer(value=int(payout_amount))
        else:
            claim.status = "approved" if verdict in FULL_PAYOUT_VERDICTS | PARTIAL_PAYOUT_VERDICTS else "denied"
            policy.status = "active"

        return self._claim_to_dict(claim)

    def _claim_to_dict(self, claim: Claim) -> dict:
        return {
            "claim_id": claim.claim_id,
            "policy_id": claim.policy_id,
            "pool_id": claim.pool_id,
            "claimant": claim.claimant.as_hex,
            "evidence_url": claim.evidence_url,
            "incident_summary": claim.incident_summary,
            "status": claim.status,
            "verdict": claim.verdict,
            "confidence": int(claim.confidence),
            "payout_amount": str(int(claim.payout_amount)),
            "payout_band": claim.payout_band,
            "reason": claim.reason,
            "submitted_at": claim.submitted_at,
            "submitted_seq": int(claim.submitted_seq),
            "resolved_at": claim.resolved_at,
            "resolved_seq": int(claim.resolved_seq),
        }

    @gl.public.view
    def get_claim(self, claim_id: str) -> dict:
        return self._claim_to_dict(self.claims[claim_id])

    @gl.public.view
    def get_all_claims(self) -> list:
        return [self._claim_to_dict(c) for c in self.claims.values()]

    @gl.public.view
    def get_claims_by_policy(self, policy_id: str) -> list:
        return [self._claim_to_dict(c) for c in self.claims.values() if c.policy_id == policy_id]

    @gl.public.view
    def get_recent_verdicts(self, limit: int) -> list:
        result = [
            self._claim_to_dict(c)
            for c in self.claims.values()
            if c.status in ("approved", "denied", "payout_queued", "paid")
        ]
        n = limit if limit > 0 else 20
        return result[-n:]

    # ------------------------------------------------------------------
    # Solvency / dashboard
    # ------------------------------------------------------------------

    @gl.public.view
    def get_dashboard_stats(self) -> dict:
        active_policies = 0
        open_claims = 0
        total_deposited = 0
        total_withdrawn = 0
        premiums_collected = 0
        claims_paid = 0
        reserved_exposure = 0
        confidences = []

        for policy in self.policies.values():
            if policy.status == "active":
                active_policies += 1

        for claim in self.claims.values():
            if claim.status == "submitted":
                open_claims += 1
            if claim.resolved_at:
                confidences.append(int(claim.confidence))

        for pool in self.pools.values():
            total_deposited += int(pool.total_deposited)
            total_withdrawn += int(pool.total_withdrawn)
            premiums_collected += int(pool.premiums_collected)
            claims_paid += int(pool.claims_paid)
            reserved_exposure += int(pool.reserved_exposure)

        pool_capital = total_deposited + premiums_collected - total_withdrawn - claims_paid
        available_capital = pool_capital - reserved_exposure
        avg_conf = sum(confidences) // len(confidences) if confidences else 0

        return {
            "active_policies": active_policies,
            "open_claims": open_claims,
            "total_deposited": str(total_deposited),
            "total_withdrawn": str(total_withdrawn),
            "premiums_collected": str(premiums_collected),
            "claims_paid": str(claims_paid),
            "reserved_exposure": str(reserved_exposure),
            "pool_capital": str(pool_capital),
            "available_capital": str(available_capital),
            "average_claim_confidence": avg_conf,
        }

    @gl.public.view
    def get_contract_balance(self) -> str:
        try:
            return str(int(gl.contract_balance()))
        except Exception:
            return "0"
