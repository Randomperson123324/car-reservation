import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminReservations } from "@/components/admin-reservations";
import { PageHero, PageShell } from "@/components/page-shell";
import { Reveal, SkeletonSwap } from "@/components/skeleton-swap";
import { ReservationListSkeleton } from "@/components/skeletons";
import { getSessionUser } from "@/lib/auth";
import {
  ADMIN_FILTERS,
  bangkokToday,
  type AdminFilter,
  type AdminReservation,
  type Driver,
  type Vehicle,
} from "@/lib/reservation";
import { getSupabaseAuth } from "@/lib/supabase";

export const metadata: Metadata = { title: "ผู้ดูแลระบบ" };

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
        <SkeletonSwap skeleton={<ReservationListSkeleton admin />}>
          <Suspense fallback={null}>
            <Reveal>
              <List searchParams={searchParams} />
            </Reveal>
          </Suspense>
        </SkeletonSwap>
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
  const filter = ADMIN_FILTERS.includes(status as AdminFilter)
    ? (status as AdminFilter)
    : "pending";

  // Only an admin can read every row; row-level security enforces it.
  const supabase = await getSupabaseAuth();
  if (!supabase) return <Notice title="เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" />;
  const [{ data, error }, vehicles, drivers] = await Promise.all([
    supabase
      .from("reservations")
      .select(
        "code, group_id, travel_date, trip_type, depart_time, arrive_time, return_time, province, destination, status, reject_reason, requester_name, department, phone, passengers, note, created_at, vehicle_id, driver_id",
      )
      .order("travel_date", { ascending: true })
      .order("depart_time", { ascending: true })
      .limit(500),
    supabase
      .from("vehicles")
      .select("id, plate, description, active")
      .order("plate"),
    supabase.from("drivers").select("id, name, phone, active").order("name"),
  ]);
  if (error) console.error("admin reservations failed", error);
  if (vehicles.error) console.error("vehicles failed", vehicles.error);
  if (drivers.error) console.error("drivers failed", drivers.error);
  if (!data) {
    return <Notice title="เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" />;
  }

  return (
    <AdminReservations
      items={data as AdminReservation[]}
      initialFilter={filter}
      today={bangkokToday()}
      fleet={{
        vehicles: (vehicles.data ?? []) as Vehicle[],
        drivers: (drivers.data ?? []) as Driver[],
      }}
    />
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
