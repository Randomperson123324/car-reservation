import type { Metadata } from "next";
import { CheckForm } from "@/components/check-form";
import { PageHero, PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "ตรวจสอบการจอง" };

export default function CheckPage() {
  return (
    <PageShell>
      <PageHero
        title="ตรวจสอบ"
        accent="การจอง"
        subtitle="ค้นหาด้วยเบอร์ติดต่อหรือรหัสการจอง เพื่อดูสถานะการจองรถของคุณ"
      />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-16 pt-2 sm:px-6">
        <CheckForm />
      </main>
    </PageShell>
  );
}
