import Image from "next/image";
import { HeroActions } from "@/components/cta";
import { PageShell } from "@/components/page-shell";
import { getSessionUser } from "@/lib/auth";
import headerLogo from "@/public/header-logo.png";

export default function Home() {
  return (
    <PageShell>
      <main className="bg-linear-to-b from-brand-100/40 to-transparent flex flex-1 flex-col items-center justify-center px-4 pb-20 pt-28 text-center sm:px-6">
        <Image
          src={headerLogo}
          alt="สภากาชาดไทย · Srisavarindhira"
          priority
          className="animate-fade-up h-auto w-52 object-contain sm:w-56"
        />

        <h1 className="animate-fade-up mt-6 text-[clamp(3.25rem,11vw,8rem)] font-bold leading-[1.15] text-ink [animation-delay:100ms]">
          ระบบจองรถ
          <span className="block text-brand-600">สถาบัน</span>
        </h1>

        <p className="animate-fade-up mt-4 max-w-2xl text-xl font-semibold text-ink-muted [animation-delay:200ms] sm:text-2xl">
          กรุงเทพมหานครและปริมณฑล 7 จังหวัด
        </p>

        <div className="animate-fade-up mt-10 flex w-full flex-col justify-center gap-4 [animation-delay:300ms] sm:w-auto sm:flex-row">
          <HeroActions
            isAdminPromise={getSessionUser().then((user) => !!user?.isAdmin)}
          />
        </div>
      </main>
    </PageShell>
  );
}
