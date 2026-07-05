"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getPool, getAllPolicies, depositToPool, withdrawAvailable, updatePoolStatus, EXPLORER_URL } from "@/lib/contract";
import type { Pool, Policy } from "@/lib/types";
import { formatGEN, formatDate, getPolicyStatusChip, parseGEN, formatServiceSlug } from "@/lib/utils";
import { useWallet } from "@/store/wallet";

export default function PoolDetailPage() {
  const { poolId } = useParams<{ poolId: string }>();
  const { isConnected, provider, connect, address } = useWallet();
  const [pool, setPool] = useState<Pool | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  const [depositAmount, setDepositAmount] = useState("100");
  const [withdrawAmount, setWithdrawAmount] = useState("10");
  const [withdrawRecipient, setWithdrawRecipient] = useState("");
  const [busy, setBusy] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const [p, allPolicies] = await Promise.all([getPool(poolId), getAllPolicies()]);
    setPool(p);
    setPolicies(allPolicies.filter((pol) => pol.pool_id === poolId));
    setLoading(false);
  }

  useEffect(() => { load(); }, [poolId]);
  useEffect(() => { if (address && !withdrawRecipient) setWithdrawRecipient(address); }, [address]);

  const isOwner = pool && address && pool.owner.toLowerCase() === address.toLowerCase();

  async function handleDeposit() {
    setBusy(true);
    setError("");
    try {
      const tx = await depositToPool(provider, poolId, parseGEN(depositAmount));
      setTxHash(tx.hash);
      setTimeout(load, 3000);
    } catch (err: any) {
      setError(err?.message || "Deposit failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleWithdraw() {
    setBusy(true);
    setError("");
    try {
      const tx = await withdrawAvailable(provider, poolId, parseGEN(withdrawAmount), withdrawRecipient);
      setTxHash(tx.hash);
      setTimeout(load, 3000);
    } catch (err: any) {
      setError(err?.message || "Withdrawal failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleActive() {
    if (!pool) return;
    setBusy(true);
    setError("");
    try {
      const tx = await updatePoolStatus(provider, poolId, !pool.active);
      setTxHash(tx.hash);
      setTimeout(load, 3000);
    } catch (err: any) {
      setError(err?.message || "Status update failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="p-8 space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-16" />)}</div>;
  if (!pool) return <div className="p-8 text-slate-400">Pool not found.</div>;

  const capital = BigInt(pool.pool_capital || "0");
  const reserved = BigInt(pool.reserved_exposure || "0");
  const utilizationPct = capital > 0n ? Number((reserved * 100n) / capital) : 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/app/pools" className="text-xs text-slate-500 hover:text-cyan-400">Pools</Link>
            <span className="text-slate-600">/</span>
            <span className="font-mono text-xs text-cyan-400">{pool.pool_id}</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-white">{formatServiceSlug(pool.service_slug)}</h1>
          <p className="text-slate-400 text-sm mt-1">covers: {pool.covered_component}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`chip ${pool.active ? "chip-active" : "chip-expired"}`}>{pool.active ? "active" : "inactive"}</span>
          {isOwner && (
            <button className="btn-secondary text-xs" onClick={handleToggleActive} disabled={busy}>
              {busy ? "Updating…" : pool.active ? "Pause Pool" : "Reactivate Pool"}
            </button>
          )}
        </div>
      </div>

      {/* Real accounting panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Pool Capital", value: formatGEN(pool.pool_capital), color: "#38BDF8" },
          { label: "Reserved Exposure", value: formatGEN(pool.reserved_exposure), color: "#F59E0B" },
          { label: "Available Capital", value: formatGEN(pool.available_capital), color: "#16A34A" },
        ].map((item) => (
          <div key={item.label} className="panel p-4">
            <div className="field-label">{item.label}</div>
            <div className="font-mono text-xl font-bold mt-1" style={{ color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Deposited", value: formatGEN(pool.total_deposited) },
          { label: "Premiums Collected", value: formatGEN(pool.premiums_collected) },
          { label: "Claims Paid", value: formatGEN(pool.claims_paid) },
          { label: "Total Withdrawn", value: formatGEN(pool.total_withdrawn) },
        ].map((item) => (
          <div key={item.label} className="panel p-4">
            <div className="field-label">{item.label}</div>
            <div className="font-mono text-sm text-white mt-1">{item.value}</div>
          </div>
        ))}
      </div>

      {/* Exposure meter */}
      <div className="panel p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="section-header">Reserved Exposure</span>
          <span className="font-mono text-xs text-slate-400">{utilizationPct}% of capital reserved</span>
        </div>
        <div className="h-2 rounded-full" style={{ background: "#1F2937" }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(utilizationPct, 100)}%`,
              background: utilizationPct > 80 ? "#DC2626" : utilizationPct > 60 ? "#F59E0B" : "#38BDF8",
            }}
          />
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

      {/* Fund pool */}
      <div className="panel p-5 space-y-3">
        <div className="section-header">Fund Pool</div>
        <p className="text-xs text-slate-500">Anyone can deposit additional real GEN to grow this pool&apos;s capital.</p>
        <div className="flex gap-3">
          <input className="input-field flex-1" type="number" min="0" step="0.0001" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
          {!isConnected ? (
            <button className="btn-primary" onClick={connect}>Connect Wallet</button>
          ) : (
            <button className="btn-primary" onClick={handleDeposit} disabled={busy}>
              {busy ? "Sending…" : `Deposit ${depositAmount} GEN`}
            </button>
          )}
        </div>
      </div>

      {/* Withdraw (owner only) */}
      {isOwner && (
        <div className="panel p-5 space-y-3">
          <div className="section-header">Withdraw Available Capital</div>
          <p className="text-xs text-slate-500">
            Only the pool owner can withdraw. You may withdraw up to {formatGEN(pool.available_capital)} — reserved
            exposure cannot be withdrawn.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <input className="input-field" type="number" min="0" step="0.0001" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="Amount (GEN)" />
            <input className="input-field font-mono text-xs" value={withdrawRecipient} onChange={(e) => setWithdrawRecipient(e.target.value)} placeholder="Recipient address" />
          </div>
          <button className="btn-secondary" onClick={handleWithdraw} disabled={busy}>
            {busy ? "Withdrawing…" : "Withdraw"}
          </button>
        </div>
      )}

      {/* Policies backed by this pool */}
      <div>
        <div className="section-header mb-3">Cover Backed by This Pool</div>
        {policies.length === 0 ? (
          <div className="panel p-6 text-center text-slate-500 text-sm">No policies yet.</div>
        ) : (
          <div className="space-y-2">
            {policies.map((p) => (
              <Link key={p.policy_id} href={`/app/policies/${p.policy_id}`}>
                <div className="panel p-3 hover:border-cyan-400/30 cursor-pointer transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs text-cyan-400 mr-2">{p.policy_id}</span>
                      <span className={getPolicyStatusChip(p.status)}>{p.status}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm text-white">{formatGEN(p.coverage_amount)}</div>
                      <div className="font-mono text-xs text-slate-500">coverage</div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="font-mono text-xs text-slate-600">Created {formatDate(pool.created_at)}</div>
    </div>
  );
}
