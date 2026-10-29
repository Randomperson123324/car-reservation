"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import { EASE } from "@/components/page-transition";
import { SORT_ORDERS, type SortOrder } from "@/lib/reservation";

// The round, icon-only button the toolbar beside the search bar uses.
export const ICON_BUTTON =
  "grid size-11 shrink-0 place-items-center rounded-full border bg-surface transition active:scale-95";

// A toolbar button that drops a floating menu, closed by a click outside or
// Escape. On a phone the menu spans the toolbar, which must be positioned, so
// it never runs off an edge.
export function ToolbarMenu({
  id,
  icon: Icon,
  label,
  active,
  badge = 0,
  align = "left",
  children,
}: {
  id: string;
  icon: LucideIcon;
  label: string;
  // Highlights the button while its filter is set.
  active?: boolean;
  // How many filters the menu has set, shown on the button.
  badge?: number;
  align?: "left" | "right";
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="sm:relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        aria-label={badge > 0 ? `${label} (${badge})` : label}
        title={label}
        onClick={() => setOpen((current) => !current)}
        className={`${ICON_BUTTON} relative ${
          open || active
            ? "border-brand-200 bg-brand-50 text-brand-700"
            : "border-line-strong text-ink-muted hover:bg-surface-hover hover:text-ink"
        }`}
      >
        <Icon size={20} aria-hidden />
        {badge > 0 && (
          <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-xs font-semibold text-white">
            {badge}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id={`${id}-menu`}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: EASE }}
            className={`absolute inset-x-0 z-30 mt-2 rounded-xl border border-line-strong bg-surface shadow-card-hover sm:inset-x-auto sm:top-full ${
              align === "right"
                ? "origin-top-right sm:right-0"
                : "origin-top-left sm:left-0"
            }`}
          >
            {children(() => setOpen(false))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Switches the list order, at the top of a filter menu.
export function SortOptions({
  id,
  value,
  onChange,
}: {
  id: string;
  value: SortOrder;
  onChange: (value: SortOrder) => void;
}) {
  return (
    <div>
      <p id={id} className="font-semibold text-ink">
        เรียงตาม
      </p>
      <div
        role="radiogroup"
        aria-labelledby={id}
        className="mt-2 flex gap-1 rounded-xl bg-surface-muted p-1"
      >
        {SORT_ORDERS.map((order) => {
          const selected = order === value;
          return (
            <button
              key={order}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(order)}
              className={`flex-1 rounded-lg px-3 py-2 font-semibold whitespace-nowrap transition-colors ${
                selected
                  ? "bg-surface text-brand-700 shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {order}
            </button>
          );
        })}
      </div>
    </div>
  );
}
