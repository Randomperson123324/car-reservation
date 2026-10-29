"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";
import { EASE, usePageCovered } from "@/components/page-transition";

const RevealContext = createContext<() => void>(() => {});

// How long the skeleton stays in view at least, once the page can be seen,
// so the swap reads as one motion instead of a flicker.
const MIN_SKELETON_MS = 350;
// How long the box takes to fit the real content.
const FIT_SECONDS = 0.35;

// Shows `skeleton` until the real content (a <Suspense fallback={null}>
// wrapping <Reveal>) has arrived and the skeleton has been on screen for a
// moment, then grows or shrinks the box from the skeleton's height to the
// content's while one fades into the other. Afterwards the box lets go, so
// later changes size it naturally.
export function SkeletonSwap({
  skeleton,
  children,
}: {
  skeleton: ReactNode;
  children: ReactNode;
}) {
  const skeletonRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  const [arrived, setArrived] = useState(false);
  const visibleSince = useRef<number | null>(null);
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState(false);
  const covered = usePageCovered();
  const reveal = useCallback(() => setArrived(true), []);

  useEffect(() => {
    // The skeleton only counts as seen once the page-change overlay is gone.
    if (covered) return;
    visibleSince.current ??= Date.now();
    if (!arrived || shown) return;
    const seen = Date.now() - visibleSince.current;
    const timer = setTimeout(
      () => setShown(true),
      Math.max(0, MIN_SKELETON_MS - seen),
    );
    return () => clearTimeout(timer);
  }, [covered, arrived, shown]);

  // Follows whichever of the two is in place, until the box lets go.
  useEffect(() => {
    if (done) return;
    const el = shown ? contentRef.current : skeletonRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setHeight(entry.borderBoxSize[0].blockSize),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [shown, done]);

  // Released on a timer rather than on animation end, since content as tall
  // as the skeleton gives the box nothing to animate.
  useEffect(() => {
    if (!shown) return;
    const timer = setTimeout(() => setDone(true), FIT_SECONDS * 1000 + 50);
    return () => clearTimeout(timer);
  }, [shown]);

  return (
    <RevealContext.Provider value={reveal}>
      <motion.div
        initial={false}
        animate={{ height: done ? "auto" : height }}
        transition={{ duration: FIT_SECONDS, ease: EASE }}
        // Clipped only while swapping, so dropdowns can hang out afterwards.
        className={done ? "" : "relative overflow-hidden"}
      >
        {!done && (
          <motion.div
            ref={skeletonRef}
            initial={false}
            animate={{ opacity: shown ? 0 : 1 }}
            transition={{ duration: 0.15, ease: "easeIn" }}
            // Out of the flow while fading, so only the content sizes the box.
            className={
              shown ? "pointer-events-none absolute inset-x-0 top-0" : ""
            }
            aria-hidden
          >
            {skeleton}
          </motion.div>
        )}
        <motion.div
          ref={contentRef}
          initial={false}
          animate={{ opacity: shown ? 1 : 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          // Laid out but unseen until shown, so its height can be measured.
          className={
            shown
              ? ""
              : "pointer-events-none invisible absolute inset-x-0 top-0"
          }
        >
          {children}
        </motion.div>
      </motion.div>
    </RevealContext.Provider>
  );
}

// The real content inside a SkeletonSwap's <Suspense>; tells it the content
// has arrived.
export function Reveal({ children }: { children: ReactNode }) {
  const reveal = useContext(RevealContext);
  useEffect(reveal, [reveal]);
  return children;
}
