import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";
import Link from "next/link";

import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "600", "700"]
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "GrabPic",
  description: "Local-first photo matching from public Google Drive events"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sora.variable} ${manrope.variable}`}>
        <div className="page-wrap font-[var(--font-body)]">
          <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="font-[var(--font-heading)] text-2xl font-semibold tracking-tight">
              GrabPic
            </Link>
            <nav className="flex items-center gap-2 text-sm">
              <Link href="/p/new" className="btn btn-secondary">
                Photographer
              </Link>
              <Link href="/admin" className="btn btn-secondary">
                Admin
              </Link>
              <span className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted">Guest by event link</span>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
