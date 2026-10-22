import { CalendarDays, Clock, MapPin } from "lucide-react";
import {
  STATUS_LABELS,
  formatThaiDate,
  formatTime,
  tripTypeLabel,
  type ReservationSummary,
} from "@/lib/reservation";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-brand-50 text-brand-700 border-brand-200",
  cancelled: "bg-surface-muted text-ink-muted border-line-strong",
};

// The body of one reservation: code, status, destination and trip details.
export function ReservationCard({ item }: { item: ReservationSummary }) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-sm font-semibold tracking-wider text-ink-muted">
          {item.code}
        </span>
        <span
          className={`rounded-full border px-3 py-1 text-sm font-semibold ${
            STATUS_STYLES[item.status] ?? STATUS_STYLES.cancelled
          }`}
        >
          {STATUS_LABELS[item.status] ?? item.status}
        </span>
      </div>
      <h3 className="mt-3 break-words text-xl text-ink">{item.destination}</h3>
      <dl className="mt-3 grid gap-2 text-ink-muted sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-brand-600" aria-hidden />
          <dt className="sr-only">วันเดินทาง</dt>
          <dd>{formatThaiDate(item.travel_date)}</dd>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-brand-600" aria-hidden />
          <dt className="sr-only">เวลา</dt>
          <dd>
            ออก {formatTime(item.depart_time)} · ถึง{" "}
            {formatTime(item.arrive_time)}
            {item.return_time && ` · รับกลับ ${formatTime(item.return_time)}`}
          </dd>
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          <MapPin size={16} className="text-brand-600" aria-hidden />
          <dt className="sr-only">รูปแบบและจังหวัด</dt>
          <dd>
            {tripTypeLabel(item.trip_type)} · {item.province}
          </dd>
        </div>
      </dl>
    </>
  );
}
