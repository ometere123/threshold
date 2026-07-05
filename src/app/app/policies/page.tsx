"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAllPolicies, getPoliciesByHolder } from "@/lib/contract";
import type { Policy } from "@/lib/types";
import { formatUnixTimestamp, formatGEN, getPolicyStatusChip, formatServiceSlug } from "@/lib/utils";
import { useWallet } from "@/store/wallet";

export default function PoliciesPage() {
  const { address, isConnected } = useWallet();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [mineOnly, setMineOnly] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetcher = mineOnly && address ? getPoliciesByHolder(address) : getAllPolicies();
    fetcher.then((p) => { setPolicies(p); setLoading(false); });
  }, [mineOnly, address]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">My Policies</h1>
          <p className="text-slate-400 text-sm mt-1">Funded outage cover you hold or have held</p>
        </div>
        <div className="flex items-center gap-3">
          {isConnected && (
            <button className="btn-secondary text-xs" onClick={() => setMineOnly((m) => !m)}>
              {mineOnly ? "Show all policies" : "Show my policies"}
            </button>
          )}
          <Link href="/app/policies/new" className="btn-primary">+ Buy Cover</Link>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24" />)}</div>
      ) : policies.length === 0 ? (
        <div className="panel p-12 text-center">
          <p className="text-slate-400 text-lg mb-2">No cover yet.</p>
          <p className="text-slate-600 text-sm mb-6">Buy parametric outage cover for a hosted service or component with real GEN premium.</p>
          <Link href="/app/policies/new" className="btn-primary inline-block">Buy Cover</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {policies.map((p) => (
            <Link key={p.policy_id} href={`/app/policies/${p.policy_id}`}>
              <div className="panel p-4 hover:border-cyan-400/30 transition-colors cursor-pointer">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-xs text-cyan-400">{p.policy_id}</span>
                      <span className={getPolicyStatusChip(p.status)}>{p.status}</span>
                    </div>
                    <p className="text-base font-semibold text-white font-display">{formatServiceSlug(p.service_slug)}</p>
                    <p className="text-xs text-slate-500 mt-0.5">component: {p.covered_component}</p>
                    <div className="mt-1 font-mono text-xs text-slate-500">
                      {formatUnixTimestamp(p.start_ts)} → {formatUnixTimestamp(p.end_ts)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-sm text-white">{formatGEN(p.coverage_amount)}</div>
                    <div className="font-mono text-xs text-slate-500">coverage</div>
                    <div className="font-mono text-xs text-slate-600 mt-1">premium: {formatGEN(p.premium_paid)}</div>
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
