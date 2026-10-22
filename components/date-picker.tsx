"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Collapse } from "@/components/collapse";
import { EASE } from "@/components/page-transition";
import { formatThaiDate } from "@/lib/reservation";

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const MONTH_NAMES = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];
const BUDDHIST_ERA_OFFSET = 543;
const YEARS_AHEAD = 2;
// Always six rows, so the calendar keeps its height from month to month.
const GRID_CELLS = 42;

// Dates are handled as "YYYY-MM-DD" strings (and UTC math) throughout, so the
// calendar never shifts a day because of the viewer's time zone.
type YearMonth = { year: number; month: number };

const pad = (n: number) => String(n).padStart(2, "0");
const toKey = (year: number, month: number, day: number) =>
  `${year}-${pad(month + 1)}-${pad(day)}`;
const parseYearMonth = (date: string): YearMonth => ({
  year: Number(date.slice(0, 4)),
  month: Number(date.slice(5, 7)) - 1,
});
const monthIndex = ({ year, month }: YearMonth) => year * 12 + month;

// The day grid slides left/right when the month changes.
const monthSlideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? "100%" : "-100%" }),
  center: {
    x: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 28 },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? "-100%" : "100%",
    // A click during the slide must not pick a day from the outgoing month.
    pointerEvents: "none" as const,
    transition: { duration: 0.2, ease: "easeIn" as const },
  }),
};

function Dropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: number; label: string; disabled?: boolean }[];
  value: number;
  onChange: (value: number) => void;
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
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-1 rounded-btn px-2 py-1 font-display text-xl font-bold text-ink transition hover:bg-surface-hover sm:text-2xl"
      >
        {options.find((option) => option.value === value)?.label}
        <ChevronDown
          aria-hidden
          className={`size-5 text-ink-subtle transition-transform duration-300 ${
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
            className="card absolute left-0 top-full z-20 mt-2 min-w-32 overflow-hidden rounded-2xl"
          >
            <div className="max-h-56 overflow-y-auto py-2">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={option.disabled}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`block w-full px-4 py-2 text-left font-semibold whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-30 ${
                    option.value === value
                      ? "bg-brand-50 text-brand-600"
                      : "text-ink-muted enabled:hover:bg-surface-hover enabled:hover:text-ink"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MonthCalendar({
  today,
  value,
  onSelect,
}: {
  today: string;
  value: string;
  onSelect: (date: string) => void;
}) {
  const first = parseYearMonth(today);
  const [view, setView] = useState<YearMonth>(() =>
    parseYearMonth(value || today),
  );
  const [direction, setDirection] = useState(1);

  const lastIndex = (first.year + YEARS_AHEAD) * 12 + 11;
  const canGoBack = monthIndex(view) > monthIndex(first);
  const canGoForward = monthIndex(view) < lastIndex;

  function show(target: YearMonth) {
    // Clamp into the bookable range (this month … end of the last year).
    const index = Math.min(
      Math.max(monthIndex(target), monthIndex(first)),
      lastIndex,
    );
    if (index === monthIndex(view)) return;
    setDirection(index > monthIndex(view) ? 1 : -1);
    setView({ year: Math.floor(index / 12), month: index % 12 });
  }

  const shift = (delta: number) => {
    const index = monthIndex(view) + delta;
    show({ year: Math.floor(index / 12), month: index % 12 });
  };

  const startPadding = new Date(Date.UTC(view.year, view.month, 1)).getUTCDay();
  const daysInMonth = new Date(
    Date.UTC(view.year, view.month + 1, 0),
  ).getUTCDate();

  const navButton =
    "grid size-10 place-items-center rounded-btn text-ink-muted transition enabled:hover:bg-surface-hover enabled:hover:text-ink disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center">
          <Dropdown
            label="เลือกเดือน"
            value={view.month}
            onChange={(month) => show({ year: view.year, month })}
            options={MONTH_NAMES.map((name, month) => ({
              value: month,
              label: name,
              disabled:
                monthIndex({ year: view.year, month }) < monthIndex(first),
            }))}
          />
          <Dropdown
            label="เลือกปี"
            value={view.year}
            onChange={(year) => show({ year, month: view.month })}
            options={Array.from({ length: YEARS_AHEAD + 1 }, (_, i) => ({
              value: first.year + i,
              label: String(first.year + i + BUDDHIST_ERA_OFFSET),
            }))}
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="เดือนก่อนหน้า"
            disabled={!canGoBack}
            onClick={() => shift(-1)}
            className={navButton}
          >
            <ChevronLeft className="size-6" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => {
              show(first);
              onSelect(today);
            }}
            className="rounded-btn bg-surface-muted px-4 py-2 font-display font-semibold text-ink transition hover:bg-surface-hover"
          >
            วันนี้
          </button>
          <button
            type="button"
            aria-label="เดือนถัดไป"
            disabled={!canGoForward}
            onClick={() => shift(1)}
            className={navButton}
          >
            <ChevronRight className="size-6" aria-hidden />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className="py-2 text-center font-display font-semibold text-ink-subtle"
          >
            {weekday}
          </div>
        ))}
      </div>

      {/* The -m-2/p-2 pair gives the selected day's scale + shadow room, so it
          isn't clipped flush against this box's edge. */}
      <div className="-m-2 overflow-hidden p-2">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={monthIndex(view)}
            custom={direction}
            variants={monthSlideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="grid grid-cols-7 gap-1"
          >
            {Array.from({ length: GRID_CELLS }, (_, cell) => {
              const day = cell - startPadding + 1;
              if (day < 1 || day > daysInMonth) {
                return <div key={cell} className="h-11 sm:h-14" />;
              }
              const date = toKey(view.year, view.month, day);
              const selected = date === value;
              const isToday = date === today;
              return (
                <button
                  key={cell}
                  type="button"
                  disabled={date < today}
                  aria-label={formatThaiDate(date)}
                  aria-pressed={selected}
                  onClick={() => onSelect(date)}
                  className={`h-11 rounded-btn font-display text-lg font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-30 sm:h-14 sm:text-xl ${
                    selected
                      ? "scale-105 bg-brand-600 text-white shadow-[0_8px_20px_-6px_rgb(220_38_38/0.5)]"
                      : isToday
                        ? "border-2 border-brand-300 text-brand-700 hover:bg-brand-50"
                        : "text-ink-muted enabled:hover:bg-surface-hover enabled:hover:text-ink"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// A date field that expands into a calendar and collapses once a day is picked.
export function DatePicker({
  id,
  today,
  value,
  onChange,
  invalid,
}: {
  id: string;
  today: string;
  value: string;
  onChange: (date: string) => void;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(!value);

  return (
    <div
      className={`rounded-2xl border bg-surface transition-colors duration-300 ${
        invalid
          ? "border-brand-500"
          : open
            ? "border-brand-300"
            : "border-line-strong"
      }`}
    >
      <button
        id={id}
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-calendar`}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition hover:bg-surface-hover"
      >
        <CalendarDays className="size-5 shrink-0 text-brand-600" aria-hidden />
        <span
          className={`flex-1 ${value ? "font-semibold text-ink" : "text-ink-subtle"}`}
        >
          {value ? formatThaiDate(value) : "เลือกวันเดินทาง"}
        </span>
        <ChevronDown
          aria-hidden
          className={`size-5 shrink-0 text-ink-subtle transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <Collapse open={open} fade={false}>
        <div id={`${id}-calendar`} className="border-t border-line p-4">
          <MonthCalendar
            today={today}
            value={value}
            onSelect={(date) => {
              onChange(date);
              setOpen(false);
            }}
          />
        </div>
      </Collapse>
    </div>
  );
}
