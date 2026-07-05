"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDashboardStats, getAllPolicies, getAllClaims, getRecentVerdicts, isContractConfigured } from "@/lib/contract";
import type { DashboardStats, Policy, Claim } from "@/lib/types";
import { formatDateTime, formatGEN, getPolicyStatusChip, getClaimStatusChip, formatVerdict, getVerdictColor, formatServiceSlug } from "@/lib/utils";

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="panel p-4">
      <div className="field-label">{label}</div>
      <div className="font-mono text-2xl font-bold mt-1" style={{ color: accent || "#F8FAFC" }}>
        {value}
      </div>
      {sub && <div className="font-mono text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

export default function RiskDeskPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [verdicts, setVerdicts] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const configured = isContractConfigured();

  useEffect(() => {
    Promise.all([
      getDashboardStats(),
      getAllPolicies(),
      getAllClaims(),
      getRecentVerdicts(5),
    ]).then(([s, p, c, v]) => {
      setStats(s);
      setPolicies(p.slice(0, 5));
      setClaims(c.filter((cl) => cl.status === "submitted").slice(0, 5));
      setVerdicts(v.slice(0, 5));
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Risk Desk</h1>
          <p className="text-slate-400 text-sm mt-1">Funded parametric outage cover - real GEN, on-chain accounting</p>
        </div>
        {!configured && (
          <div className="panel px-3 py-2 text-xs font-mono text-red-400" style={{ borderColor: "rgba(220,38,38,0.3)" }}>
            No contract configured - set NEXT_PUBLIC_CONTRACT_ADDRESS
          </div>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label="Active Cover" value={stats.active_policies.toString()} accent="#16A34A" />
          <StatCard label="Open Claims" value={stats.open_claims.toString()} accent="#F59E0B" />
          <StatCard label="Pool Capital" value={formatGEN(stats.pool_capital)} accent="#38BDF8" sub="deposits + premiums − withdrawals − payouts" />
          <StatCard label="Available Capital" value={formatGEN(stats.available_capital)} accent="#16A34A" sub="pool capital minus reserved exposure" />
          <StatCard label="Reserved Exposure" value={formatGEN(stats.reserved_exposure)} />
        </div>
      )}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard label="Premiums Collected" value={formatGEN(stats.premiums_collected)} />
          <StatCard label="Claims Paid" value={formatGEN(stats.claims_paid)} accent="#F59E0B" />
          <StatCard label="Avg Claim Confidence" value={`${stats.average_claim_confidence}%`} accent="#2563EB" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Policies */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="section-header">Active Cover</div>
            <Link href="/app/policies" className="text-xs text-cyan-400 hover:underline">View all →</Link>
          </div>
          {policies.length === 0 ? (
            <div className="panel p-6 text-center">
              <p className="text-slate-500 text-sm">No cover purchased yet.</p>
              <p className="text-slate-600 text-xs mt-1">Buy parametric outage cover for a hosted service or component.</p>
              <Link href="/app/policies/new" className="btn-primary text-xs mt-4 inline-block">Buy Cover</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {policies.map((p) => (
                <Link key={p.policy_id} href={`/app/policies/${p.policy_id}`}>
                  <div className="panel p-3 hover:border-cyan-400/30 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-cyan-400">{p.policy_id}</span>
                          <span className={getPolicyStatusChip(p.status)}>{p.status}</span>
                        </div>
                        <p className="text-sm text-white font-medium truncate">{formatServiceSlug(p.service_slug)}</p>
                        <p className="text-xs text-slate-500 mt-0.5">component: {p.covered_component}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-sm text-white">{formatGEN(p.coverage_amount)}</div>
                        <div className="font-mono text-xs text-slate-500">coverage</div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              <Link href="/app/policies/new" className="btn-secondary text-xs w-full block text-center mt-2">
                + Buy Cover
              </Link>
            </div>
          )}
        </div>

        {/* Open Claims */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="section-header">Open Claims</div>
            <Link href="/app/claims" className="text-xs text-cyan-400 hover:underline">View all →</Link>
          </div>
          {claims.length === 0 ? (
            <div className="panel p-6 text-center">
              <p className="text-slate-500 text-sm">No claims submitted.</p>
              <p className="text-slate-600 text-xs mt-1">Claims appear here when a policyholder reports a qualifying outage.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {claims.map((c) => (
                <Link key={c.claim_id} href={`/app/claims/${c.claim_id}`}>
                  <div className="panel p-3 hover:border-cyan-400/30 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-cyan-400">{c.claim_id}</span>
                          <span className={getClaimStatusChip(c.status)}>{c.status}</span>
                        </div>
                        <p className="text-sm text-white font-medium truncate">{c.incident_summary}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Policy: {c.policy_id} · {formatDateTime(c.submitted_at)}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Verdicts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="section-header">Recent Verdicts</div>
          <Link href="/app/verdicts" className="text-xs text-cyan-400 hover:underline">View archive →</Link>
        </div>
        {verdicts.length === 0 ? (
          <div className="panel p-6 text-center">
            <p className="text-slate-500 text-sm">No verdicts yet. Claims appear here after GenLayer validator resolution.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {verdicts.map((c) => (
              <Link key={c.claim_id} href={`/app/claims/${c.claim_id}`}>
                <div className="panel p-4 hover:border-cyan-400/30 transition-colors cursor-pointer h-full">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs text-cyan-400">{c.claim_id}</span>
                    <span className="font-mono text-xs" style={{ color: "#38BDF8" }}>{c.confidence}% conf.</span>
                  </div>
                  <p className="text-sm font-medium mb-1" style={{ color: getVerdictColor(c.verdict) }}>
                    {formatVerdict(c.verdict)}
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{c.reason}</p>
                  <div className="mt-2 pt-2 border-t flex items-center justify-between" style={{ borderColor: "#1F2937" }}>
                    <span className="font-mono text-xs text-slate-500">{c.payout_band.replace(/_/g, " ")}</span>
                    {c.payout_amount !== "0" && (
                      <span className="font-mono text-xs" style={{ color: "#16A34A" }}>{formatGEN(c.payout_amount)}</span>
                    )}
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
