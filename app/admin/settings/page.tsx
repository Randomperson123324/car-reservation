import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { FleetSettings } from "@/components/fleet-settings";
import { Reveal, SkeletonSwap } from "@/components/skeleton-swap";
import { PageHero, PageShell } from "@/components/page-shell";
import { getSessionUser } from "@/lib/auth";
import type { Driver, Vehicle } from "@/lib/reservation";
import { getSupabaseAuth } from "@/lib/supabase";

export const metadata: Metadata = { title: "ตั้งค่ารถและคนขับ" };

export default function AdminSettingsPage() {
  return (
    <PageShell>
      <PageHero
        title="ตั้งค่า"
        accent="รถและคนขับ"
        subtitle="รายการทะเบียนรถและคนขับที่เลือกได้เมื่ออนุมัติการจอง"
      />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-16 pt-2 sm:px-6">
        <Link href="/admin" className="btn btn-ghost mb-4 px-4 py-2 text-base">
          <ArrowLeft size={18} aria-hidden />
          กลับไปหน้าผู้ดูแลระบบ
        </Link>
        <SkeletonSwap skeleton={<div className="skeleton h-64 rounded-2xl" />}>
          <Suspense fallback={null}>
            <Reveal>
              <Lists />
            </Reveal>
          </Suspense>
        </SkeletonSwap>
      </main>
    </PageShell>
  );
}

async function Lists() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login?redirect=/admin/settings");
  if (!user.isAdmin) {
    return <Notice title="คุณไม่มีสิทธิ์เข้าถึงหน้านี้" />;
  }

  // Only an admin can read either table; row-level security enforces it.
  const supabase = await getSupabaseAuth();
  if (!supabase) return <Notice title="เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" />;
  const [vehicles, drivers] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id, plate, description, active")
      .order("plate"),
    supabase.from("drivers").select("id, name, phone, active").order("name"),
  ]);
  if (vehicles.error) console.error("vehicles failed", vehicles.error);
  if (drivers.error) console.error("drivers failed", drivers.error);
  if (!vehicles.data || !drivers.data) {
    return <Notice title="เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" />;
  }

  return (
    <FleetSettings
      vehicles={vehicles.data as Vehicle[]}
      drivers={drivers.data as Driver[]}
    />
  );
}

function Notice({ title }: { title: string }) {
  return (
    <div className="animate-fade-up rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center">
      <h3 className="text-ink">{title}</h3>
    </div>
  );
}
