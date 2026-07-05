"use client";

import type { ClaimStatus } from "@/lib/types";

const STEPS = [
  { key: "submitted", label: "Claim Submitted" },
  { key: "resolving", label: "Evidence Evaluated" },
  { key: "resolved", label: "Verdict Reached" },
  { key: "paid", label: "Payout Sent" },
];

function getStepIndex(status: ClaimStatus): number {
  if (status === "submitted") return 0;
  if (status === "approved" || status === "denied" || status === "insufficient_evidence") return 2;
  if (status === "payout_queued" || status === "paid") return 3;
  return 0;
}

export function SettlementRail({ status }: { status: ClaimStatus }) {
  const current = getStepIndex(status);
  const isDenied = status === "denied" || status === "insufficient_evidence";

  return (
    <div className="flex items-center gap-0 w-full">
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const isLast = i === STEPS.length - 1;

        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold border transition-all"
                style={{
                  background: done
                    ? "#16A34A"
                    : active
                    ? isDenied
                      ? "#DC2626"
                      : "#38BDF8"
                    : "#1F2937",
                  borderColor: done
                    ? "#16A34A"
                    : active
                    ? isDenied
                      ? "#DC2626"
                      : "#38BDF8"
                    : "#374151",
                  color: done || active ? "#07111F" : "#4B5563",
                }}
              >
                {done ? "✓" : active && !isDenied ? "●" : i + 1}
              </div>
              <span
                className="text-xs whitespace-nowrap font-mono"
                style={{
                  color: done ? "#16A34A" : active ? (isDenied ? "#DC2626" : "#38BDF8") : "#374151",
                }}
              >
                {active && isDenied && i === 2 ? "Claim Denied" : step.label}
              </span>
            </div>
            {!isLast && (
              <div
                className="flex-1 h-px mx-1 mt-[-16px]"
                style={{ background: done ? "#16A34A" : "#1F2937" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
