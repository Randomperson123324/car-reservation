"use client";

import { BookOpenText, Plus, Search } from "lucide-react";
import { TransitionLink } from "@/components/page-transition";

const HERO_BUTTON = "group btn px-9 py-5 text-xl font-bold";

// The three landing-page buttons.
export function HeroActions() {
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
    </>
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
