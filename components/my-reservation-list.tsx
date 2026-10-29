"use client";

import { useState } from "react";
import { Filter, Search, X } from "lucide-react";
import { CancelReservation } from "@/components/cancel-reservation";
import { ReservationCard } from "@/components/reservation-card";
import { DatePicker } from "@/components/date-picker";
import { Select } from "@/components/select";
import { SortOptions, ToolbarMenu } from "@/components/toolbar-menu";
import {
  STATUS_LABELS,
  sortReservations,
  type ReservationSummary,
  type SortOrder,
} from "@/lib/reservation";

const CANCELLABLE = ["pending", "approved"];

const STATUS_OPTIONS = Object.values(STATUS_LABELS);
type StatusLabel = (typeof STATUS_OPTIONS)[number];

type Filters = {
  query: string;
  status: StatusLabel | "";
  from: string;
  to: string;
};

const NO_FILTERS: Filters = { query: "", status: "", from: "", to: "" };

function matches(item: ReservationSummary, f: Filters) {
  const query = f.query.trim().toLowerCase();
  if (
    query &&
    ![item.code, item.destination, item.province].some((value) =>
      value.toLowerCase().includes(query),
    )
  ) {
    return false;
  }
  if (f.status && STATUS_LABELS[item.status] !== f.status) return false;
  if (f.from && item.travel_date < f.from) return false;
  if (f.to && item.travel_date > f.to) return false;
  return true;
}

// The signed-in user's bookings, filtered here without asking the server.
export function MyReservationList({
  items,
  today,
}: {
  items: (ReservationSummary & { created_at: string })[];
  today: string;
}) {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [sort, setSort] = useState<SortOrder>("วันเดินทาง");

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  const activeFilters = (Object.keys(NO_FILTERS) as (keyof Filters)[]).filter(
    (key) => filters[key].trim() !== "",
  ).length;
  const shown = sortReservations(
    items.filter((item) => matches(item, filters)),
    sort,
  );
  // The calendars reach back to the earliest booking, not just today.
  const earliest = items.reduce(
    (min, r) => (r.travel_date < min ? r.travel_date : min),
    today,
  );

  return (
    <>
      <div className="relative mb-3 flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            size={18}
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle"
          />
          <input
            id="my-query"
            type="search"
            aria-label="ค้นหา"
            placeholder="รหัสการจอง หรือสถานที่"
            value={filters.query}
            onChange={(e) => setFilter("query", e.target.value)}
            className="field h-11 py-0 pl-10"
          />
        </div>
        <ToolbarMenu
          id="my-filters"
          icon={Filter}
          label="ตัวกรอง"
          active={activeFilters > 0}
          badge={activeFilters}
          align="right"
        >
          {() => (
            <div className="grid gap-4 p-5 sm:w-96">
              <SortOptions id="my-sort" value={sort} onChange={setSort} />
              <div>
                <label htmlFor="my-status" className="font-semibold text-ink">
                  สถานะ
                </label>
                <div className="mt-2">
                  <Select
                    id="my-status"
                    options={STATUS_OPTIONS}
                    value={filters.status}
                    onChange={(value) => setFilter("status", value)}
                    placeholder="ทุกสถานะ"
                    clearable
                  />
                </div>
              </div>
              <div>
                <label htmlFor="my-from" className="font-semibold text-ink">
                  วันเดินทาง ตั้งแต่
                </label>
                <div className="mt-2">
                  <DatePicker
                    id="my-from"
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
                <label htmlFor="my-to" className="font-semibold text-ink">
                  ถึง
                </label>
                <div className="mt-2">
                  <DatePicker
                    id="my-to"
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
                <div className="flex justify-end">
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
          )}
        </ToolbarMenu>
      </div>
      <p className="mb-4 text-ink-muted">
        {activeFilters > 0
          ? `พบ ${shown.length} จาก ${items.length} รายการ`
          : `ทั้งหมด ${items.length} รายการ`}
      </p>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center">
          <h3 className="text-ink">ไม่พบการจองที่ตรงกับตัวกรอง</h3>
        </div>
      ) : (
        <ul className="space-y-3">
          {shown.map((item) => (
            <li
              key={item.code}
              className="card animate-fade-up rounded-2xl p-5 transition-shadow duration-200 hover:shadow-card-hover"
            >
              <ReservationCard item={item} />
              {CANCELLABLE.includes(item.status) && (
                <CancelReservation code={item.code} />
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
