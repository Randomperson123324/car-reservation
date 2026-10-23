import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CancelReservation } from "@/components/cancel-reservation";
import { StartBookingLink } from "@/components/cta";
import { PageHero, PageShell } from "@/components/page-shell";
import { ReservationCard } from "@/components/reservation-card";
import { getSessionUser } from "@/lib/auth";
import type { ReservationSummary } from "@/lib/reservation";
import { getSupabaseAuth } from "@/lib/supabase";

export const metadata: Metadata = { title: "การจองของฉัน" };

const CANCELLABLE = ["pending", "approved"];

// The page frame is static; the signed-in user's bookings are read per
// request and stream in.
export default function MyReservationsPage() {
  return (
    <PageShell>
      <PageHero
        title="การจอง"
        accent="ของฉัน"
        subtitle="รายการจองรถทั้งหมดที่คุณส่งไว้ พร้อมสถานะล่าสุด"
      />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-16 pt-2 sm:px-6">
        <Suspense fallback={<ListSkeleton />}>
          <List />
        </Suspense>
      </main>
    </PageShell>
  );
}

async function List() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login?redirect=/my-reservations");

  // Row-level security already limits the table to the user's own rows; the
  // filter states the intent and uses the index.
  const supabase = await getSupabaseAuth();
  const { data, error } = supabase
    ? await supabase
        .from("reservations")
        .select(
          "code, travel_date, trip_type, depart_time, arrive_time, return_time, province, destination, status, reject_reason",
        )
        .eq("user_id", user.id)
        .order("travel_date", { ascending: false })
        .order("depart_time", { ascending: false })
        .limit(100)
    : { data: null, error: null };
  if (error) console.error("my reservations failed", error);

  const items = (data ?? []) as ReservationSummary[];

  if (!data || items.length === 0) {
    return (
      <div className="animate-fade-up rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center">
        <h3 className="text-ink">
          {data ? "คุณยังไม่มีการจองรถ" : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง"}
        </h3>
        {data && (
          <>
            <p className="mt-1 text-ink-muted">
              การจองที่ส่งหลังจากเข้าสู่ระบบจะแสดงที่นี่
            </p>
            <div className="mt-6">
              <StartBookingLink />
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item.code}
          className="card animate-fade-up rounded-2xl p-5 transition-shadow duration-200 hover:shadow-card-hover"
        >
          <ReservationCard item={item} />
          {CANCELLABLE.includes(item.status) && (
            <CancelReservation code={item.code} />
          )}
        </li>
      ))}
    </ul>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
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
