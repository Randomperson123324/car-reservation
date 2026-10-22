"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Hash, Phone, Plus, Search, type LucideIcon } from "lucide-react";
import { lookupReservationByCode, lookupReservations } from "@/app/actions";
import { EASE, TransitionLink } from "@/components/page-transition";
import { ReservationCard } from "@/components/reservation-card";
import type { ReservationSummary } from "@/lib/reservation";

const listVariants = {
  show: { transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

type Mode = "phone" | "code";

const MODES: {
  id: Mode;
  tab: string;
  icon: LucideIcon;
  label: string;
  placeholder: string;
  emptyTitle: string;
  emptyHint: string;
}[] = [
  {
    id: "phone",
    tab: "เบอร์ติดต่อ",
    icon: Phone,
    label: "เบอร์ติดต่อที่ใช้จอง",
    placeholder: "08x-xxx-xxxx",
    emptyTitle: "ไม่พบการจองของเบอร์นี้",
    emptyHint: "ตรวจสอบเบอร์อีกครั้ง หรือเริ่มจองรถใหม่",
  },
  {
    id: "code",
    tab: "รหัสการจอง",
    icon: Hash,
    label: "รหัสการจองที่ได้รับ",
    placeholder: "STIN-XXXXXX",
    emptyTitle: "ไม่พบการจองรหัสนี้",
    emptyHint: "ตรวจสอบรหัสอีกครั้ง หรือเริ่มจองรถใหม่",
  },
];

export function CheckForm() {
  const [mode, setMode] = useState<Mode>("phone");
  // The mode of the search whose results are on screen.
  const [searched, setSearched] = useState<Mode>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [items, setItems] = useState<ReservationSummary[] | null>(null);
  const [pending, startTransition] = useTransition();

  function search() {
    setError("");
    startTransition(async () => {
      const result =
        mode === "code"
          ? await lookupReservationByCode(code)
          : await lookupReservations(phone);
      setSearched(mode);
      if (result.ok) {
        setItems(result.items);
      } else {
        setItems(null);
        setError(result.error);
      }
    });
  }

  const current = MODES.find((m) => m.id === mode) ?? MODES[0];
  const empty = MODES.find((m) => m.id === searched) ?? MODES[0];

  return (
    <div>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          search();
        }}
        className="card animate-fade-up rounded-2xl p-6 [animation-delay:200ms]"
      >
        <div className="mb-5 flex gap-2 rounded-xl bg-surface-muted p-1.5">
          {MODES.map(({ id, tab, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={mode === id}
              onClick={() => {
                setMode(id);
                setError("");
              }}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 font-semibold transition-colors ${
                mode === id
                  ? "bg-brand-600 text-white"
                  : "text-ink-muted hover:bg-surface-hover hover:text-ink"
              }`}
            >
              <Icon className="size-4" aria-hidden />
              {tab}
            </button>
          ))}
        </div>
        <label htmlFor="lookup" className="font-semibold text-ink">
          {current.label}
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          {mode === "code" ? (
            <input
              id="lookup"
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder={current.placeholder}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              aria-invalid={!!error}
              className="field font-mono tracking-wider"
            />
          ) : (
            <input
              id="lookup"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder={current.placeholder}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-invalid={!!error}
              className="field"
            />
          )}
          <button
            type="submit"
            disabled={pending}
            className="btn btn-primary shrink-0"
          >
            {pending ? (
              <span className="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <Search size={20} aria-hidden />
            )}
            ค้นหา
          </button>
        </div>
        <AnimatePresence>
          {error && (
            <motion.p
              role="alert"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="overflow-hidden text-sm font-semibold text-brand-700"
            >
              <span className="block pt-2">{error}</span>
            </motion.p>
          )}
        </AnimatePresence>
      </form>

      <div className="mt-6">
        {pending ? (
          <div className="space-y-3" aria-hidden>
            {[1, 2].map((i) => (
              <div key={i} className="card space-y-3 rounded-2xl p-5">
                <div className="flex justify-between">
                  <div className="skeleton h-5 w-24 rounded" />
                  <div className="skeleton h-6 w-24 rounded-full" />
                </div>
                <div className="skeleton h-6 w-1/2 rounded" />
                <div className="skeleton h-4 w-3/4 rounded" />
              </div>
            ))}
          </div>
        ) : items && items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center"
          >
            <h3 className="text-ink">{empty.emptyTitle}</h3>
            <p className="mt-1 text-ink-muted">{empty.emptyHint}</p>
            <TransitionLink
              href="/book"
              label="จองรถ"
              icon={Plus}
              iconSize={20}
              iconClassName="transition-transform duration-300 group-hover:rotate-90"
              className="group btn btn-outline mt-6"
            />
          </motion.div>
        ) : items ? (
          <motion.ul
            variants={listVariants}
            initial="hidden"
            animate="show"
            className="space-y-3"
          >
            {items.map((item) => (
              <motion.li
                key={item.code}
                variants={itemVariants}
                className="card rounded-2xl p-5 transition-shadow duration-200 hover:shadow-card-hover"
              >
                <ReservationCard item={item} />
              </motion.li>
            ))}
          </motion.ul>
        ) : null}
      </div>
    </div>
  );
}
