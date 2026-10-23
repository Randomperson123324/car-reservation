"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { setReservationStatus, type AdminDecision } from "@/app/actions";
import { Collapse } from "@/components/collapse";
import { REJECT_REASON_MAX } from "@/lib/reservation";

// Approve / reject buttons for one booking. Both are offered until a decision
// is made; afterwards only the opposite one, so a decision can be reversed.
// Rejecting asks for the reason first, which the requester is shown.
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
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  function decide(decision: AdminDecision) {
    setError("");
    setDeciding(decision);
    startTransition(async () => {
      const result = await setReservationStatus(code, decision, reason);
      setDeciding(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRejecting(false);
      setReason("");
    });
  }

  const spinner = (
    <span className="size-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
  );

  return (
    <div className="mt-4 border-t border-line pt-4">
      <Collapse open={rejecting}>
        {/* Room for the field's focus ring inside the clipped panel. */}
        <div className="-mx-1 px-1 pb-3 pt-1">
          <label
            htmlFor={`reject-${code}`}
            className="font-semibold text-ink"
          >
            หมายเหตุที่ไม่อนุมัติ
          </label>
          <textarea
            id={`reject-${code}`}
            rows={2}
            maxLength={REJECT_REASON_MAX}
            placeholder="เช่น ไม่มีรถว่างในวันดังกล่าว"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="field mt-2 resize-y"
          />
        </div>
      </Collapse>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {error && (
          <p
            role="alert"
            className="mr-auto text-sm font-semibold text-brand-700"
          >
            {error}
          </p>
        )}
        {rejecting ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setRejecting(false);
                setError("");
              }}
              className="btn btn-ghost px-4 py-2 text-base"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              disabled={pending || !reason.trim()}
              onClick={() => decide("rejected")}
              className="btn btn-primary px-4 py-2 text-base"
            >
              {deciding === "rejected" ? spinner : <X size={18} aria-hidden />}
              ยืนยันไม่อนุมัติ
            </button>
          </>
        ) : (
          <>
            {status !== "rejected" && (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setRejecting(true);
                  setError("");
                }}
                className="btn btn-outline px-4 py-2 text-base"
              >
                <X size={18} aria-hidden />
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
                {deciding === "approved" ? (
                  spinner
                ) : (
                  <Check size={18} aria-hidden />
                )}
                อนุมัติ
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
