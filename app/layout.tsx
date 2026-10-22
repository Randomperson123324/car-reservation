import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai, Kanit } from "next/font/google";
import { PageTransitionProvider } from "@/components/page-transition";
import "./globals.css";

const plexThai = IBM_Plex_Sans_Thai({
  variable: "--font-plex-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600"],
});

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["thai", "latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "ระบบจองรถสถาบัน",
    template: "%s · ระบบจองรถสถาบัน",
  },
  description:
    "จองรถสถาบันออนไลน์ สำหรับการเดินทางในกรุงเทพมหานครและปริมณฑล 7 จังหวัด",
  icons: { icon: "/icon-logo.png" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${plexThai.variable} ${kanit.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <PageTransitionProvider>{children}</PageTransitionProvider>
      </body>
    </html>
  );
}
