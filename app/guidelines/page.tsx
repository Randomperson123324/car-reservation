import type { Metadata } from "next";
import { StartBookingLink } from "@/components/cta";
import { PageHero, PageShell } from "@/components/page-shell";
import { PROVINCES, TRIP_TYPES } from "@/lib/reservation";

export const metadata: Metadata = { title: "แนวปฏิบัติ" };

const NOTICE = [
  "หน่วยงานมีความจำเป็นต้องเก็บรวบรวมข้อมูลส่วนบุคคลของท่าน ได้แก่ ชื่อ–นามสกุล อีเมล หมายเลขโทรศัพท์ วัตถุประสงค์ในการใช้รถ และจำนวนผู้โดยสาร เพื่อใช้ในการบริหารจัดการระบบจองรถยนต์ การติดต่อประสานงาน และการจัดทำรายงานสถิติการใช้งาน",
  "ข้อมูลดังกล่าวจะถูกใช้เฉพาะเพื่อวัตถุประสงค์ในการให้บริการเท่านั้น โดยมีการกำหนดสิทธิ์การเข้าถึงข้อมูลเฉพาะเจ้าหน้าที่ที่เกี่ยวข้องตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562",
  "หากพบปัญหาในการใช้งาน ติดต่อหน่วยบริหารกายภาพและหอพัก โทร. 02 256 4092 ต่อ 2124",
];

export default function GuidelinesPage() {
  return (
    <PageShell>
      <PageHero
        title="แนว"
        accent="ปฏิบัติ"
        subtitle="ข้อควรทราบก่อนจองรถสถาบัน"
      />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-16 pt-2 sm:px-6">
        <section className="card animate-fade-up rounded-2xl p-6 [animation-delay:150ms]">
          <h3 className="text-ink">แบบขอใช้รถยนต์สถาบัน</h3>
          <div className="mt-3 space-y-4 leading-relaxed text-ink-muted">
            {NOTICE.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>

        <div className="animate-fade-up mt-6 grid gap-4 [animation-delay:300ms] sm:grid-cols-2">
          <section className="card rounded-2xl p-6">
            <h3 className="text-ink">รูปแบบการเดินทาง</h3>
            <ul className="mt-4 space-y-3">
              {TRIP_TYPES.map((trip) => (
                <li key={trip.id}>
                  <p className="font-semibold text-ink">{trip.label}</p>
                  <p className="text-sm text-ink-muted">{trip.desc}</p>
                </li>
              ))}
            </ul>
          </section>
          <section className="card rounded-2xl p-6">
            <h3 className="text-ink">
              พื้นที่ให้บริการ {PROVINCES.length} จังหวัด
            </h3>
            <ul className="mt-4 flex flex-wrap gap-2">
              {PROVINCES.map((province) => (
                <li
                  key={province}
                  className="rounded-full bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700"
                >
                  {province}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="mt-8">
          <StartBookingLink />
        </div>
      </main>
    </PageShell>
  );
}
