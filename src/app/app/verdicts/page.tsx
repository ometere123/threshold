"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRecentVerdicts } from "@/lib/contract";
import type { Claim, ClaimVerdict, PayoutBand } from "@/lib/types";
import { VERDICT_LABELS } from "@/lib/types";
import { formatDateTime, formatGEN, formatVerdict, getVerdictColor, getPayoutBandColor } from "@/lib/utils";

const VERDICT_OPTIONS = Object.keys(VERDICT_LABELS).filter((v) => v !== "") as ClaimVerdict[];
const BAND_OPTIONS: PayoutBand[] = ["none", "partial", "full", "manual_review"];

export default function VerdictsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{ verdict: string; payout_band: string }>({ verdict: "", payout_band: "" });

  useEffect(() => {
    getRecentVerdicts(50).then((c) => { setClaims(c); setLoading(false); });
  }, []);

  const filtered = claims.filter((c) => {
    if (filter.verdict && c.verdict !== filter.verdict) return false;
    if (filter.payout_band && c.payout_band !== filter.payout_band) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-white">Verdict Archive</h1>
        <p className="text-slate-400 text-sm mt-1">All resolved claims with GenLayer consensus records</p>
      </div>

      <div className="panel p-4 flex flex-wrap gap-3 mb-6">
        <div>
          <label className="field-label">Verdict</label>
          <select className="input-field text-xs" style={{ width: "220px" }} value={filter.verdict} onChange={(e) => setFilter({ ...filter, verdict: e.target.value })}>
            <option value="">All verdicts</option>
            {VERDICT_OPTIONS.map((v) => <option key={v} value={v}>{formatVerdict(v)}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Payout Band</label>
          <select className="input-field text-xs" style={{ width: "180px" }} value={filter.payout_band} onChange={(e) => setFilter({ ...filter, payout_band: e.target.value })}>
            <option value="">All bands</option>
            {BAND_OPTIONS.map((b) => <option key={b} value={b}>{b.replace(/_/g, " ")}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button className="btn-secondary text-xs" onClick={() => setFilter({ verdict: "", payout_band: "" })}>
            Clear Filters
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="panel p-12 text-center text-slate-500">No verdicts found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <Link key={c.claim_id} href={`/app/claims/${c.claim_id}`}>
              <div className="panel p-5 hover:border-cyan-400/30 cursor-pointer transition-colors h-full">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="font-mono text-xs text-cyan-400">{c.claim_id}</span>
                    <span className="mx-2 text-slate-600">·</span>
                    <span className="font-mono text-xs text-slate-500">{c.policy_id}</span>
                  </div>
                  <span className="font-mono text-xs" style={{ color: "#38BDF8" }}>{c.confidence}%</span>
                </div>

                <div className="mb-2">
                  <p className="text-sm font-semibold" style={{ color: getVerdictColor(c.verdict) }}>
                    {formatVerdict(c.verdict)}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{formatDateTime(c.resolved_at)}</p>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 mb-3">{c.reason}</p>

                <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "#1F2937" }}>
                  <span
                    className="chip text-xs"
                    style={{
                      background: getPayoutBandColor(c.payout_band) + "22",
                      color: getPayoutBandColor(c.payout_band),
                      border: `1px solid ${getPayoutBandColor(c.payout_band)}44`,
                    }}
                  >
                    {c.payout_band.replace(/_/g, " ")}
                  </span>
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
  );
}
