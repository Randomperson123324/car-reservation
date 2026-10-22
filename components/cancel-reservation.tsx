"use client";

import { useState, useTransition } from "react";
import { CircleX } from "lucide-react";
import { cancelReservation } from "@/app/actions";

// Cancel button for one of the user's own bookings. Asks once more inline
// before cancelling, since it cannot be undone.
export function CancelReservation({ code }: { code: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function cancel() {
    setError("");
    startTransition(async () => {
      const result = await cancelReservation(code);
      if (!result.ok) setError(result.error);
      setConfirming(false);
    });
  }

  return (
    <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
      {error && (
        <p role="alert" className="mr-auto text-sm font-semibold text-brand-700">
          {error}
        </p>
      )}
      {confirming ? (
        <>
          <span className="mr-auto font-semibold text-ink">
            ยืนยันการยกเลิกการจองนี้?
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirming(false)}
            className="btn btn-ghost px-4 py-2 text-base"
          >
            ไม่ยกเลิก
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={cancel}
            className="btn btn-primary px-4 py-2 text-base"
          >
            {pending && (
              <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            ยืนยันยกเลิก
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => {
            setError("");
            setConfirming(true);
          }}
          className="btn btn-outline px-4 py-2 text-base"
        >
          <CircleX size={18} aria-hidden />
          ยกเลิกการจอง
        </button>
      )}
    </div>
  );
}
