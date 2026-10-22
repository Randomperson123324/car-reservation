"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  CheckSquare,
  Filter,
  NotebookPen,
  Phone,
  Search,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { setReservationStatuses, type AdminDecision } from "@/app/actions";
import { AdminActions } from "@/components/admin-actions";
import { DatePicker } from "@/components/date-picker";
import { EASE } from "@/components/page-transition";
import { ReservationCard } from "@/components/reservation-card";
import { Select } from "@/components/select";
import {
  ADMIN_FILTERS,
  PROVINCES,
  STATUS_LABELS,
  TRIP_TYPES,
  tripTypeLabel,
  type AdminFilter,
  type AdminReservation,
  type Province,
} from "@/lib/reservation";

const SPRING = { type: "spring", stiffness: 300, damping: 30 } as const;

// The list slides in from the side of the tab it is headed toward, like the
// booking steps.
const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? "100%" : "-100%" }),
  center: {
    x: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 28 },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? "-100%" : "100%",
    transition: { duration: 0.2, ease: "easeIn" as const },
  }),
};

// Opens like the other collapsible panels, but lets the dropdowns inside
// spill out once it is open.
const panelMotion = {
  initial: { height: 0, opacity: 0, overflow: "hidden" },
  animate: {
    height: "auto",
    opacity: 1,
    transitionEnd: { overflow: "visible" },
  },
  exit: { height: 0, opacity: 0, overflow: "hidden" },
  transition: { duration: 0.3, ease: EASE },
} as const;

const SUBMITTED_AT = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});

const TRIP_LABELS = TRIP_TYPES.map((t) => t.label);
type TripLabel = (typeof TRIP_LABELS)[number];

type Filters = {
  query: string;
  province: Province | "";
  trip: TripLabel | "";
  from: string;
  to: string;
};

const NO_FILTERS: Filters = {
  query: "",
  province: "",
  trip: "",
  from: "",
  to: "",
};

function matches(item: AdminReservation, f: Filters) {
  const query = f.query.trim().toLowerCase();
  if (query) {
    const digits = query.replace(/\D/g, "");
    const inText = [
      item.code,
      item.requester_name,
      item.destination,
      item.department ?? "",
    ].some((value) => value.toLowerCase().includes(query));
    const inPhone = digits.length >= 3 && item.phone.includes(digits);
    if (!inText && !inPhone) return false;
  }
  if (f.province && item.province !== f.province) return false;
  if (f.trip && tripTypeLabel(item.trip_type) !== f.trip) return false;
  if (f.from && item.travel_date < f.from) return false;
  if (f.to && item.travel_date > f.to) return false;
  return true;
}

// Every booking arrives at once, so switching tabs, filtering and selecting
// all happen here without asking the server again.
export function AdminReservations({
  items,
  initialFilter,
  today,
}: {
  items: AdminReservation[];
  initialFilter: AdminFilter;
  today: string;
}) {
  const [tab, setTab] = useState<AdminFilter>(initialFilter);
  const [direction, setDirection] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [bulkError, setBulkError] = useState("");
  const [bulkPending, startBulk] = useTransition();
  const [deciding, setDeciding] = useState<AdminDecision | null>(null);

  function selectTab(next: AdminFilter) {
    if (next === tab) return;
    setDirection(
      ADMIN_FILTERS.indexOf(next) > ADMIN_FILTERS.indexOf(tab) ? 1 : -1,
    );
    setTab(next);
    // Keeps the tab on reload without asking the server for a new page.
    const url = next === "pending" ? "/admin" : `/admin?status=${next}`;
    window.history.replaceState(window.history.state, "", url);
  }

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  const activeFilters = (Object.keys(NO_FILTERS) as (keyof Filters)[]).filter(
    (key) => filters[key].trim() !== "",
  ).length;

  const filtered = items.filter((item) => matches(item, filters));
  // The calendars reach back to the earliest booking, not just today.
  const earliest = items.reduce(
    (min, r) => (r.travel_date < min ? r.travel_date : min),
    today,
  );
  const count = (f: AdminFilter) =>
    f === "all"
      ? filtered.length
      : filtered.filter((r) => r.status === f).length;
  const shown =
    tab === "all" ? filtered : filtered.filter((r) => r.status === tab);

  // A booking the user cancelled can no longer be decided on.
  const selectable = shown.filter((r) => r.status !== "cancelled");
  // Only what is on screen is acted on; ticks on other tabs stay but wait.
  const picked = selectable.filter((r) => selected.has(r.code));
  const allPicked =
    selectable.length > 0 && picked.length === selectable.length;

  function toggle(code: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function toggleAll() {
    setSelected((current) => {
      const next = new Set(current);
      for (const r of selectable) {
        if (allPicked) next.delete(r.code);
        else next.add(r.code);
      }
      return next;
    });
  }

  function stopSelecting() {
    setSelecting(false);
    setSelected(new Set());
    setBulkError("");
  }

  function decideAll(decision: AdminDecision) {
    setBulkError("");
    setDeciding(decision);
    startBulk(async () => {
      const result = await setReservationStatuses(
        picked.map((r) => r.code),
        decision,
      );
      setDeciding(null);
      if (!result.ok) {
        setBulkError(result.error);
        return;
      }
      setSelected(new Set());
    });
  }

  const spinner = (
    <span className="size-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
  );

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
        <p className="mr-auto text-ink-muted">
          {activeFilters > 0
            ? `พบ ${filtered.length} จาก ${items.length} รายการ`
            : `ทั้งหมด ${items.length} รายการ`}
        </p>
        <button
          type="button"
          aria-expanded={filtersOpen}
          aria-controls="admin-filters"
          onClick={() => setFiltersOpen((open) => !open)}
          className={`btn px-4 py-2 text-base ${
            filtersOpen || activeFilters > 0
              ? "border border-brand-200 bg-brand-50 text-brand-700"
              : "btn-outline"
          }`}
        >
          <Filter size={18} aria-hidden />
          ตัวกรอง
          {activeFilters > 0 && (
            <span className="rounded-full bg-brand-600 px-2 text-sm text-white">
              {activeFilters}
            </span>
          )}
        </button>
        <button
          type="button"
          aria-pressed={selecting}
          onClick={() => (selecting ? stopSelecting() : setSelecting(true))}
          className={`btn px-4 py-2 text-base ${
            selecting
              ? "border border-brand-200 bg-brand-50 text-brand-700"
              : "btn-outline"
          }`}
        >
          {selecting ? (
            <X size={18} aria-hidden />
          ) : (
            <CheckSquare size={18} aria-hidden />
          )}
          {selecting ? "ยกเลิกการเลือก" : "เลือก"}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {filtersOpen && (
          <motion.div id="admin-filters" key="filters" {...panelMotion}>
            <div className="card mb-4 grid items-start gap-4 rounded-2xl p-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="filter-query" className="font-semibold text-ink">
                  ค้นหา
                </label>
                <div className="relative mt-2">
                  <Search
                    size={18}
                    aria-hidden
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle"
                  />
                  <input
                    id="filter-query"
                    type="search"
                    placeholder="รหัสการจอง ชื่อ เบอร์ติดต่อ หรือสถานที่"
                    value={filters.query}
                    onChange={(e) => setFilter("query", e.target.value)}
                    className="field pl-10"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="filter-province"
                  className="font-semibold text-ink"
                >
                  จังหวัด
                </label>
                <div className="mt-2">
                  <Select
                    id="filter-province"
                    options={PROVINCES}
                    value={filters.province}
                    onChange={(value) => setFilter("province", value)}
                    placeholder="ทุกจังหวัด"
                    clearable
                  />
                </div>
              </div>
              <div>
                <label htmlFor="filter-trip" className="font-semibold text-ink">
                  รูปแบบการเดินทาง
                </label>
                <div className="mt-2">
                  <Select
                    id="filter-trip"
                    options={TRIP_LABELS}
                    value={filters.trip}
                    onChange={(value) => setFilter("trip", value)}
                    placeholder="ทุกรูปแบบ"
                    clearable
                  />
                </div>
              </div>
              <div>
                <label htmlFor="filter-from" className="font-semibold text-ink">
                  วันเดินทาง ตั้งแต่
                </label>
                <div className="mt-2">
                  <DatePicker
                    id="filter-from"
                    today={today}
                    min={earliest}
                    max={filters.to || undefined}
                    value={filters.from}
                    onChange={(date) => setFilter("from", date)}
                    placeholder="ไม่กำหนด"
                    defaultOpen={false}
                    clearable
                  />
                </div>
              </div>
              <div>
                <label htmlFor="filter-to" className="font-semibold text-ink">
                  ถึง
                </label>
                <div className="mt-2">
                  <DatePicker
                    id="filter-to"
                    today={today}
                    min={filters.from || earliest}
                    value={filters.to}
                    onChange={(date) => setFilter("to", date)}
                    placeholder="ไม่กำหนด"
                    defaultOpen={false}
                    clearable
                  />
                </div>
              </div>
              {activeFilters > 0 && (
                <div className="flex justify-end sm:col-span-2">
                  <button
                    type="button"
                    onClick={() => setFilters(NO_FILTERS)}
                    className="btn btn-ghost px-4 py-2 text-base"
                  >
                    <X size={18} aria-hidden />
                    ล้างตัวกรอง
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        role="tablist"
        aria-label="กรองตามสถานะ"
        className="mb-5 flex flex-wrap gap-2 rounded-xl bg-surface-muted p-1.5"
      >
        {ADMIN_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={tab === f}
            onClick={() => selectTab(f)}
            className={`relative isolate inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 font-semibold transition-colors duration-300 ${
              tab === f ? "text-white" : "text-ink-muted hover:text-ink"
            }`}
          >
            {tab === f && (
              <motion.span
                layoutId="admin-tab"
                transition={SPRING}
                className="absolute inset-0 -z-10 rounded-lg bg-brand-600"
              />
            )}
            {f === "all" ? "ทั้งหมด" : STATUS_LABELS[f]}
            <span
              className={`rounded-full px-2 text-sm transition-colors duration-300 ${
                tab === f ? "bg-white/20" : "bg-surface"
              }`}
            >
              {count(f)}
            </span>
          </button>
        ))}
      </div>

      {/* Clips the horizontal slide so the outgoing list adds no scrollbar. */}
      <div className="-mx-4 overflow-x-clip px-4 sm:-mx-6 sm:px-6">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={tab}
            role="tabpanel"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            {shown.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center">
                <h3 className="text-ink">
                  {activeFilters > 0
                    ? "ไม่พบการจองที่ตรงกับตัวกรอง"
                    : "ไม่มีการจองในสถานะนี้"}
                </h3>
              </div>
            ) : (
              <ul className="space-y-3">
                {/* A booking whose new status leaves this tab shrinks away. */}
                <AnimatePresence initial={false}>
                  {shown.map((item) => {
                    const canPick = selecting && item.status !== "cancelled";
                    const isPicked = canPick && selected.has(item.code);
                    return (
                      <motion.li
                        key={item.code}
                        exit={{
                          opacity: 0,
                          height: 0,
                          marginTop: 0,
                          overflow: "hidden",
                        }}
                        transition={{ duration: 0.3 }}
                        // In select mode the whole card ticks its box.
                        onClick={canPick ? () => toggle(item.code) : undefined}
                        className={`flex items-start ${canPick ? "cursor-pointer" : ""}`}
                      >
                        <AnimatePresence initial={false}>
                          {selecting && (
                            <motion.div
                              key="tick"
                              initial={{ width: 0, opacity: 0 }}
                              animate={{ width: "auto", opacity: 1 }}
                              exit={{ width: 0, opacity: 0 }}
                              transition={{ duration: 0.25, ease: EASE }}
                              className="shrink-0 overflow-hidden"
                            >
                              <div className="pr-3 pt-5">
                                <input
                                  type="checkbox"
                                  aria-label={`เลือกการจอง ${item.code}`}
                                  disabled={!canPick}
                                  checked={isPicked}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={() => toggle(item.code)}
                                  className="size-5 cursor-pointer accent-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <div className="min-w-0 flex-1">
                          <AdminReservationCard
                            item={item}
                            selecting={selecting}
                            picked={isPicked}
                          />
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bulk actions for the ticked bookings, docked to the bottom. */}
      <AnimatePresence>
        {selecting && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={SPRING}
            className="fixed inset-x-0 bottom-4 z-40 px-4"
          >
            <div className="card mx-auto flex max-w-4xl flex-wrap items-center gap-3 rounded-2xl p-3 shadow-card-hover sm:p-4">
              <label className="flex cursor-pointer items-center gap-2 font-semibold text-ink">
                <input
                  type="checkbox"
                  checked={allPicked}
                  disabled={selectable.length === 0}
                  onChange={toggleAll}
                  className="size-5 cursor-pointer accent-brand-600"
                />
                เลือกทั้งหมด
              </label>
              <span className="text-ink-muted">
                เลือกแล้ว {picked.length} รายการ
              </span>
              {bulkError && (
                <span
                  role="alert"
                  className="text-sm font-semibold text-brand-700"
                >
                  {bulkError}
                </span>
              )}
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  disabled={picked.length === 0 || bulkPending}
                  onClick={() => decideAll("rejected")}
                  className="btn btn-outline px-4 py-2 text-base"
                >
                  {deciding === "rejected" ? (
                    spinner
                  ) : (
                    <X size={18} aria-hidden />
                  )}
                  ไม่อนุมัติ
                </button>
                <button
                  type="button"
                  disabled={picked.length === 0 || bulkPending}
                  onClick={() => decideAll("approved")}
                  className="btn bg-green-600 px-4 py-2 text-base text-white hover:-translate-y-px hover:bg-green-700"
                >
                  {deciding === "approved" ? (
                    spinner
                  ) : (
                    <Check size={18} aria-hidden />
                  )}
                  อนุมัติ
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Room for the docked bar, so it never covers the last booking. */}
      {selecting && <div aria-hidden className="h-24" />}
    </>
  );
}

function AdminReservationCard({
  item,
  selecting,
  picked,
}: {
  item: AdminReservation;
  selecting: boolean;
  picked: boolean;
}) {
  return (
    <div
      className={`card rounded-2xl p-5 transition duration-200 hover:shadow-card-hover ${
        picked ? "border-brand-400 ring-2 ring-brand-400/40" : ""
      }`}
    >
      <ReservationCard item={item} />
      <dl className="mt-3 grid gap-2 border-t border-line pt-3 text-ink-muted sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <UserRound size={16} className="text-brand-600" aria-hidden />
          <dt className="sr-only">ผู้ขอใช้รถ</dt>
          <dd className="text-ink">
            {item.requester_name}
            {item.department && (
              <span className="text-ink-muted"> · {item.department}</span>
            )}
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <Phone size={16} className="text-brand-600" aria-hidden />
          <dt className="sr-only">เบอร์ติดต่อ</dt>
          <dd>
            <a
              href={`tel:${item.phone}`}
              className="text-ink underline-offset-2 hover:underline"
            >
              {item.phone}
            </a>
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <Users size={16} className="text-brand-600" aria-hidden />
          <dt className="sr-only">จำนวนผู้โดยสาร</dt>
          <dd>{item.passengers} คน</dd>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <dt>ส่งคำขอเมื่อ</dt>
          <dd>{SUBMITTED_AT.format(new Date(item.created_at))}</dd>
        </div>
        {item.note && (
          <div className="flex items-start gap-2 sm:col-span-2">
            <NotebookPen
              size={16}
              className="mt-1 shrink-0 text-brand-600"
              aria-hidden
            />
            <dt className="sr-only">หมายเหตุ</dt>
            <dd className="break-words">{item.note}</dd>
          </div>
        )}
      </dl>
      {/* While selecting, decisions go through the bar at the bottom. */}
      {!selecting && item.status !== "cancelled" && (
        <AdminActions code={item.code} status={item.status} />
      )}
    </div>
  );
}
