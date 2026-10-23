"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Search } from "lucide-react";
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

type Kind = "phone" | "code";

const EMPTY: Record<Kind, { title: string; hint: string }> = {
  phone: {
    title: "ไม่พบการจองของเบอร์นี้",
    hint: "ตรวจสอบเบอร์อีกครั้ง หรือเริ่มจองรถใหม่",
  },
  code: {
    title: "ไม่พบการจองรหัสนี้",
    hint: "ตรวจสอบรหัสอีกครั้ง หรือเริ่มจองรถใหม่",
  },
};

// A booking code has letters, or is the six characters after the prefix; a
// phone number is only digits, and longer.
function kindOf(query: string): Kind {
  const compact = query.replace(/[^0-9A-Za-z]/g, "");
  return /[A-Za-z]/.test(compact) || compact.length === 6 ? "code" : "phone";
}

export function CheckForm() {
  const [query, setQuery] = useState("");
  // What the search whose results are on screen looked for.
  const [searched, setSearched] = useState<Kind>("phone");
  const [error, setError] = useState("");
  const [items, setItems] = useState<ReservationSummary[] | null>(null);
  const [pending, startTransition] = useTransition();

  function search() {
    setError("");
    if (!query.trim()) {
      setItems(null);
      setError("กรุณากรอกเบอร์ติดต่อหรือรหัสการจอง");
      return;
    }
    const kind = kindOf(query);
    startTransition(async () => {
      const result =
        kind === "code"
          ? await lookupReservationByCode(query)
          : await lookupReservations(query);
      setSearched(kind);
      if (result.ok) {
        setItems(result.items);
      } else {
        setItems(null);
        setError(result.error);
      }
    });
  }

  const empty = EMPTY[searched];

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
        <label htmlFor="lookup" className="font-semibold text-ink">
          เบอร์ติดต่อที่ใช้จอง หรือรหัสการจอง
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input
            id="lookup"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="08x-xxx-xxxx หรือ STIN-XXXXXX"
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
            aria-invalid={!!error}
            className="field"
          />
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
            <h3 className="text-ink">{empty.title}</h3>
            <p className="mt-1 text-ink-muted">{empty.hint}</p>
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
