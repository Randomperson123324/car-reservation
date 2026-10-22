"use client";

import Image from "next/image";
import { useMemo, useSyncExternalStore, type Ref } from "react";
import { Check, Hourglass } from "lucide-react";
import QRCode from "qrcode";
import {
  STATUS_LABELS,
  formatThaiDate,
  formatTime,
  tripTypeLabel,
  type ReservationInput,
} from "@/lib/reservation";
import footerLogo from "@/public/footer-logo.png";

const subscribeNever = () => () => {};

// The address a slip's QR code points at. NEXT_PUBLIC_SITE_URL pins it to the
// public site; without it the slip uses whatever address the page is on, which
// is only known in the browser ("" while rendering on the server).
function useVerificationUrl(code: string) {
  const pageOrigin = useSyncExternalStore(
    subscribeNever,
    () => window.location.origin,
    () => "",
  );
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || pageOrigin;
  return origin ? `${origin}/check/${encodeURIComponent(code)}` : "";
}

// Quiet zone around the code, in modules, as the QR specification asks for.
const QR_MARGIN = 2;

function QrCode({ value, label }: { value: string; label: string }) {
  const { size, path } = useMemo(() => {
    const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" });
    let d = "";
    for (let row = 0; row < modules.size; row++) {
      for (let col = 0; col < modules.size; col++) {
        if (modules.get(row, col)) {
          d += `M${col + QR_MARGIN} ${row + QR_MARGIN}h1v1h-1z`;
        }
      }
    }
    return { size: modules.size + QR_MARGIN * 2, path: d };
  }, [value]);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      className="size-36 bg-white"
    >
      <path d={path} fill="#000000" />
    </svg>
  );
}

function Tear() {
  return (
    <div aria-hidden className="border-t-2 border-dashed border-line-strong" />
  );
}

// A receipt-style summary of a new booking, with a QR code that opens the
// booking's status page.
export function ReservationSlip({
  code,
  sentDate,
  form,
  ref,
}: {
  code: string;
  // The day the request was sent, as YYYY-MM-DD in Bangkok time.
  sentDate: string;
  form: ReservationInput;
  ref?: Ref<HTMLDivElement>;
}) {
  const url = useVerificationUrl(code);
  const rows: [string, string][] = [
    ["วันเดินทาง", formatThaiDate(form.travelDate)],
    ["รูปแบบ", tripTypeLabel(form.tripType)],
    ["ออกเดินทาง", formatTime(form.departTime)],
    ["ถึงสถานที่", formatTime(form.arriveTime)],
  ];
  if (form.tripType === "drop_and_pick") {
    rows.push(["รับกลับ", formatTime(form.returnTime)]);
  }
  rows.push(["ผู้ใช้บริการ", form.name.trim()]);
  if (form.position) rows.push(["ตำแหน่ง", form.position]);
  rows.push(
    ["เบอร์ติดต่อ", form.phone.trim()],
    ["ผู้โดยสาร", `${form.passengers} คน`],
    ["จังหวัด", form.province],
    ["สถานที่", form.destination.trim()],
  );
  if (form.note.trim()) rows.push(["หมายเหตุ", form.note.trim()]);

  return (
    <div
      ref={ref}
      className="w-full space-y-5 rounded-b-2xl border border-t-0 border-line-strong bg-white px-6 pb-7 pt-8 text-left"
    >
      <div className="text-center">
        {/* Loaded eagerly and as the original file, so it is already in place
            when the slip is saved as an image. */}
        <Image
          src={footerLogo}
          alt="Srisavarindhira"
          loading="eager"
          unoptimized
          className="mx-auto mb-4 h-auto w-44 object-contain"
        />
        <p className="font-display text-sm font-semibold tracking-wide text-brand-600">
          ส่งคำขอเมื่อ {formatThaiDate(sentDate)}
        </p>
        <p className="font-display text-2xl font-bold text-ink">ใบจองรถ</p>
      </div>

      <div className="rounded-xl bg-brand-50 px-4 py-3 text-center">
        <p className="text-xs text-brand-700">รหัสการจอง</p>
        <p className="font-mono text-2xl font-bold tracking-widest text-brand-700">
          {code}
        </p>
      </div>

      {/* Where the request stands: sent, and now waiting on the next step. */}
      <ol>
        <li className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-600 text-white">
            <Check className="size-5" aria-hidden />
          </span>
          <span className="font-display text-lg font-bold text-ink">
            ส่งคำขอจองแล้ว
          </span>
        </li>
        <li
          aria-hidden
          className="ml-[19px] h-4 border-l-2 border-dashed border-line-strong"
        />
        <li className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
            <Hourglass className="size-5" aria-hidden />
          </span>
          <span className="font-display text-lg font-bold text-amber-700">
            <span className="sr-only">สถานะ: </span>
            {STATUS_LABELS.pending}
          </span>
        </li>
      </ol>

      <Tear />

      <dl className="space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="shrink-0 text-ink-muted">{label}</dt>
            <dd className="break-words text-right font-semibold text-ink">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <Tear />

      <div className="flex flex-col items-center gap-2 text-center">
        {url ? (
          <QrCode value={url} label={`คิวอาร์โค้ดตรวจสอบการจอง ${code}`} />
        ) : (
          <div className="size-36" />
        )}
        <p className="text-xs text-ink-muted">สแกนเพื่อตรวจสอบสถานะการจอง</p>
      </div>
    </div>
  );
}
