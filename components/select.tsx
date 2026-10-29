"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { EASE } from "@/components/page-transition";

// A form field that expands into a scrollable list of options.
export function Select<T extends string>({
  id,
  options,
  value,
  onChange,
  placeholder = "เลือก",
  clearable,
  invalid,
  dropUp,
}: {
  id: string;
  options: readonly T[];
  value: T | "";
  // Receives "" only from a `clearable` select.
  onChange: (value: T | "") => void;
  placeholder?: string;
  // Opens as a filter menu whose first choice, the placeholder, empties it.
  clearable?: boolean;
  invalid?: boolean;
  // Opens the list above the field, for a field near the bottom of the screen.
  dropUp?: boolean;
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
    <div className="relative" ref={ref}>
      <button
        id={id}
        type="button"
        role="combobox"
        aria-controls={`${id}-options`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={invalid}
        onClick={() => setOpen((current) => !current)}
        className="field flex items-center justify-between gap-3 text-left"
      >
        <span className={`truncate ${value ? "" : "text-ink-subtle"}`}>
          {value || placeholder}
        </span>
        <ChevronDown
          aria-hidden
          className={`size-5 shrink-0 text-ink-subtle transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {/* A filter opens as a menu like the sort menu, its "all" choice first
          and a dot by the current one. */}
      <AnimatePresence>
        {open && clearable && (
          <motion.div
            id={`${id}-options`}
            role="listbox"
            initial={{ opacity: 0, y: dropUp ? 6 : -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: dropUp ? 6 : -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: EASE }}
            className={`absolute inset-x-0 z-20 max-h-72 overflow-y-auto ${
              dropUp
                ? "bottom-full mb-2 origin-bottom"
                : "top-full mt-2 origin-top"
            } rounded-xl border border-line-strong bg-surface py-2 shadow-card-hover`}
          >
            {(["", ...options] as (T | "")[]).map((option) => {
              const selected = option === value;
              return (
                <button
                  key={option || "all"}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    if (!selected) onChange(option);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-hover ${
                    selected ? "font-semibold text-brand-700" : "text-ink"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`size-1.5 shrink-0 rounded-full ${
                      selected ? "bg-current" : ""
                    }`}
                  />
                  {option || placeholder}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
      {/* The outer element animates its height; the inner one owns the scroll
          cap, so a long list still scrolls once fully expanded. */}
      <AnimatePresence>
        {open && !clearable && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className={`absolute inset-x-0 z-20 overflow-hidden ${
              dropUp ? "bottom-full mb-2" : "top-full mt-2"
            } rounded-xl border border-line-strong bg-surface shadow-card-hover`}
          >
            <div
              id={`${id}-options`}
              role="listbox"
              className="max-h-72 overflow-y-auto py-2"
            >
              {options.map((option) => {
                const selected = option === value;
                return (
                  <button
                    key={option}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      if (!selected) onChange(option);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors ${
                      selected
                        ? "bg-brand-50 font-semibold text-brand-700"
                        : "text-ink hover:bg-surface-hover"
                    }`}
                  >
                    {option}
                    {selected && (
                      <Check className="size-4 shrink-0" aria-hidden />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
