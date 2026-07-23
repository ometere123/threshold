"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/store/wallet";
import { getAllPools, buyPolicy, calculatePremium, EXPLORER_URL } from "@/lib/contract";
import type { Pool } from "@/lib/types";
import { formatGEN, formatGENPlain, parseGEN, formatServiceSlug } from "@/lib/utils";

export default function NewPolicyPage() {
  const router = useRouter();
  const { address, isConnected, isCorrectNetwork, provider, connect, switchNetwork } = useWallet();

  const [pools, setPools] = useState<Pool[]>([]);
  const [poolId, setPoolId] = useState("");
  const [coverageAmount, setCoverageAmount] = useState("50");
  const [durationDays, setDurationDays] = useState("7");
  const [txHash, setTxHash] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getAllPools().then((p) => {
      const active = p.filter((pl) => pl.active);
      setPools(active);
      if (active.length > 0) setPoolId(active[0].pool_id);
    });
  }, []);

  const selectedPool = pools.find((p) => p.pool_id === poolId) || null;

  const coverageWei = useMemo(() => parseGEN(coverageAmount), [coverageAmount]);
  const premiumWei = useMemo(
    () => (selectedPool ? calculatePremium(coverageWei, BigInt(selectedPool.min_premium_bps)) : 0n),
    [selectedPool, coverageWei]
  );

  const availableWei = selectedPool ? BigInt(selectedPool.available_capital) : 0n;
  const maxPayoutWei = selectedPool ? BigInt(selectedPool.max_policy_payout) : 0n;

  const validationError = (() => {
    if (!selectedPool) return "No pool selected";
    if (coverageWei <= 0n) return "Coverage amount required";
    if (coverageWei > maxPayoutWei) return `Coverage exceeds pool max payout of ${formatGEN(maxPayoutWei)}`;
    if (coverageWei > availableWei) return "Insufficient available pool capital";
    const days = Number(durationDays);
    const minDays = Number(selectedPool.min_duration_seconds) / 86400;
    const maxDays = Number(selectedPool.max_duration_seconds) / 86400;
    if (days < minDays) return `Duration too short (min ${minDays} days)`;
    if (days > maxDays) return `Duration too long (max ${maxDays} days)`;
    return null;
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validationError) { setError(validationError); return; }

    setSubmitting(true);
    setError("");

    try {
      const policyId = `policy_${Date.now()}`;
      const tx = await buyPolicy(
        provider,
        address,
        {
          pool_id: poolId,
          policy_id: policyId,
          coverage_amount: coverageWei,
          duration_seconds: BigInt(durationDays) * 86400n,
        },
        premiumWei
      );
      setTxHash(tx.hash);
      setTimeout(() => router.push("/app/policies"), 3000);
    } catch (err: any) {
      setError(err?.message || "Transaction failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-white">Buy Cover</h1>
        <p className="text-slate-400 text-sm mt-1">
          Choose coverage and duration. The premium is calculated deterministically from the pool&apos;s
          rate and sent as real GEN with your purchase transaction.
        </p>
      </div>

      {txHash && (
        <div className="panel-ice p-4 mb-6">
          <div className="section-header mb-1">Cover Purchased</div>
          <a href={`${EXPLORER_URL}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-cyan-400 hover:underline">
            View tx: {txHash.slice(0, 20)}… ↗
          </a>
        </div>
      )}

      {pools.length === 0 ? (
        <div className="panel p-8 text-center text-slate-400 text-sm">
          No active pools available. <a href="/app/pools/new" className="text-cyan-400 hover:underline">Create a pool first.</a>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="panel p-5 space-y-4">
            <div className="section-header">Pool</div>
            <select className="input-field" value={poolId} onChange={(e) => setPoolId(e.target.value)}>
              {pools.map((p) => (
                <option key={p.pool_id} value={p.pool_id}>
                  {formatServiceSlug(p.service_slug)} - {p.covered_component} ({p.pool_id})
                </option>
              ))}
            </select>
            {selectedPool && (
              <div className="panel-ice p-3 font-mono text-xs space-y-1">
                <div className="text-slate-400">Available capital: <span style={{ color: "#16A34A" }}>{formatGEN(selectedPool.available_capital)}</span></div>
                <div className="text-slate-400">Max policy payout: {formatGEN(selectedPool.max_policy_payout)}</div>
                <div className="text-slate-400">Rate: {(Number(selectedPool.min_premium_bps) / 100).toFixed(2)}% of coverage</div>
              </div>
            )}
          </div>

          <div className="panel p-5 space-y-4">
            <div className="section-header">Coverage Terms</div>
            <div>
              <label className="field-label">Coverage Amount (GEN) *</label>
              <input className="input-field" type="number" min="0" step="0.0001" value={coverageAmount} onChange={(e) => setCoverageAmount(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Duration (days) *</label>
              <input className="input-field" type="number" min="1" value={durationDays} onChange={(e) => setDurationDays(e.target.value)} />
            </div>
          </div>

          <div className="panel p-5">
            <div className="section-header mb-3">Premium - Deterministic Calculation</div>
            <div className="font-mono text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Coverage Amount</span>
                <span className="text-white">{formatGENPlain(coverageWei)} GEN</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Premium Rate</span>
                <span className="text-white">{selectedPool ? (Number(selectedPool.min_premium_bps) / 100).toFixed(2) : "-"}%</span>
              </div>
              <hr className="divider" />
              <div className="flex justify-between text-base">
                <span className="text-slate-400">Premium Due</span>
                <span style={{ color: "#38BDF8" }}>{formatGENPlain(premiumWei)} GEN</span>
              </div>
            </div>
          </div>

          {(error || validationError) && (
            <div className="panel p-3" style={{ borderColor: "rgba(220,38,38,0.3)" }}>
              <p className="text-sm text-red-400">{error || validationError}</p>
            </div>
          )}

          <div className="flex gap-3">
            {!isConnected ? (
              <button type="button" className="btn-primary flex-1" onClick={connect}>Connect Wallet to Buy Cover</button>
            ) : !isCorrectNetwork ? (
              <button type="button" className="btn-danger flex-1" onClick={switchNetwork}>Switch to StudioNet</button>
            ) : (
              <button type="submit" className="btn-primary flex-1" disabled={submitting || !!validationError}>
                {submitting ? "Sending Premium…" : `Pay ${formatGENPlain(premiumWei)} GEN & Buy Cover`}
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
