"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpenText, Plus, Search, ShieldCheck } from "lucide-react";
import { EASE, TransitionLink } from "@/components/page-transition";

const HERO_BUTTON = "group btn px-9 py-5 text-xl font-bold";

// The landing-page buttons, plus an admin button once the visitor turns out
// to be an admin.
export function HeroActions({
  isAdminPromise,
}: {
  isAdminPromise: Promise<boolean>;
}) {
  // Resolved after hydration, so the row first renders without the admin
  // button and then makes room for it.
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let active = true;
    isAdminPromise.then(
      (admin) => active && setIsAdmin(admin),
      () => {},
    );
    return () => {
      active = false;
    };
  }, [isAdminPromise]);

  return (
    <>
      <TransitionLink
        href="/book"
        label="จองรถ"
        icon={Plus}
        iconSize={24}
        gapClassName="gap-3"
        iconClassName="transition-transform duration-300 group-hover:rotate-90"
        className={`${HERO_BUTTON} btn-primary`}
      />
      <TransitionLink
        href="/guidelines"
        label="แนวปฏิบัติ"
        icon={BookOpenText}
        iconSize={24}
        gapClassName="gap-3"
        iconClassName="transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110"
        className={`${HERO_BUTTON} btn-outline`}
      />
      <TransitionLink
        href="/check"
        label="ตรวจสอบการจอง"
        icon={Search}
        iconSize={24}
        gapClassName="gap-3"
        iconClassName="transition-transform duration-300 group-hover:scale-110"
        className={`${HERO_BUTTON} btn-outline`}
      />
      {isAdmin && <AdminButton />}
    </>
  );
}

const OPEN = { duration: 0.6, ease: EASE };
// The row's gap; in a row the opening slot starts by cancelling it, so the
// other buttons don't jump when the slot is added.
const ROW_GAP = 16;

// A slot opens up first, sliding the other buttons aside as it widens, then
// the button materialises in it with a red glow that bursts in and settles.
function AdminButton() {
  const [inRow] = useState(
    () => window.matchMedia("(min-width: 640px)").matches,
  );

  return (
    <motion.div
      initial={inRow ? { width: 0, marginLeft: -ROW_GAP } : { opacity: 0 }}
      animate={inRow ? { width: "auto", marginLeft: 0 } : { opacity: 1 }}
      transition={OPEN}
      className="relative isolate flex flex-col"
    >
      <motion.span
        aria-hidden
        initial={{ opacity: 0, scale: 0.2 }}
        animate={{ opacity: [0, 0.9, 0.45], scale: [0.2, 1.1, 1] }}
        transition={{ duration: 1.5, times: [0, 0.4, 1], ease: EASE }}
        className="pointer-events-none absolute -inset-1.5 -z-10 rounded-[1.75rem] bg-brand-500 blur-xl"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ delay: 0.6, duration: 0.55, ease: EASE }}
        className="flex w-full flex-col sm:w-max"
      >
        <TransitionLink
          href="/admin"
          label="ผู้ดูแลระบบ"
          icon={ShieldCheck}
          iconSize={24}
          gapClassName="gap-3"
          iconClassName="transition-transform duration-300 group-hover:scale-110"
          className={`${HERO_BUTTON} btn-outline border-brand-300`}
        />
      </motion.div>
    </motion.div>
  );
}

export function StartBookingLink() {
  return (
    <TransitionLink
      href="/book"
      label="เริ่มจองรถ"
      icon={Plus}
      iconSize={22}
      iconClassName="transition-transform duration-300 group-hover:rotate-90"
      className="group btn btn-primary"
    />
  );
}
