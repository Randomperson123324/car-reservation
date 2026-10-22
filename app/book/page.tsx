import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BookingWizard } from "@/components/booking-wizard";
import { PageShell } from "@/components/page-shell";
import { bangkokToday } from "@/lib/reservation";

export const metadata: Metadata = { title: "จองรถ" };

// Rendered per request so the earliest selectable date is always today.
async function Wizard() {
  await connection();
  return <BookingWizard today={bangkokToday()} />;
}

function WizardSkeleton() {
  return (
    <>
      <section className="bg-linear-to-b from-brand-100/40 to-transparent pt-16">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="skeleton mx-auto h-16 w-full max-w-xl rounded-2xl" />
        </div>
      </section>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 sm:px-6">
        <div className="skeleton mt-8 h-96 rounded-2xl" />
      </main>
    </>
  );
}

export default function BookPage() {
  return (
    <PageShell>
      <Suspense fallback={<WizardSkeleton />}>
        <Wizard />
      </Suspense>
    </PageShell>
  );
}
