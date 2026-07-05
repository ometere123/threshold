"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/store/wallet";
import { SERVICE_SLUGS } from "@/lib/types";
import { EXPLORER_URL, createPool } from "@/lib/contract";
import { parseGEN, formatGENPlain } from "@/lib/utils";

export default function NewPoolPage() {
  const router = useRouter();
  const { isConnected, isCorrectNetwork, provider, connect, switchNetwork } = useWallet();

  const [form, setForm] = useState({
    pool_id: `pool_${Date.now()}`,
    service_slug: SERVICE_SLUGS[0].value,
    covered_component: "",
    initial_deposit: "500",
    min_premium_bps: "500", // 5%
    max_policy_payout: "100",
    min_duration_days: "1",
    max_duration_days: "30",
  });

  const [txHash, setTxHash] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.covered_component.trim()) { setError("Covered component is required"); return; }

    const depositWei = parseGEN(form.initial_deposit);
    const maxPayoutWei = parseGEN(form.max_policy_payout);

    if (depositWei <= 0n) { setError("Initial deposit must be greater than zero"); return; }
    if (maxPayoutWei <= 0n) { setError("Max policy payout must be greater than zero"); return; }
    if (depositWei < maxPayoutWei) { setError("Initial deposit must cover at least one max payout"); return; }

    setSubmitting(true);
    setError("");

    try {
      const tx = await createPool(
        provider,
        {
          pool_id: form.pool_id,
          service_slug: form.service_slug,
          covered_component: form.covered_component,
          min_premium_bps: BigInt(form.min_premium_bps),
          max_policy_payout: maxPayoutWei,
          min_duration_seconds: BigInt(form.min_duration_days) * 86400n,
          max_duration_seconds: BigInt(form.max_duration_days) * 86400n,
        },
        depositWei
      );
      setTxHash(tx.hash);
      setTimeout(() => router.push("/app/pools"), 3000);
    } catch (err: any) {
      setError(err?.message || "Transaction failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-white">Create Risk Pool</h1>
        <p className="text-slate-400 text-sm mt-1">
          Deposit real GEN to underwrite parametric outage cover. This transaction sends native GEN
          to the contract — the pool&apos;s capital is exactly what you deposit here, nothing is simulated.
        </p>
      </div>

      {txHash && (
        <div className="panel-ice p-4 mb-6">
          <div className="section-header mb-1">Pool Funded</div>
          <p className="text-sm text-slate-400 mb-2">Deposit transaction submitted to StudioNet.</p>
          <a
            href={`${EXPLORER_URL}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-cyan-400 hover:underline"
          >
            View on Explorer ↗ {txHash.slice(0, 16)}…
          </a>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="panel p-5 space-y-4">
          <div className="section-header">Pool Identity</div>

          <div>
            <label className="field-label">Covered Service *</label>
            <select className="input-field" value={form.service_slug} onChange={(e) => setForm({ ...form, service_slug: e.target.value })}>
              {SERVICE_SLUGS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div>
            <label className="field-label">Covered Component *</label>
            <input
              className="input-field"
              value={form.covered_component}
              onChange={(e) => setForm({ ...form, covered_component: e.target.value })}
              placeholder="API Gateway"
              required
            />
          </div>
        </div>

        <div className="panel p-5 space-y-4">
          <div className="section-header">Real GEN Deposit</div>
          <div>
            <label className="field-label">Initial Deposit (GEN) *</label>
            <input
              className="input-field"
              type="number"
              min="0"
              step="0.0001"
              value={form.initial_deposit}
              onChange={(e) => setForm({ ...form, initial_deposit: e.target.value })}
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              This GEN is sent to the contract as a payable transaction. It must cover at least one
              max policy payout.
            </p>
          </div>
        </div>

        <div className="panel p-5 space-y-4">
          <div className="section-header">Underwriting Terms</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Min Premium (bps) *</label>
              <input
                className="input-field"
                type="number"
                min="1"
                value={form.min_premium_bps}
                onChange={(e) => setForm({ ...form, min_premium_bps: e.target.value })}
              />
              <p className="text-xs text-slate-500 mt-1">{(Number(form.min_premium_bps) / 100).toFixed(2)}% of coverage amount</p>
            </div>
            <div>
              <label className="field-label">Max Policy Payout (GEN) *</label>
              <input
                className="input-field"
                type="number"
                min="0"
                step="0.0001"
                value={form.max_policy_payout}
                onChange={(e) => setForm({ ...form, max_policy_payout: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label">Min Duration (days) *</label>
              <input
                className="input-field"
                type="number"
                min="1"
                value={form.min_duration_days}
                onChange={(e) => setForm({ ...form, min_duration_days: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label">Max Duration (days) *</label>
              <input
                className="input-field"
                type="number"
                min="1"
                value={form.max_duration_days}
                onChange={(e) => setForm({ ...form, max_duration_days: e.target.value })}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="panel p-3 border-red-700/50">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          {!isConnected ? (
            <button type="button" onClick={connect} className="btn-primary flex-1">
              Connect Wallet to Fund Pool
            </button>
          ) : !isCorrectNetwork ? (
            <button type="button" className="btn-danger flex-1" onClick={switchNetwork}>Switch to StudioNet</button>
          ) : (
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>
              {submitting ? "Sending GEN…" : `Deposit ${formatGENPlain(parseGEN(form.initial_deposit).toString())} GEN & Create Pool`}
            </button>
          )}
          <button type="button" className="btn-secondary" onClick={() => router.back()}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
