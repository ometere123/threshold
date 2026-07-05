"use client";

import { useEffect, useState } from "react";
import { getDashboardStats, getContractBalance, getContractAddress, EXPLORER_URL } from "@/lib/contract";
import type { DashboardStats } from "@/lib/types";
import { formatGEN } from "@/lib/utils";

function Row({ label, value, accent, sub }: { label: string; value: string; accent?: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: "#1F2937" }}>
      <div>
        <div className="text-sm text-slate-300">{label}</div>
        {sub && <div className="text-xs text-slate-600 mt-0.5">{sub}</div>}
      </div>
      <div className="font-mono text-sm font-semibold" style={{ color: accent || "#F8FAFC" }}>{value}</div>
    </div>
  );
}

export default function AccountingPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [loading, setLoading] = useState(true);
  const contractAddress = getContractAddress();

  useEffect(() => {
    Promise.all([getDashboardStats(), getContractBalance()]).then(([s, b]) => {
      setStats(s);
      setBalance(b);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8 space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-16" />)}</div>;
  if (!stats) return <div className="p-8 text-slate-400">No accounting data available.</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Solvency View</h1>
        <p className="text-slate-400 text-sm mt-1">
          Every figure below is a live read from the deployed contract — nothing here is entered
          manually or simulated.
        </p>
      </div>

      <div className="panel p-4">
        <div className="field-label mb-1">Contract Address</div>
        <a
          href={`${EXPLORER_URL}/address/${contractAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-cyan-400 hover:underline break-all"
        >
          {contractAddress || "not configured"} ↗
        </a>
      </div>

      <div className="panel p-5">
        <div className="section-header mb-3">Contract-Held GEN Balance</div>
        <div className="font-mono text-3xl font-bold" style={{ color: "#38BDF8" }}>{formatGEN(balance)}</div>
        <p className="text-xs text-slate-500 mt-2">
          Read via <code className="font-mono text-cyan-400">get_contract_balance</code>. If
          StudioNet does not expose a balance query to the contract runtime, this falls back to{" "}
          <code className="font-mono text-cyan-400">0</code> — treat{" "}
          <span className="text-white">Pool Capital</span> below as the authoritative accounting
          figure in that case, since it is derived entirely from real deposit/premium/withdrawal/payout
          transactions.
        </p>
      </div>

      <div className="panel p-5">
        <div className="section-header mb-2">Accounting Breakdown (across all pools)</div>
        <Row label="Total Deposited" value={formatGEN(stats.total_deposited)} sub="Real GEN sent via create_pool / deposit_to_pool" />
        <Row label="Premiums Collected" value={formatGEN(stats.premiums_collected)} sub="Real GEN sent via buy_policy" accent="#38BDF8" />
        <Row label="Total Withdrawn" value={formatGEN(stats.total_withdrawn)} sub="Sent to pool owners via withdraw_available" />
        <Row label="Claims Paid" value={formatGEN(stats.claims_paid)} sub="Sent to policyholders on approved claims" accent="#F59E0B" />
        <Row
          label="Pool Capital"
          value={formatGEN(stats.pool_capital)}
          accent="#16A34A"
          sub="deposited + premiums − withdrawn − claims_paid"
        />
        <Row label="Reserved Exposure" value={formatGEN(stats.reserved_exposure)} sub="Locked against active policies, cannot be withdrawn" />
        <div className="pt-3">
          <Row label="Available Capital" value={formatGEN(stats.available_capital)} accent="#16A34A" sub="pool_capital − reserved_exposure" />
        </div>
      </div>

      <div className="panel-ice p-4 text-xs font-mono text-slate-400 space-y-1">
        <p>pool_capital = total_deposited + premiums_collected − total_withdrawn − claims_paid</p>
        <p>available_capital = pool_capital − reserved_exposure</p>
      </div>
    </div>
  );
}
