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
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

type Pending = {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
  // Where the clicked link's icon + label sat on screen; the loading label
  // flies in from here.
  rect: DOMRect;
  // The page the link was clicked on, to tell when the route has changed.
  from?: string;
};

const PageTransitionContext = createContext<{
  pendingId: string | null;
  isTransitioning: boolean;
  beginTransition: (pending: Pending) => void;
}>({
  pendingId: null,
  isTransitioning: false,
  beginTransition: () => {},
});

// Whether the page-change overlay currently covers the screen.
export function usePageCovered() {
  return useContext(PageTransitionContext).isTransitioning;
}

// House easing curve, shared by every non-spring animation in the app.
export const EASE = [0.16, 1, 0.3, 1] as const;

const DISMISS_MS = 300;
const FLY_MS = 550;
const MIN_VISIBLE_MS = 550;
const HARD_TIMEOUT_MS = 4000;

export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [dismissing, setDismissing] = useState(false);
  const [startedAt, setStartedAt] = useState(0);

  const beginTransition = (next: Pending) => {
    setPending({ ...next, from: window.location.pathname });
    setDismissing(false);
    setStartedAt(Date.now());
    // TransitionLink disables Next's own scroll-to-top so the page doesn't
    // jump under the flying label; reset scroll once the white overlay is
    // opaque enough to hide it.
    setTimeout(() => window.scrollTo(0, 0), 200);
  };

  // The overlay fades out while dismissing; unmount it afterwards.
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
            from={pending.from}
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
            <FlyIn key={pending.id} from={pending.rect}>
              <motion.div
                animate={
                  dismissing
                    ? { opacity: 0, scale: 0.85 }
                    : { opacity: 1, scale: 1 }
                }
                transition={{ duration: DISMISS_MS / 1000 }}
                className="flex flex-col items-center gap-4 font-display font-bold text-brand-600"
              >
                <pending.icon size={56} aria-hidden />
                <span className="text-3xl sm:text-4xl">{pending.label}</span>
              </motion.div>
            </FlyIn>
            {/* Outside the flying element so its scaling doesn't stretch it. */}
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

// Flies its content from the clicked link's spot to where it is laid out.
// Measured before paint, so the label never shows at the centre first. It
// replaces a shared layoutId: that also made a link fly back into place when
// Next restored the page it was clicked on.
function FlyIn({ from, children }: { from: DOMRect; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const to = el.getBoundingClientRect();
    const x = from.left + from.width / 2 - (to.left + to.width / 2);
    const y = from.top + from.height / 2 - (to.top + to.height / 2);
    const scale = to.width ? from.width / to.width : 1;
    // A Web Animation shows its first frame before the next paint, so the
    // label starts on the link rather than flashing at the centre first.
    const flight = el.animate(
      [
        { transform: `translate(${x}px, ${y}px) scale(${scale})` },
        { transform: "none" },
      ],
      { duration: FLY_MS, easing: `cubic-bezier(${EASE.join(", ")})` },
    );
    return () => flight.cancel();
  }, [from]);
  return <div ref={ref}>{children}</div>;
}

// Starts dismissing the overlay once the destination route has mounted, with
// a minimum visible duration (so fast navigations don't flash) and a hard
// timeout (so a failed navigation can never leave the screen stuck white).
// Its own component, inside <Suspense>, because reading the pathname suspends
// on routes with dynamic params and must not hold up the whole layout.
function DismissOnArrival({
  href,
  from,
  startedAt,
  onDismiss,
}: {
  href: string;
  from?: string;
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
    // Any new page counts as arrival, so a redirect (e.g. to the login page)
    // doesn't leave the overlay up until the hard timeout.
    const arrived = pathname === href.split("?")[0] || pathname !== from;
    if (!arrived) return;
    const remaining = Math.max(150, MIN_VISIBLE_MS - (Date.now() - startedAt));
    const timer = setTimeout(dismiss, remaining);
    return () => clearTimeout(timer);
  }, [pathname, href, from, startedAt]);

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
  const id = useId();
  const content = useRef<HTMLSpanElement>(null);
  const { pendingId, isTransitioning, beginTransition } = useContext(
    PageTransitionContext,
  );
  const flying = pendingId === id;

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
        const rect = content.current?.getBoundingClientRect();
        if (!rect) return;
        beginTransition({ id, href, label, icon: Icon, rect });
      }}
    >
      <motion.span
        ref={content}
        // Leaves at once as its copy flies off; fades back in afterwards.
        animate={{ opacity: flying ? 0 : 1 }}
        transition={{ duration: flying ? 0 : 0.3 }}
        className={`inline-flex items-center ${gapClassName}`}
      >
        <Icon size={iconSize} className={iconClassName} aria-hidden />
        {label}
      </motion.span>
    </Link>
  );
}
