"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, use, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpenText,
  LogIn,
  LogOut,
  Menu,
  Plus,
  Search,
  UserRoundCheck,
  X,
} from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { EASE, TransitionLink } from "@/components/page-transition";
import type { SessionUser } from "@/lib/auth";
import iconLogo from "@/public/icon-logo.png";

export const NAV_LINKS = [
  { href: "/book", label: "จองรถ", icon: Plus },
  { href: "/my-reservations", label: "การจองของฉัน", icon: UserRoundCheck },
  { href: "/guidelines", label: "แนวปฏิบัติ", icon: BookOpenText },
  { href: "/check", label: "ตรวจสอบการจอง", icon: Search },
];

// On a route with dynamic params the pathname is only known per request, so
// reading it suspends. The bar itself is in the fallback, with no link marked
// active, which keeps it in the prerendered shell.
export function Navbar({ userPromise }: { userPromise: UserPromise }) {
  return (
    <Suspense fallback={<NavbarView pathname="" userPromise={userPromise} />}>
      <NavbarWithPathname userPromise={userPromise} />
    </Suspense>
  );
}

// Who is signed in is only known per request, so it arrives as a promise and
// each place that shows it suspends on its own.
type UserPromise = Promise<SessionUser | null>;

function NavbarWithPathname({ userPromise }: { userPromise: UserPromise }) {
  return <NavbarView pathname={usePathname()} userPromise={userPromise} />;
}

function UserActions({
  userPromise,
  mobile = false,
  onNavigate,
}: {
  userPromise: UserPromise;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const user = use(userPromise);

  if (!user) {
    return (
      <Link
        href="/auth/login"
        onClick={onNavigate}
        className={`btn btn-primary ${mobile ? "w-full" : "px-5 py-2.5"}`}
      >
        <LogIn size={18} aria-hidden />
        เข้าสู่ระบบ
      </Link>
    );
  }

  return (
    <div className={mobile ? "flex flex-col gap-2" : "flex items-center gap-3"}>
      <div
        className={`items-center gap-2 rounded-lg border border-line bg-surface-muted px-3 py-1.5 ${
          mobile ? "flex" : "hidden xl:flex"
        }`}
      >
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
          {user.name.charAt(0).toUpperCase() || "U"}
        </span>
        <span
          className={`truncate font-semibold text-ink ${mobile ? "" : "max-w-[150px]"}`}
        >
          {user.name}
        </span>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          className={`flex items-center gap-1.5 rounded-btn px-3 py-2 font-semibold text-ink-muted transition hover:bg-brand-50 hover:text-brand-700 ${
            mobile ? "w-full" : ""
          }`}
        >
          <LogOut size={16} aria-hidden />
          ออกจากระบบ
        </button>
      </form>
    </div>
  );
}

function NavbarView({
  pathname,
  userPromise,
}: {
  pathname: string;
  userPromise: UserPromise;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = scrolled || menuOpen;

  return (
    // A layout root, since the bar is fixed: the links inside are measured
    // against it, not the page, so scrolling doesn't read as them moving.
    <motion.nav
      layoutRoot
      className={`fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,box-shadow] duration-300 ${
        solid
          ? "border-line bg-surface/95 shadow-card backdrop-blur-sm"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2">
          <Image
            src={iconLogo}
            alt=""
            className="size-8 object-contain transition-transform duration-300 group-hover:scale-110"
          />
          <span className="font-display text-2xl font-bold text-ink">
            จองรถ<span className="text-brand-600">สถาบัน</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map(({ href, label, icon }) => (
            <TransitionLink
              key={href}
              href={href}
              label={label}
              icon={icon}
              iconSize={21}
              className={`flex items-center rounded-btn border px-3 py-2.5 font-display text-lg font-semibold transition-colors ${
                pathname === href
                  ? "border-brand-200 bg-brand-50 text-brand-700"
                  : "border-transparent text-ink-muted hover:bg-surface-hover hover:text-ink"
              }`}
            />
          ))}
        </div>

        <div className="hidden lg:block">
          <Suspense
            fallback={<div className="skeleton h-11 w-36 rounded-btn" />}
          >
            <UserActions userPromise={userPromise} />
          </Suspense>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "ปิดเมนู" : "เปิดเมนู"}
          className="grid size-10 place-items-center rounded-btn text-ink-muted transition hover:bg-surface-hover hover:text-ink lg:hidden"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="overflow-hidden border-t border-line bg-surface lg:hidden"
          >
            <div className="space-y-1 px-4 py-4">
              {NAV_LINKS.map(({ href, label, icon }) => (
                <TransitionLink
                  key={href}
                  href={href}
                  label={label}
                  icon={icon}
                  iconSize={21}
                  gapClassName="gap-3"
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center rounded-btn px-4 py-3 font-display text-lg font-semibold transition-colors ${
                    pathname === href
                      ? "bg-brand-50 text-brand-700"
                      : "text-ink-muted hover:bg-surface-hover hover:text-ink"
                  }`}
                />
              ))}
              <div className="mt-2 border-t border-line pt-3">
                <Suspense
                  fallback={<div className="skeleton h-11 rounded-btn" />}
                >
                  <UserActions
                    userPromise={userPromise}
                    mobile
                    onNavigate={() => setMenuOpen(false)}
                  />
                </Suspense>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
