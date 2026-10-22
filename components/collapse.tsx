"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EASE } from "@/components/page-transition";

// Smooth expand/collapse: animates height between 0 and the content's natural
// height. Spacing must be padding inside `children` (not a margin on this
// element), otherwise the gap pops in instead of growing with the content.
export function Collapse({
  open,
  children,
  className = "",
  fade = true,
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
  // Dropdowns only grow and shrink; inline messages also fade.
  fade?: boolean;
}) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={fade ? { height: 0, opacity: 0 } : { height: 0 }}
          animate={fade ? { height: "auto", opacity: 1 } : { height: "auto" }}
          exit={fade ? { height: 0, opacity: 0 } : { height: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          className={`overflow-hidden ${className}`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
