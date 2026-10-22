"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { setReservationStatus, type AdminDecision } from "@/app/actions";

// Approve / reject buttons for one booking. Both are offered until a decision
// is made; afterwards only the opposite one, so a decision can be reversed.
export function AdminActions({
  code,
  status,
}: {
  code: string;
  status: string;
}) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [deciding, setDeciding] = useState<AdminDecision | null>(null);

  function decide(decision: AdminDecision) {
    setError("");
    setDeciding(decision);
    startTransition(async () => {
      const result = await setReservationStatus(code, decision);
      if (!result.ok) setError(result.error);
      setDeciding(null);
    });
  }

  const spinner = (
    <span className="size-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
  );

  return (
    <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
      {error && (
        <p role="alert" className="mr-auto text-sm font-semibold text-brand-700">
          {error}
        </p>
      )}
      {status !== "rejected" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => decide("rejected")}
          className="btn btn-outline px-4 py-2 text-base"
        >
          {deciding === "rejected" ? spinner : <X size={18} aria-hidden />}
          ไม่อนุมัติ
        </button>
      )}
      {status !== "approved" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => decide("approved")}
          className="btn bg-green-600 px-4 py-2 text-base text-white hover:-translate-y-px hover:bg-green-700"
        >
          {deciding === "approved" ? spinner : <Check size={18} aria-hidden />}
          อนุมัติ
        </button>
      )}
    </div>
  );
}
