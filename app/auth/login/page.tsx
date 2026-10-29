import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { PageShell } from "@/components/page-shell";
import { safeRedirect } from "@/lib/auth";
import { Reveal, SkeletonSwap } from "@/components/skeleton-swap";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

async function Form({
  searchParams,
}: Pick<PageProps<"/auth/login">, "searchParams">) {
  const { redirect, error } = await searchParams;
  return (
    <AuthForm
      redirectTo={safeRedirect(redirect)}
      initialError={
        error === "auth_error"
          ? "ลิงก์ยืนยันไม่ถูกต้องหรือหมดอายุ กรุณาลองใหม่อีกครั้ง"
          : ""
      }
    />
  );
}

export default function LoginPage({ searchParams }: PageProps<"/auth/login">) {
  return (
    <PageShell>
      <main className="bg-linear-to-b from-brand-100/40 to-transparent flex flex-1 items-center justify-center px-4 pb-16 pt-28 sm:px-6">
        <div className="w-full max-w-md">
          <SkeletonSwap
            skeleton={<div className="skeleton h-96 rounded-2xl" />}
          >
            <Suspense fallback={null}>
              <Reveal>
                <Form searchParams={searchParams} />
              </Reveal>
            </Suspense>
          </SkeletonSwap>
        </div>
      </main>
    </PageShell>
  );
}
