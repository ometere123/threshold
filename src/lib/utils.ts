import type { PolicyStatus, ClaimStatus, PayoutBand, ClaimVerdict } from "./types";

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

export function formatUnixTimestamp(ts: number): string {
  if (!ts) return "—";
  return formatDateTime(new Date(ts * 1000).toISOString());
}

export function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function shortenHash(hash: string): string {
  if (!hash || hash.length < 16) return hash;
  return `${hash.slice(0, 12)}…${hash.slice(-8)}`;
}

// ─── GEN (native token) amount helpers ────────────────────────────────────
// All on-chain amounts are u256 wei strings. 1 GEN = 10^18 wei.

export const WEI_PER_GEN = 10n ** 18n;

/** Parse a human GEN amount (e.g. "12.5") into wei as a bigint. */
export function parseGEN(value: string): bigint {
  const trimmed = value.trim();
  if (trimmed === "" || isNaN(Number(trimmed))) return 0n;
  const [whole, frac = ""] = trimmed.split(".");
  const fracPadded = (frac + "0".repeat(18)).slice(0, 18);
  const sign = whole.startsWith("-") ? -1n : 1n;
  const wholeAbs = whole.replace("-", "") || "0";
  return sign * (BigInt(wholeAbs) * WEI_PER_GEN + BigInt(fracPadded || "0"));
}

/** Format a wei amount (string or bigint) as a human GEN string, e.g. "12.5 GEN". */
export function formatGEN(amount: string | bigint | number): string {
  let wei: bigint;
  try {
    wei = typeof amount === "bigint" ? amount : BigInt(amount || 0);
  } catch {
    return "0 GEN";
  }
  const whole = wei / WEI_PER_GEN;
  const frac = wei % WEI_PER_GEN;
  if (frac === 0n) return `${whole.toLocaleString()} GEN`;
  const fracStr = frac.toString().padStart(18, "0").replace(/0+$/, "").slice(0, 4);
  return `${whole.toLocaleString()}${fracStr ? "." + fracStr : ""} GEN`;
}

/** Format a wei amount as a plain decimal GEN string (no suffix), for input fields. */
export function formatGENPlain(amount: string | bigint): string {
  let wei: bigint;
  try {
    wei = typeof amount === "bigint" ? amount : BigInt(amount || 0);
  } catch {
    return "0";
  }
  const whole = wei / WEI_PER_GEN;
  const frac = wei % WEI_PER_GEN;
  if (frac === 0n) return whole.toString();
  const fracStr = frac.toString().padStart(18, "0").replace(/0+$/, "");
  return `${whole.toString()}.${fracStr}`;
}

export function getPolicyStatusChip(status: PolicyStatus): string {
  const map: Record<PolicyStatus, string> = {
    active: "chip chip-active",
    claimed: "chip chip-claimed",
    paid: "chip chip-settled",
    expired: "chip chip-expired",
    cancelled: "chip chip-rejected",
  };
  return map[status] || "chip";
}

export function getClaimStatusChip(status: ClaimStatus): string {
  const map: Record<ClaimStatus, string> = {
    submitted: "chip chip-submitted",
    approved: "chip chip-settled",
    denied: "chip chip-rejected",
    insufficient_evidence: "chip chip-manual",
    payout_queued: "chip chip-resolving",
    paid: "chip chip-settled",
  };
  return map[status] || "chip";
}

export function getVerdictColor(verdict: ClaimVerdict): string {
  const good = ["qualifying_outage", "major_outage", "minor_degradation"];
  const bad = ["not_covered_component", "excluded_event", "no_incident"];
  const warn = ["insufficient_evidence", "outside_policy_window", "scheduled_maintenance"];
  if (good.includes(verdict)) return "#16A34A";
  if (bad.includes(verdict)) return "#DC2626";
  if (warn.includes(verdict)) return "#F59E0B";
  return "#64748B";
}

export function getPayoutBandColor(band: PayoutBand): string {
  const map: Record<PayoutBand, string> = {
    none: "#64748B",
    partial: "#F59E0B",
    full: "#16A34A",
    manual_review: "#F59E0B",
  };
  return map[band] || "#64748B";
}

export function formatVerdict(verdict: string): string {
  if (!verdict) return "Unresolved";
  return verdict
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function formatServiceSlug(slug: string): string {
  return slug
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function explorerTxUrl(hash: string): string {
  const base = process.env.NEXT_PUBLIC_EXPLORER_URL || "https://explorer-studio.genlayer.com";
  return `${base}/tx/${hash}`;
}
