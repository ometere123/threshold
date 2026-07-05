export type PolicyStatus = "active" | "claimed" | "paid" | "expired" | "cancelled";
export type ClaimStatus =
  | "submitted"
  | "approved"
  | "denied"
  | "insufficient_evidence"
  | "payout_queued"
  | "paid";

export type PayoutBand = "none" | "partial" | "full" | "manual_review";

export type ClaimVerdict =
  | "qualifying_outage"
  | "major_outage"
  | "minor_degradation"
  | "scheduled_maintenance"
  | "not_covered_component"
  | "outside_policy_window"
  | "insufficient_evidence"
  | "excluded_event"
  | "no_incident"
  | "";

export interface Pool {
  pool_id: string;
  owner: string;
  service_slug: string;
  covered_component: string;
  active: boolean;

  total_deposited: string;
  total_withdrawn: string;
  premiums_collected: string;
  claims_paid: string;
  reserved_exposure: string;
  pool_capital: string;
  available_capital: string;

  min_premium_bps: string;
  max_policy_payout: string;
  min_duration_seconds: string;
  max_duration_seconds: string;

  created_at: string;
  created_seq: number;
}

export interface Policy {
  policy_id: string;
  pool_id: string;
  holder: string;

  coverage_amount: string;
  premium_paid: string;
  start_ts: number;
  end_ts: number;

  service_slug: string;
  covered_component: string;
  status: PolicyStatus;

  created_at: string;
  created_seq: number;
}

export interface Claim {
  claim_id: string;
  policy_id: string;
  pool_id: string;
  claimant: string;

  evidence_url: string;
  incident_summary: string;

  status: ClaimStatus;

  verdict: ClaimVerdict;
  confidence: number;
  payout_amount: string;
  payout_band: PayoutBand;
  reason: string;

  submitted_at: string;
  submitted_seq: number;
  resolved_at: string;
  resolved_seq: number;
}

export interface DashboardStats {
  active_policies: number;
  open_claims: number;
  total_deposited: string;
  total_withdrawn: string;
  premiums_collected: string;
  claims_paid: string;
  reserved_exposure: string;
  pool_capital: string;
  available_capital: string;
  average_claim_confidence: number;
}

export const SERVICE_SLUGS = [
  { value: "status_page_uptime", label: "Status Page Uptime" },
  { value: "api_availability", label: "API Availability" },
  { value: "cdn_delivery", label: "CDN Delivery" },
  { value: "rpc_node_availability", label: "RPC Node Availability" },
  { value: "cloud_compute_availability", label: "Cloud Compute Availability" },
  { value: "payment_processor_uptime", label: "Payment Processor Uptime" },
  { value: "database_availability", label: "Database Availability" },
  { value: "other_hosted_service", label: "Other Hosted Service" },
];

export const VERDICT_LABELS: Record<ClaimVerdict, string> = {
  qualifying_outage: "Qualifying Outage",
  major_outage: "Major Outage",
  minor_degradation: "Minor Degradation",
  scheduled_maintenance: "Scheduled Maintenance",
  not_covered_component: "Not a Covered Component",
  outside_policy_window: "Outside Policy Window",
  insufficient_evidence: "Insufficient Evidence",
  excluded_event: "Excluded Event",
  no_incident: "No Incident Found",
  "": "Unresolved",
};

export const PAYOUT_BAND_LABELS: Record<PayoutBand, string> = {
  none: "No Payout",
  partial: "Partial Payout (50%)",
  full: "Full Payout (100%)",
  manual_review: "Manual Review",
};

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  submitted: "Submitted",
  approved: "Approved",
  denied: "Denied",
  insufficient_evidence: "Insufficient Evidence",
  payout_queued: "Payout Queued",
  paid: "Paid",
};

export const POLICY_STATUS_LABELS: Record<PolicyStatus, string> = {
  active: "Active",
  claimed: "Claim Pending",
  paid: "Paid Out",
  expired: "Expired",
  cancelled: "Cancelled",
};
