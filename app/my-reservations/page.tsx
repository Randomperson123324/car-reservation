import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { StartBookingLink } from "@/components/cta";
import { MyReservationList } from "@/components/my-reservation-list";
import { PageHero, PageShell } from "@/components/page-shell";
import { Reveal, SkeletonSwap } from "@/components/skeleton-swap";
import { ReservationListSkeleton } from "@/components/skeletons";
import { getSessionUser } from "@/lib/auth";
import { bangkokToday, type ReservationSummary } from "@/lib/reservation";
import { getSupabaseAuth } from "@/lib/supabase";

export const metadata: Metadata = { title: "การจองของฉัน" };

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
        <SkeletonSwap skeleton={<ReservationListSkeleton />}>
          <Suspense fallback={null}>
            <Reveal>
              <List />
            </Reveal>
          </Suspense>
        </SkeletonSwap>
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
          "code, travel_date, trip_type, depart_time, arrive_time, return_time, province, destination, status, reject_reason, created_at",
        )
        .eq("user_id", user.id)
        .order("travel_date", { ascending: false })
        .order("depart_time", { ascending: false })
        .limit(100)
    : { data: null, error: null };
  if (error) console.error("my reservations failed", error);

  const items = (data ?? []) as (ReservationSummary & { created_at: string })[];

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

  return <MyReservationList items={items} today={bangkokToday()} />;
}
