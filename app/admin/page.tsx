import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { NotebookPen, Phone, UserRound, Users } from "lucide-react";
import { AdminActions } from "@/components/admin-actions";
import { PageHero, PageShell } from "@/components/page-shell";
import { ReservationCard } from "@/components/reservation-card";
import { getSessionUser } from "@/lib/auth";
import { STATUS_LABELS, type ReservationSummary } from "@/lib/reservation";
import { getSupabaseAuth } from "@/lib/supabase";

export const metadata: Metadata = { title: "ผู้ดูแลระบบ" };

type AdminReservation = ReservationSummary & {
  requester_name: string;
  department: string | null;
  phone: string;
  passengers: number;
  note: string | null;
  created_at: string;
};

const FILTERS = ["pending", "approved", "rejected", "cancelled", "all"];

const SUBMITTED_AT = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});

// The page frame is static; the bookings are read per request, and only for
// an admin, and stream in.
export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <PageShell>
      <PageHero
        title="ผู้ดูแล"
        accent="ระบบ"
        subtitle="ตรวจสอบคำขอจองรถ และอนุมัติหรือไม่อนุมัติการจอง"
      />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-16 pt-2 sm:px-6">
        <Suspense fallback={<ListSkeleton />}>
          <List searchParams={searchParams} />
        </Suspense>
      </main>
    </PageShell>
  );
}

async function List({
  searchParams,
}: Pick<PageProps<"/admin">, "searchParams">) {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login?redirect=/admin");
  if (!user.isAdmin) {
    return (
      <Notice
        title="คุณไม่มีสิทธิ์เข้าถึงหน้านี้"
        hint="หน้านี้สำหรับผู้ดูแลระบบเท่านั้น"
      />
    );
  }

  const { status } = await searchParams;
  const filter =
    typeof status === "string" && FILTERS.includes(status) ? status : "pending";

  // Only an admin can read every row; row-level security enforces it.
  const supabase = await getSupabaseAuth();
  const { data, error } = supabase
    ? await supabase
        .from("reservations")
        .select(
          "code, travel_date, trip_type, depart_time, arrive_time, return_time, province, destination, status, requester_name, department, phone, passengers, note, created_at",
        )
        .order("travel_date", { ascending: true })
        .order("depart_time", { ascending: true })
        .limit(500)
    : { data: null, error: null };
  if (error) console.error("admin reservations failed", error);
  if (!data) {
    return <Notice title="เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" />;
  }

  const all = data as AdminReservation[];
  const count = (f: string) =>
    f === "all" ? all.length : all.filter((r) => r.status === f).length;
  const items =
    filter === "all" ? all : all.filter((r) => r.status === filter);

  return (
    <>
      <nav
        aria-label="กรองตามสถานะ"
        className="mb-5 flex flex-wrap gap-2 rounded-xl bg-surface-muted p-1.5"
      >
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "pending" ? "/admin" : `/admin?status=${f}`}
            aria-current={filter === f ? "page" : undefined}
            className={`inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 font-semibold transition-colors ${
              filter === f
                ? "bg-brand-600 text-white"
                : "text-ink-muted hover:bg-surface-hover hover:text-ink"
            }`}
          >
            {f === "all" ? "ทั้งหมด" : STATUS_LABELS[f]}
            <span
              className={`rounded-full px-2 text-sm ${
                filter === f ? "bg-white/20" : "bg-surface"
              }`}
            >
              {count(f)}
            </span>
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <Notice title="ไม่มีการจองในสถานะนี้" />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.code}
              className="card animate-fade-up rounded-2xl p-5 transition-shadow duration-200 hover:shadow-card-hover"
            >
              <ReservationCard item={item} />
              <dl className="mt-3 grid gap-2 border-t border-line pt-3 text-ink-muted sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <UserRound size={16} className="text-brand-600" aria-hidden />
                  <dt className="sr-only">ผู้ขอใช้รถ</dt>
                  <dd className="text-ink">
                    {item.requester_name}
                    {item.department && (
                      <span className="text-ink-muted">
                        {" "}
                        · {item.department}
                      </span>
                    )}
                  </dd>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-brand-600" aria-hidden />
                  <dt className="sr-only">เบอร์ติดต่อ</dt>
                  <dd>
                    <a
                      href={`tel:${item.phone}`}
                      className="text-ink underline-offset-2 hover:underline"
                    >
                      {item.phone}
                    </a>
                  </dd>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-brand-600" aria-hidden />
                  <dt className="sr-only">จำนวนผู้โดยสาร</dt>
                  <dd>{item.passengers} คน</dd>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <dt>ส่งคำขอเมื่อ</dt>
                  <dd>{SUBMITTED_AT.format(new Date(item.created_at))}</dd>
                </div>
                {item.note && (
                  <div className="flex items-start gap-2 sm:col-span-2">
                    <NotebookPen
                      size={16}
                      className="mt-1 shrink-0 text-brand-600"
                      aria-hidden
                    />
                    <dt className="sr-only">หมายเหตุ</dt>
                    <dd className="break-words">{item.note}</dd>
                  </div>
                )}
              </dl>
              {item.status !== "cancelled" && (
                <AdminActions code={item.code} status={item.status} />
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Notice({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="animate-fade-up rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center">
      <h3 className="text-ink">{title}</h3>
      {hint && <p className="mt-1 text-ink-muted">{hint}</p>}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="skeleton h-14 rounded-xl" />
      {[1, 2].map((i) => (
        <div key={i} className="card space-y-3 rounded-2xl p-5">
          <div className="flex justify-between">
            <div className="skeleton h-5 w-24 rounded" />
            <div className="skeleton h-6 w-24 rounded-full" />
          </div>
          <div className="skeleton h-6 w-1/2 rounded" />
          <div className="skeleton h-4 w-3/4 rounded" />
        </div>
      ))}
    </div>
  );
}
