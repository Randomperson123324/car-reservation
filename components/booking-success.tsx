"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, CircleAlert, Download, Search } from "lucide-react";
import { Collapse } from "@/components/collapse";
import { EASE, TransitionLink } from "@/components/page-transition";
import { ReservationSlip } from "@/components/reservation-slip";
import {
  formatThaiDate,
  formatTime,
  type ReservationInput,
} from "@/lib/reservation";

// The paper advances one line at a time, with a short pause between lines,
// like a receipt printer.
const PRINT_LINES = 16;
function printFeed(progress: number) {
  const line = Math.floor(progress * PRINT_LINES);
  const within = progress * PRINT_LINES - line;
  return Math.min(1, (line + Math.min(1, within * 1.6)) / PRINT_LINES);
}

export function BookingSuccess({
  code,
  sentDate,
  form,
}: {
  code: string;
  sentDate: string;
  form: ReservationInput;
}) {
  const slipRef = useRef<HTMLDivElement>(null);
  const [printed, setPrinted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  async function download() {
    if (!slipRef.current) return;
    setSaving(true);
    setSaveError(false);
    try {
      const { toPng } = await import("html-to-image");
      const image = await toPng(slipRef.current, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.href = image;
      link.download = `slip-${code}.png`;
      link.click();
    } catch (error) {
      console.error("slip download failed", error);
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="bg-linear-to-b from-brand-100/40 to-transparent pt-16">
        <div className="mx-auto max-w-4xl px-4 py-10 text-center sm:px-6">
          <h1 className="page-title text-ink">
            จองรถ<span className="text-brand-600">สถาบัน</span>
          </h1>
        </div>
      </section>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="card relative z-10 rounded-2xl p-8 pb-12 text-center sm:p-12 sm:pb-14"
        >
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 16,
              delay: 0.15,
            }}
            className="mx-auto grid size-16 place-items-center rounded-full bg-brand-600 text-white"
          >
            <Check size={32} aria-hidden />
          </motion.span>
          <h2 className="mt-6 text-ink">ส่งคำขอจองรถแล้ว</h2>
          <p className="mt-2 text-ink-muted">
            เจ้าหน้าที่จะตรวจสอบและติดต่อกลับตามเบอร์ที่ให้ไว้
          </p>

          <div className="mx-auto mt-8 max-w-xs rounded-2xl border border-dashed border-brand-300 bg-brand-50 px-6 py-5">
            <p className="text-sm text-brand-700">รหัสการจอง</p>
            <p className="mt-1 font-mono text-3xl font-bold tracking-widest text-brand-700">
              {code}
            </p>
          </div>

          <p className="mt-6 text-sm text-ink-muted">
            {formatThaiDate(form.travelDate)} · {formatTime(form.departTime)} ·{" "}
            {form.destination.trim()}
          </p>

          {/* The slot the slip is fed out of. */}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-4 mx-auto h-2.5 w-[calc(100%-3rem)] max-w-md rounded-full bg-ink shadow-[inset_0_2px_3px_rgb(0_0_0/0.6)]"
          />
        </motion.div>

        {/* Tucked under the card's bottom edge. The window grows while the
            slip stays pinned to its bottom, so the slip's lower edge comes
            out first and the rest follows it down. */}
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: "auto" }}
          transition={{ duration: 3, ease: printFeed, delay: 0.9 }}
          onAnimationComplete={() => setPrinted(true)}
          className="relative mx-auto -mt-6 flex max-w-sm flex-col justify-end overflow-hidden px-3 pb-6"
        >
          <div className="shrink-0 rounded-b-2xl shadow-card-hover">
            <ReservationSlip
              ref={slipRef}
              code={code}
              sentDate={sentDate}
              form={form}
            />
          </div>
        </motion.div>

        <motion.div
          initial={false}
          animate={{ opacity: printed ? 1 : 0, y: printed ? 0 : 12 }}
          transition={{ duration: 0.4, ease: EASE }}
          className={printed ? "" : "pointer-events-none"}
        >
          <div className="mt-2 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={download}
              disabled={saving || !printed}
              className="btn btn-primary"
            >
              {saving ? (
                <span className="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <Download size={20} aria-hidden />
              )}
              ดาวน์โหลดสลิป
            </button>
            <TransitionLink
              href={`/check/${code}`}
              label="ตรวจสอบการจอง"
              icon={Search}
              iconSize={20}
              className="btn btn-outline"
            />
            <Link href="/" className="btn btn-ghost">
              กลับหน้าแรก
            </Link>
          </div>
          <Collapse open={saveError}>
            <p
              role="alert"
              className="flex items-center justify-center gap-2 pt-4 text-sm font-semibold text-brand-700"
            >
              <CircleAlert className="size-4 shrink-0" aria-hidden />
              ดาวน์โหลดสลิปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง
            </p>
          </Collapse>
        </motion.div>
      </main>
    </>
  );
}
