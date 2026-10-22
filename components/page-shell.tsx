import Image from "next/image";
import type { ReactNode } from "react";
import {
  Bus,
  CalendarDays,
  CarFront,
  Clock,
  Fuel,
  KeyRound,
  MapPin,
  Route,
  type LucideIcon,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { getSessionUser } from "@/lib/auth";
import footerLogo from "@/public/footer-logo.png";

export function Footer() {
  return (
    <footer className="flex flex-col items-center justify-center gap-4 border-t border-line py-8">
      <Image
        src={footerLogo}
        alt="Srisavarindhira"
        className="h-auto w-44 object-contain opacity-70"
      />
      <p className="text-center text-sm text-ink-subtle">ระบบจองรถสถาบัน</p>
    </footer>
  );
}

const WATERMARK_TILE = 280;
const WATERMARK_ICON = 40;

// One tile of the watermark: each icon's top-left corner and tilt in degrees.
const WATERMARK_ICONS: [LucideIcon, number, number, number][] = [
  [CarFront, 18, 22, -12],
  [MapPin, 126, 8, 10],
  [Clock, 220, 44, -8],
  [CalendarDays, 70, 112, 14],
  [Bus, 176, 128, -10],
  [Route, 14, 196, 8],
  [KeyRound, 116, 218, -14],
  [Fuel, 226, 212, 12],
];

// Faint line icons tiled behind every page, like the watermark on a printed
// form. It sits above the shell's background and below everything else.
function Watermark() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 size-full text-brand-600 opacity-[0.07]"
    >
      <defs>
        <pattern
          id="watermark"
          width={WATERMARK_TILE}
          height={WATERMARK_TILE}
          patternUnits="userSpaceOnUse"
        >
          {WATERMARK_ICONS.map(([Icon, x, y, tilt]) => (
            <g
              key={`${x}-${y}`}
              transform={`translate(${x} ${y}) rotate(${tilt} ${WATERMARK_ICON / 2} ${WATERMARK_ICON / 2})`}
            >
              <Icon size={WATERMARK_ICON} strokeWidth={1.5} />
            </g>
          ))}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#watermark)" />
    </svg>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-app">
      <Watermark />
      <Navbar userPromise={getSessionUser()} />
      {children}
      <Footer />
    </div>
  );
}

// Gradient title band shared by the sub-pages.
export function PageHero({
  title,
  accent,
  subtitle,
}: {
  title: string;
  accent: string;
  subtitle: string;
}) {
  return (
    <section className="bg-linear-to-b from-brand-100/40 to-transparent pt-16">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="page-title animate-fade-up text-ink">
          {title}
          <span className="text-brand-600">{accent}</span>
        </h1>
        <p className="animate-fade-up mt-2 text-lg text-ink-muted [animation-delay:100ms]">
          {subtitle}
        </p>
      </div>
    </section>
  );
}
