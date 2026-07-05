// GenLayer contract client for Threshold - funded outage cover protocol
// Uses genlayer-js 1.1.8. Every capital figure is a live contract read.
// There is no mock/demo data mode: without a deployed contract address,
// read calls return null/empty and write calls throw.

import { createClient } from "genlayer-js";
import type { Pool, Policy, Claim, DashboardStats } from "./types";

const CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "") as `0x${string}`;
const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL || "https://studio.genlayer.com/api";

export const EXPLORER_URL =
  process.env.NEXT_PUBLIC_EXPLORER_URL ||
  "https://explorer-studio.genlayer.com";

export function getReadClient() {
  return createClient({ endpoint: RPC_URL } as any);
}

export function getWriteClient() {
  return createClient({ endpoint: RPC_URL } as any);
}

export function getContractAddress() {
  return CONTRACT_ADDRESS;
}

export function isContractConfigured() {
  return !!CONTRACT_ADDRESS;
}

// ─── READ METHODS ────────────────────────────────────────────────────────────

export async function getAllPools(): Promise<Pool[]> {
  if (!CONTRACT_ADDRESS) return [];
  const client = getReadClient();
  const result = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_all_pools",
    args: [],
  });
  return (result as unknown as Pool[]) || [];
}

export async function getPool(poolId: string): Promise<Pool | null> {
  if (!CONTRACT_ADDRESS) return null;
  try {
    const client = getReadClient();
    return (await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_pool",
      args: [poolId],
    })) as unknown as Pool;
  } catch {
    return null;
  }
}

export async function getAllPolicies(): Promise<Policy[]> {
  if (!CONTRACT_ADDRESS) return [];
  const client = getReadClient();
  const result = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_all_policies",
    args: [],
  });
  return (result as unknown as Policy[]) || [];
}

export async function getPoliciesByHolder(holder: string): Promise<Policy[]> {
  if (!CONTRACT_ADDRESS || !holder) return [];
  const client = getReadClient();
  const result = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_policies_by_holder",
    args: [holder],
  });
  return (result as unknown as Policy[]) || [];
}

export async function getPolicy(policyId: string): Promise<Policy | null> {
  if (!CONTRACT_ADDRESS) return null;
  try {
    const client = getReadClient();
    return (await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_policy",
      args: [policyId],
    })) as unknown as Policy;
  } catch {
    return null;
  }
}

export async function getClaimsByPolicy(policyId: string): Promise<Claim[]> {
  if (!CONTRACT_ADDRESS) return [];
  const client = getReadClient();
  const result = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_claims_by_policy",
    args: [policyId],
  });
  return (result as unknown as Claim[]) || [];
}

export async function getAllClaims(): Promise<Claim[]> {
  if (!CONTRACT_ADDRESS) return [];
  const client = getReadClient();
  const result = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_all_claims",
    args: [],
  });
  return (result as unknown as Claim[]) || [];
}

export async function getClaim(claimId: string): Promise<Claim | null> {
  if (!CONTRACT_ADDRESS) return null;
  try {
    const client = getReadClient();
    return (await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_claim",
      args: [claimId],
    })) as unknown as Claim;
  } catch {
    return null;
  }
}

export async function getRecentVerdicts(limit = 20): Promise<Claim[]> {
  if (!CONTRACT_ADDRESS) return [];
  const client = getReadClient();
  const result = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_recent_verdicts",
    args: [limit],
  });
  return (result as unknown as Claim[]) || [];
}

export async function getDashboardStats(): Promise<DashboardStats | null> {
  if (!CONTRACT_ADDRESS) return null;
  const client = getReadClient();
  return (await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_dashboard_stats",
    args: [],
  })) as unknown as DashboardStats;
}

export async function getContractBalance(): Promise<string> {
  if (!CONTRACT_ADDRESS) return "0";
  const client = getReadClient();
  return (await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_contract_balance",
    args: [],
  })) as unknown as string;
}

// ─── WRITE METHODS (payable, require injected wallet) ────────────────────────
// value is always in wei (bigint). Callers should build it with parseGEN().

export async function createPool(
  provider: unknown,
  args: {
    pool_id: string;
    service_slug: string;
    covered_component: string;
    min_premium_bps: bigint;
    max_policy_payout: bigint;
    min_duration_seconds: bigint;
    max_duration_seconds: bigint;
  },
  depositWei: bigint
): Promise<{ hash: string }> {
  const client = getWriteClient();
  return (client as any).writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "create_pool",
    value: depositWei,
    args: [
      args.pool_id,
      args.service_slug,
      args.covered_component,
      args.min_premium_bps,
      args.max_policy_payout,
      args.min_duration_seconds,
      args.max_duration_seconds,
    ],
    provider,
  });
}

export async function depositToPool(
  provider: unknown,
  poolId: string,
  amountWei: bigint
): Promise<{ hash: string }> {
  const client = getWriteClient();
  return (client as any).writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "deposit_to_pool",
    value: amountWei,
    args: [poolId],
    provider,
  });
}

export async function withdrawAvailable(
  provider: unknown,
  poolId: string,
  amountWei: bigint,
  recipient: string
): Promise<{ hash: string }> {
  const client = getWriteClient();
  return (client as any).writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "withdraw_available",
    value: 0n,
    args: [poolId, amountWei, recipient],
    provider,
  });
}

export async function updatePoolStatus(
  provider: unknown,
  poolId: string,
  active: boolean
): Promise<{ hash: string }> {
  const client = getWriteClient();
  return (client as any).writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "update_pool_status",
    value: 0n,
    args: [poolId, active],
    provider,
  });
}

export async function buyPolicy(
  provider: unknown,
  args: {
    pool_id: string;
    policy_id: string;
    coverage_amount: bigint;
    duration_seconds: bigint;
  },
  premiumWei: bigint
): Promise<{ hash: string }> {
  const client = getWriteClient();
  return (client as any).writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "buy_policy",
    value: premiumWei,
    args: [args.pool_id, args.policy_id, args.coverage_amount, args.duration_seconds],
    provider,
  });
}

export async function expirePolicy(
  provider: unknown,
  policyId: string
): Promise<{ hash: string }> {
  const client = getWriteClient();
  return (client as any).writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "expire_policy",
    value: 0n,
    args: [policyId],
    provider,
  });
}

export async function submitClaim(
  provider: unknown,
  args: {
    policy_id: string;
    claim_id: string;
    evidence_url: string;
    incident_summary: string;
  }
): Promise<{ hash: string }> {
  const client = getWriteClient();
  return (client as any).writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "submit_claim",
    value: 0n,
    args: [args.policy_id, args.claim_id, args.evidence_url, args.incident_summary],
    provider,
  });
}

export async function resolveClaim(
  provider: unknown,
  claimId: string
): Promise<{ hash: string }> {
  const client = getWriteClient();
  return (client as any).writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "resolve_claim",
    value: 0n,
    args: [claimId],
    provider,
  });
}

/** Deterministic premium calculation, mirrors the contract's on-chain formula. */
export function calculatePremium(coverageAmountWei: bigint, minPremiumBps: bigint): bigint {
  return (coverageAmountWei * minPremiumBps) / 10000n;
}
