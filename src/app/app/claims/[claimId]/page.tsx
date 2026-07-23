"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getClaim, resolveClaim } from "@/lib/contract";
import type { Claim } from "@/lib/types";
import { formatDateTime, formatGEN, getClaimStatusChip, formatVerdict, getVerdictColor, getPayoutBandColor, explorerTxUrl } from "@/lib/utils";
import { SettlementRail } from "@/components/shared/SettlementRail";
import { useWallet } from "@/store/wallet";

export default function ClaimDetailPage() {
  const { claimId } = useParams<{ claimId: string }>();
  const { address, isConnected, provider, connect } = useWallet();

  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [resolveTxHash, setResolveTxHash] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const c = await getClaim(claimId);
    setClaim(c);
    setLoading(false);
  }

  useEffect(() => { load(); }, [claimId]);

  async function handleResolve() {
    setResolving(true);
    setError("");
    try {
      const tx = await resolveClaim(provider, address, claimId);
      setResolveTxHash(tx.hash);
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        const updated = await getClaim(claimId);
        if (updated && updated.resolved_at) {
          setClaim(updated);
          clearInterval(poll);
          setResolving(false);
        }
        if (attempts > 40) { clearInterval(poll); setResolving(false); }
      }, 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Resolution failed");
      setResolving(false);
    }
  }

  if (loading) return <div className="p-8 space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16" />)}</div>;
  if (!claim) return <div className="p-8 text-slate-400">Claim not found.</div>;

  const canResolve = claim.status === "submitted";
  const isResolved = !!claim.resolved_at;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2 text-xs">
          <Link href="/app/claims" className="text-slate-500 hover:text-cyan-400">Claims</Link>
          <span className="text-slate-600">/</span>
          <span className="font-mono text-cyan-400">{claim.claim_id}</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">{claim.incident_summary.slice(0, 60)}{claim.incident_summary.length > 60 ? "…" : ""}</h1>
            <p className="text-slate-400 text-sm mt-1">
              Policy: <Link href={`/app/policies/${claim.policy_id}`} className="text-cyan-400 hover:underline">{claim.policy_id}</Link>
              {" · "}Submitted {formatDateTime(claim.submitted_at)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={getClaimStatusChip(claim.status)}>{claim.status}</span>
            {claim.payout_amount !== "0" && (
              <div className="panel-ice px-3 py-1.5 text-sm font-mono" style={{ color: "#16A34A" }}>
                Payout: {formatGEN(claim.payout_amount)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="panel p-4">
        <div className="section-header mb-4">Settlement Rail</div>
        <SettlementRail status={claim.status} />
      </div>

      {resolveTxHash && (
        <div className="panel-ice p-3">
          <p className="font-mono text-xs text-slate-400">
            Resolution tx: <a href={explorerTxUrl(resolveTxHash)} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">{resolveTxHash.slice(0, 20)}… ↗</a>
          </p>
        </div>
      )}

      {/* Claim summary */}
      <div className="panel p-5">
        <div className="section-header mb-3">Claim Summary</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="field-label">Claimant</div>
            <div className="font-mono text-xs text-white mt-1 break-all">{claim.claimant}</div>
          </div>
          <div>
            <div className="field-label">Pool</div>
            <div className="text-sm text-white mt-1">{claim.pool_id}</div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t" style={{ borderColor: "#1F2937" }}>
          <div className="field-label mb-1">Incident Summary</div>
          <p className="text-sm text-slate-300 leading-relaxed">{claim.incident_summary}</p>
        </div>
      </div>

      {/* Evidence */}
      <div className="panel p-4">
        <div className="section-header mb-3">Public Evidence</div>
        <a
          href={claim.evidence_url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-cyan-400 hover:underline break-all"
        >
          {claim.evidence_url}
        </a>
        <p className="text-xs text-slate-500 mt-2">
          GenLayer validators fetch this URL directly. The incident summary is context only; the
          fetched public evidence must independently support the claim before any payout can occur.
        </p>
      </div>

      {/* Validator Replay */}
      {isResolved ? (
        <div className="panel p-5 space-y-4">
          <div className="section-header">Validator Replay - Consensus Result</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="field-label">Verdict</div>
              <div className="text-sm font-semibold mt-1" style={{ color: getVerdictColor(claim.verdict) }}>{formatVerdict(claim.verdict)}</div>
            </div>
            <div>
              <div className="field-label">Payout Band</div>
              <div className="text-sm mt-1" style={{ color: getPayoutBandColor(claim.payout_band) }}>{claim.payout_band.replace(/_/g, " ")}</div>
            </div>
            <div>
              <div className="field-label">Confidence</div>
              <div className="font-mono text-sm mt-1" style={{ color: "#38BDF8" }}>{claim.confidence}%</div>
            </div>
            <div>
              <div className="field-label">Payout Amount</div>
              <div className="font-mono text-sm mt-1" style={{ color: claim.payout_amount !== "0" ? "#16A34A" : "#64748B" }}>
                {formatGEN(claim.payout_amount)}
              </div>
            </div>
          </div>
          <div className="pt-4 border-t" style={{ borderColor: "#1F2937" }}>
            <div className="field-label mb-1">Reason</div>
            <p className="text-sm text-slate-300 leading-relaxed">{claim.reason}</p>
          </div>
          <div className="font-mono text-xs text-slate-600">Resolved {formatDateTime(claim.resolved_at)}</div>
        </div>
      ) : canResolve ? (
        <div className="panel p-6 text-center space-y-4">
          <div className="section-header">Resolve with GenLayer</div>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Trigger GenLayer validator consensus to fetch the evidence URL, evaluate it against the
            policy terms, and reach a final on-chain verdict. If approved, GEN is sent to the
            policyholder as a finalized external transfer.
          </p>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {!isConnected ? (
            <button className="btn-primary" onClick={connect}>Connect Wallet to Resolve</button>
          ) : (
            <button className="btn-primary" onClick={handleResolve} disabled={resolving}>
              {resolving ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border-2 border-cyan-400 border-t-transparent spin inline-block" />
                  Resolving with GenLayer…
                </span>
              ) : "Resolve with GenLayer"}
            </button>
          )}
          {resolving && (
            <p className="font-mono text-xs text-slate-500">
              Validators are fetching evidence and reaching consensus. This may take 60–120 seconds.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
