"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWallet } from "@/store/wallet";
import { getPolicy, submitClaim, EXPLORER_URL } from "@/lib/contract";
import type { Policy } from "@/lib/types";
import { formatUnixTimestamp, formatGEN, formatServiceSlug } from "@/lib/utils";

function ClaimForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address, isConnected, provider, connect } = useWallet();

  const prefillPolicyId = searchParams.get("policyId") || "";

  const [policy, setPolicy] = useState<Policy | null>(null);
  const [policyError, setPolicyError] = useState("");
  const [txHash, setTxHash] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    policy_id: prefillPolicyId,
    evidence_url: "",
    incident_summary: "",
  });

  useEffect(() => {
    if (form.policy_id) {
      getPolicy(form.policy_id)
        .then((p) => {
          setPolicy(p);
          setPolicyError(p ? "" : "Policy not found");
        })
        .catch(() => setPolicyError("Policy not found"));
    }
  }, [form.policy_id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.policy_id) { setError("Policy ID required"); return; }
    if (!form.evidence_url.trim() || !form.evidence_url.startsWith("http")) {
      setError("A public evidence URL (starting with http/https) is required");
      return;
    }
    if (form.incident_summary.trim().length < 10) { setError("Incident summary too short"); return; }

    setSubmitting(true);
    setError("");

    try {
      const claimId = `claim_${Date.now()}`;
      const tx = await submitClaim(provider, address, {
        policy_id: form.policy_id,
        claim_id: claimId,
        evidence_url: form.evidence_url.trim(),
        incident_summary: form.incident_summary,
      });
      setTxHash(tx.hash);
      setTimeout(() => router.push("/app/claims"), 3000);
    } catch (err: any) {
      setError(err?.message || "Transaction failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-white">Submit Claim</h1>
        <p className="text-slate-400 text-sm mt-1">Report a qualifying outage with a public evidence URL. GenLayer validators will evaluate it.</p>
      </div>

      {txHash && (
        <div className="panel-ice p-4 mb-6">
          <div className="section-header mb-1">Claim Submitted</div>
          <a href={`${EXPLORER_URL}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-cyan-400 hover:underline">
            View tx: {txHash.slice(0, 20)}… ↗
          </a>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="panel p-4 space-y-3">
          <div className="section-header">Policy</div>
          <div>
            <label className="field-label">Policy ID *</label>
            <input
              className="input-field font-mono"
              value={form.policy_id}
              onChange={(e) => setForm({ ...form, policy_id: e.target.value })}
              placeholder="policy_1234567890"
              required
            />
            {policyError && <p className="text-xs text-red-400 mt-1">{policyError}</p>}
          </div>

          {policy && (
            <div className="panel-ice p-3 text-xs font-mono space-y-1">
              <div className="text-slate-400">{formatServiceSlug(policy.service_slug)} - {policy.covered_component}</div>
              <div style={{ color: "#38BDF8" }}>Coverage: {formatGEN(policy.coverage_amount)}</div>
              <div className="text-slate-500">Window: {formatUnixTimestamp(policy.start_ts)} → {formatUnixTimestamp(policy.end_ts)}</div>
            </div>
          )}
        </div>

        <div className="panel p-4 space-y-3">
          <div className="section-header">Public Evidence</div>
          <div>
            <label className="field-label">Evidence URL *</label>
            <input
              className="input-field font-mono text-xs"
              value={form.evidence_url}
              onChange={(e) => setForm({ ...form, evidence_url: e.target.value })}
              placeholder="https://www.githubstatus.com/history"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              A single public URL (status page, incident history, uptime report) validators can fetch and evaluate.
            </p>
          </div>
        </div>

        <div className="panel p-4">
          <div className="section-header mb-3">Incident Summary</div>
          <textarea
            className="input-field"
            rows={5}
            value={form.incident_summary}
            onChange={(e) => setForm({ ...form, incident_summary: e.target.value })}
            placeholder="Describe the outage: when it occurred, which component was affected, and how it maps to the evidence URL."
            maxLength={2000}
            required
          />
          <p className="text-xs text-slate-600 mt-1">{form.incident_summary.length}/2000 characters</p>
        </div>

        {error && (
          <div className="panel p-3" style={{ borderColor: "rgba(220,38,38,0.3)" }}>
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          {!isConnected ? (
            <button type="button" className="btn-primary flex-1" onClick={connect}>Connect Wallet</button>
          ) : (
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>
              {submitting ? "Submitting Claim…" : "Submit Claim to StudioNet"}
            </button>
          )}
          <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

export default function NewClaimPage() {
  return (
    <Suspense>
      <ClaimForm />
    </Suspense>
  );
}
