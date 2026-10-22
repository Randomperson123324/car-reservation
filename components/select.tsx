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
}: {
  id: string;
  options: readonly T[];
  value: T | "";
  // Receives "" only from a `clearable` select.
  onChange: (value: T | "") => void;
  placeholder?: string;
  // Lets picking the current option again empty the field.
  clearable?: boolean;
  invalid?: boolean;
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
      {/* The outer element animates its height; the inner one owns the scroll
          cap, so a long list still scrolls once fully expanded. */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-line-strong bg-surface shadow-card-hover"
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
                      else if (clearable) onChange("");
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
