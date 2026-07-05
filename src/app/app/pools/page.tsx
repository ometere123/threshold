"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAllPools } from "@/lib/contract";
import type { Pool } from "@/lib/types";
import { formatGEN, formatDate, shortenAddress, formatServiceSlug } from "@/lib/utils";

function PoolCard({ pool }: { pool: Pool }) {
  const capital = BigInt(pool.pool_capital || "0");
  const reserved = BigInt(pool.reserved_exposure || "0");
  const utilizationPct = capital > 0n ? Number((reserved * 100n) / capital) : 0;

  return (
    <Link href={`/app/pools/${pool.pool_id}`}>
      <div className="panel p-5 hover:border-cyan-400/30 transition-colors cursor-pointer">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-cyan-400">{pool.pool_id}</span>
              <span className={`chip ${pool.active ? "chip-active" : "chip-expired"}`}>
                {pool.active ? "active" : "inactive"}
              </span>
            </div>
            <h3 className="font-display font-semibold text-white text-lg">{formatServiceSlug(pool.service_slug)}</h3>
            <p className="text-xs text-slate-500 mt-1">covers: {pool.covered_component}</p>
          </div>
        </div>

        {/* Exposure meter */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-xs text-slate-500">Reserved Exposure</span>
            <span className="font-mono text-xs text-slate-400">{utilizationPct}% utilized</span>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: "#1F2937" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(utilizationPct, 100)}%`,
                background: utilizationPct > 80 ? "#DC2626" : utilizationPct > 60 ? "#F59E0B" : "#38BDF8",
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <div className="field-label">Pool Capital</div>
            <div className="font-mono text-sm text-white">{formatGEN(pool.pool_capital)}</div>
          </div>
          <div>
            <div className="field-label">Reserved</div>
            <div className="font-mono text-sm" style={{ color: "#F59E0B" }}>{formatGEN(pool.reserved_exposure)}</div>
          </div>
          <div>
            <div className="field-label">Claims Paid</div>
            <div className="font-mono text-sm text-white">{formatGEN(pool.claims_paid)}</div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t text-xs font-mono text-slate-600" style={{ borderColor: "#1F2937" }}>
          Owner: {shortenAddress(pool.owner)} · Created {formatDate(pool.created_at)}
        </div>
      </div>
    </Link>
  );
}

export default function PoolsPage() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllPools().then((p) => { setPools(p); setLoading(false); });
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Risk Pools</h1>
          <p className="text-slate-400 text-sm mt-1">Underwriter capital backing funded outage cover</p>
        </div>
        <Link href="/app/pools/new" className="btn-primary">+ Create Pool</Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-48 w-full" />)}
        </div>
      ) : pools.length === 0 ? (
        <div className="panel p-12 text-center">
          <p className="text-slate-400 text-lg mb-2">No pools yet.</p>
          <p className="text-slate-600 text-sm mb-6">Create a risk pool with a real GEN deposit to start underwriting outage cover.</p>
          <Link href="/app/pools/new" className="btn-primary inline-block">Create First Pool</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pools.map((pool) => <PoolCard key={pool.pool_id} pool={pool} />)}
        </div>
      )}
    </div>
  );
}
