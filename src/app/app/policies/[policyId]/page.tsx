"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getPolicy, getClaimsByPolicy, expirePolicy, EXPLORER_URL } from "@/lib/contract";
import type { Policy, Claim } from "@/lib/types";
import { formatUnixTimestamp, formatGEN, getPolicyStatusChip, getClaimStatusChip, formatServiceSlug } from "@/lib/utils";
import { useWallet } from "@/store/wallet";

export default function PolicyDetailPage() {
  const { policyId } = useParams<{ policyId: string }>();
  const { isConnected, provider, connect } = useWallet();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [expiring, setExpiring] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const [p, c] = await Promise.all([getPolicy(policyId), getClaimsByPolicy(policyId)]);
    setPolicy(p);
    setClaims(c);
    setLoading(false);
  }

  useEffect(() => { load(); }, [policyId]);

  async function handleExpire() {
    setExpiring(true);
    setError("");
    try {
      const tx = await expirePolicy(provider, policyId);
      setTxHash(tx.hash);
      setTimeout(load, 3000);
    } catch (err: any) {
      setError(err?.message || "Expiry failed");
    } finally {
      setExpiring(false);
    }
  }

  if (loading) return <div className="p-8 space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16" />)}</div>;
  if (!policy) return <div className="p-8 text-slate-400">Policy not found.</div>;

  const canClaim = policy.status === "active" && claims.length === 0;
  const isPastEnd = policy.end_ts * 1000 <= Date.now();
  const canExpire = policy.status === "active" && isPastEnd;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2 text-xs">
          <Link href="/app/policies" className="text-slate-500 hover:text-cyan-400">Policies</Link>
          <span className="text-slate-600">/</span>
          <span className="font-mono text-cyan-400">{policy.policy_id}</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">{formatServiceSlug(policy.service_slug)}</h1>
            <p className="text-slate-400 text-sm mt-1">component: {policy.covered_component}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={getPolicyStatusChip(policy.status)}>{policy.status}</span>
            {canClaim && (
              <Link href={`/app/claims/new?policyId=${policy.policy_id}`} className="btn-primary text-sm">
                Submit Claim
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="panel p-4">
          <div className="section-header mb-3">Coverage Window</div>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Start</span>
              <span className="text-white">{formatUnixTimestamp(policy.start_ts)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">End</span>
              <span className="text-white">{formatUnixTimestamp(policy.end_ts)}</span>
            </div>
          </div>
        </div>

        <div className="panel p-4">
          <div className="section-header mb-3">Real GEN Terms</div>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Coverage Amount</span>
              <span style={{ color: "#38BDF8" }}>{formatGEN(policy.coverage_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Premium Paid</span>
              <span className="text-white">{formatGEN(policy.premium_paid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Pool</span>
              <Link href={`/app/pools/${policy.pool_id}`} className="text-cyan-400 hover:underline">{policy.pool_id}</Link>
            </div>
          </div>
        </div>
      </div>

      {txHash && (
        <div className="panel-ice p-3">
          <a href={`${EXPLORER_URL}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-cyan-400 hover:underline">
            View tx ↗ {txHash.slice(0, 20)}…
          </a>
        </div>
      )}
      {error && <div className="panel p-3" style={{ borderColor: "rgba(220,38,38,0.3)" }}><p className="text-sm text-red-400">{error}</p></div>}

      {canExpire && (
        <div className="panel p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-white">Coverage window has ended.</p>
            <p className="text-xs text-slate-500 mt-0.5">Release reserved exposure back to the pool.</p>
          </div>
          {!isConnected ? (
            <button className="btn-secondary" onClick={connect}>Connect Wallet</button>
          ) : (
            <button className="btn-secondary" onClick={handleExpire} disabled={expiring}>
              {expiring ? "Expiring…" : "Expire Policy"}
            </button>
          )}
        </div>
      )}

      <div>
        <div className="section-header mb-3">Claims History</div>
        {claims.length === 0 ? (
          <div className="panel p-6 text-center text-slate-500 text-sm">
            No claims submitted.
            {canClaim && (
              <div className="mt-3">
                <Link href={`/app/claims/new?policyId=${policy.policy_id}`} className="btn-primary text-sm inline-block">Submit Claim</Link>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {claims.map((c) => (
              <Link key={c.claim_id} href={`/app/claims/${c.claim_id}`}>
                <div className="panel p-3 hover:border-cyan-400/30 cursor-pointer transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs text-cyan-400 mr-2">{c.claim_id}</span>
                      <span className={getClaimStatusChip(c.status)}>{c.status}</span>
                      <p className="text-sm text-white mt-1">{c.incident_summary}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm" style={{ color: c.payout_amount !== "0" ? "#16A34A" : "#64748B" }}>
                        {formatGEN(c.payout_amount)}
                      </div>
                      <div className="font-mono text-xs text-slate-500">payout</div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
