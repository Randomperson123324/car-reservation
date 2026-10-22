"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Suspense,
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useId,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

type Pending = { id: string; href: string; label: string; icon: LucideIcon };

const PageTransitionContext = createContext<{
  pendingId: string | null;
  isTransitioning: boolean;
  beginTransition: (pending: Pending) => void;
}>({ pendingId: null, isTransitioning: false, beginTransition: () => {} });

// House easing curve, shared by every non-spring animation in the app.
export const EASE = [0.16, 1, 0.3, 1] as const;

const DISMISS_MS = 300;
const MIN_VISIBLE_MS = 550;
const HARD_TIMEOUT_MS = 4000;

export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [dismissing, setDismissing] = useState(false);
  const [startedAt, setStartedAt] = useState(0);

  const beginTransition = (next: Pending) => {
    setPending(next);
    setDismissing(false);
    setStartedAt(Date.now());
    // TransitionLink disables Next's own scroll-to-top because it races with
    // the morph's start-position measurement; reset scroll once the white
    // overlay is opaque enough to hide the jump.
    setTimeout(() => window.scrollTo(0, 0), 200);
  };

  // The overlay drops its layoutId while dismissing so it plays a plain
  // fade-out instead of morphing back toward the link; unmount it afterwards.
  useEffect(() => {
    if (!dismissing) return;
    const timer = setTimeout(() => {
      setPending(null);
      setDismissing(false);
    }, DISMISS_MS);
    return () => clearTimeout(timer);
  }, [dismissing]);

  const isTransitioning = pending !== null && !dismissing;
  const pendingId = isTransitioning ? pending.id : null;

  return (
    <PageTransitionContext.Provider
      value={{ pendingId, isTransitioning, beginTransition }}
    >
      {children}

      {pending && !dismissing && (
        <Suspense fallback={null}>
          <DismissOnArrival
            href={pending.href}
            startedAt={startedAt}
            onDismiss={() => setDismissing(true)}
          />
        </Suspense>
      )}

      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[100] bg-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: isTransitioning ? 1 : 0 }}
        transition={{ duration: 0.35, ease: EASE }}
      />

      <AnimatePresence>
        {pending && (
          <div
            role="status"
            className="pointer-events-none fixed inset-0 z-[101] flex flex-col items-center justify-center gap-4"
          >
            <motion.div
              layoutId={dismissing ? undefined : pending.id}
              animate={
                dismissing
                  ? { opacity: 0, scale: 0.85 }
                  : { opacity: 1, scale: 1 }
              }
              transition={
                dismissing
                  ? { duration: DISMISS_MS / 1000 }
                  : { type: "spring", stiffness: 300, damping: 30 }
              }
              className="flex flex-col items-center gap-4 font-display font-bold text-brand-600"
            >
              <pending.icon size={56} aria-hidden />
              <span className="text-3xl sm:text-4xl">{pending.label}</span>
            </motion.div>
            {/* Outside the layoutId element so the morph doesn't stretch it. */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: dismissing ? 0 : 1 }}
              transition={{ duration: 0.2, delay: dismissing ? 0 : 0.25 }}
              className="size-8 animate-spin rounded-full border-2 border-brand-300 border-t-brand-600"
            />
          </div>
        )}
      </AnimatePresence>
    </PageTransitionContext.Provider>
  );
}

// Starts dismissing the overlay once the destination route has mounted, with
// a minimum visible duration (so fast navigations don't flash) and a hard
// timeout (so a failed navigation can never leave the screen stuck white).
// Its own component, inside <Suspense>, because reading the pathname suspends
// on routes with dynamic params and must not hold up the whole layout.
function DismissOnArrival({
  href,
  startedAt,
  onDismiss,
}: {
  href: string;
  startedAt: number;
  onDismiss: () => void;
}) {
  const pathname = usePathname();
  const dismiss = useEffectEvent(onDismiss);

  useEffect(() => {
    const hardTimeout = setTimeout(dismiss, HARD_TIMEOUT_MS);
    return () => clearTimeout(hardTimeout);
  }, []);

  useEffect(() => {
    if (pathname !== href) return;
    const remaining = Math.max(150, MIN_VISIBLE_MS - (Date.now() - startedAt));
    const timer = setTimeout(dismiss, remaining);
    return () => clearTimeout(timer);
  }, [pathname, href, startedAt]);

  return null;
}

// A link whose icon + label fly to the center of the screen and become the
// loading screen while the next page loads.
export function TransitionLink({
  href,
  label,
  icon: Icon,
  iconSize,
  className,
  gapClassName = "gap-2",
  iconClassName,
  onClick,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  iconSize: number;
  className: string;
  gapClassName?: string;
  iconClassName?: string;
  onClick?: () => void;
}) {
  const layoutId = `nav-transition-${useId()}`;
  const { pendingId, isTransitioning, beginTransition } = useContext(
    PageTransitionContext,
  );

  return (
    <Link
      href={href}
      scroll={false}
      className={className}
      onClick={(event) => {
        onClick?.();
        // Let the browser handle open-in-new-tab clicks without an overlay.
        if (event.metaKey || event.ctrlKey || event.shiftKey) return;
        if (isTransitioning) return;
        beginTransition({ id: layoutId, href, label, icon: Icon });
      }}
    >
      <motion.span
        layoutId={layoutId}
        animate={{ opacity: pendingId === layoutId ? 0 : 1 }}
        transition={{ duration: 0.3 }}
        className={`inline-flex items-center ${gapClassName}`}
      >
        <Icon size={iconSize} className={iconClassName} aria-hidden />
        {label}
      </motion.span>
    </Link>
  );
}
