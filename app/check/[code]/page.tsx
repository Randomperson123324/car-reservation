import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { lookupReservationByCode } from "@/app/actions";
import { Reveal, SkeletonSwap } from "@/components/skeleton-swap";
import { ReservationCardSkeleton } from "@/components/skeletons";
import { PageHero, PageShell } from "@/components/page-shell";
import { ReservationCard } from "@/components/reservation-card";
import { normalizeCode } from "@/lib/reservation";

export const metadata: Metadata = { title: "ตรวจสอบการจอง" };

// Where the QR code on a reservation slip leads: the live status of that one
// booking. The page frame is static; the booking itself is looked up per
// request and streams in.
export default function ReservationPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  return (
    <PageShell>
      <PageHero
        title="ตรวจสอบ"
        accent="การจอง"
        subtitle="สถานะล่าสุดของการจองรถตามรหัสการจอง"
      />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-16 pt-2 sm:px-6">
        <SkeletonSwap skeleton={<ReservationCardSkeleton />}>
          <Suspense fallback={null}>
            <Reveal>
              <Status params={params} />
            </Reveal>
          </Suspense>
        </SkeletonSwap>
        <div className="mt-6 text-center">
          <Link href="/check" className="btn btn-outline">
            ค้นหาการจองอื่น
          </Link>
        </div>
      </main>
    </PageShell>
  );
}

async function Status({ params }: { params: Promise<{ code: string }> }) {
  const code = normalizeCode(decodeURIComponent((await params).code));
  const result = await lookupReservationByCode(code);
  const item = result.ok ? result.items[0] : undefined;

  if (item) {
    return (
      <div className="card animate-fade-up rounded-2xl p-5">
        <ReservationCard item={item} />
      </div>
    );
  }
  return (
    <div className="animate-fade-up rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center">
      <h3 className="text-ink">
        {result.ok ? "ไม่พบการจองรหัสนี้" : result.error}
      </h3>
      {result.ok && (
        <p className="mt-1 text-ink-muted">
          <span className="font-mono">{code}</span> — ตรวจสอบรหัสอีกครั้ง
          หรือค้นหาด้วยเบอร์ติดต่อ
        </p>
      )}
    </div>
  );
}
