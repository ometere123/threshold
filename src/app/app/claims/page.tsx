"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAllClaims } from "@/lib/contract";
import type { Claim } from "@/lib/types";
import { formatDateTime, formatGEN, getClaimStatusChip } from "@/lib/utils";

export default function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllClaims().then((c) => { setClaims(c); setLoading(false); });
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Claims</h1>
          <p className="text-slate-400 text-sm mt-1">Submitted and resolved incident cover claims</p>
        </div>
        <Link href="/app/claims/new" className="btn-primary">+ Submit Claim</Link>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20" />)}</div>
      ) : claims.length === 0 ? (
        <div className="panel p-12 text-center">
          <p className="text-slate-400 text-lg mb-2">No claims submitted.</p>
          <p className="text-slate-600 text-sm mb-6">Claims appear here when a policyholder reports a qualifying outage.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {claims.map((c) => (
            <Link key={c.claim_id} href={`/app/claims/${c.claim_id}`}>
              <div className="panel p-4 hover:border-cyan-400/30 cursor-pointer transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-cyan-400">{c.claim_id}</span>
                      <span className={getClaimStatusChip(c.status)}>{c.status}</span>
                    </div>
                    <p className="text-sm text-white font-medium">{c.incident_summary}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Policy: <Link href={`/app/policies/${c.policy_id}`} className="text-cyan-400 hover:underline">{c.policy_id}</Link>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Submitted: {formatDateTime(c.submitted_at)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className="font-mono text-sm"
                      style={{ color: c.payout_amount !== "0" ? "#16A34A" : "#64748B" }}
                    >
                      {c.payout_amount !== "0" ? formatGEN(c.payout_amount) : "Pending"}
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
  );
}
