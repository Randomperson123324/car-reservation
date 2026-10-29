"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { History, X } from "lucide-react";
import { EASE } from "@/components/page-transition";
import { CHANGELOG } from "@/lib/changelog";

const DAY = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const formatDay = (date: string) => DAY.format(new Date(`${date}T00:00:00Z`));

// A small footer link that opens the list of recent updates.
export function UpdateLog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-ink-subtle underline-offset-2 transition-colors hover:text-ink-muted hover:underline"
      >
        <History size={12} aria-hidden />
        บันทึกการอัปเดต · {formatDay(CHANGELOG[0].date)}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[90] grid place-items-center bg-ink/30 p-4"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="update-log-title"
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.25, ease: EASE }}
              onClick={(event) => event.stopPropagation()}
              className="card flex max-h-[70vh] w-full max-w-sm flex-col rounded-2xl"
            >
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <h2
                  id="update-log-title"
                  className="flex items-center gap-2 text-lg text-ink"
                >
                  <History size={18} className="text-brand-600" aria-hidden />
                  บันทึกการอัปเดต
                </h2>
                <button
                  type="button"
                  aria-label="ปิด"
                  autoFocus
                  onClick={() => setOpen(false)}
                  className="grid size-8 place-items-center rounded-full text-ink-subtle transition hover:bg-surface-hover hover:text-ink"
                >
                  <X size={16} aria-hidden />
                </button>
              </div>
              <ol className="space-y-4 overflow-y-auto px-5 py-4">
                {CHANGELOG.map((release) => (
                  <li key={release.date}>
                    <p>
                      <span className="rounded-full bg-brand-50 px-2 text-sm font-semibold text-brand-700">
                        {formatDay(release.date)}
                      </span>
                    </p>
                    <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-ink-muted">
                      {release.changes.map((change) => (
                        <li key={change}>{change}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
