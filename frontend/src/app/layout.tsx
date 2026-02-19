import type { Metadata } from "next";
import { DM_Sans, Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
});

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "GrabPic | Find your wedding photos instantly",
  description:
    "GrabPic helps photographers share event photos faster. Guests upload a selfie and instantly get My Photos from Drive or OneDrive.",
  openGraph: {
    title: "GrabPic | Find your wedding photos instantly",
    description:
      "Photographers upload to Drive. Guests upload a selfie. GrabPic auto-groups event photos by person.",
    type: "website",
    siteName: "GrabPic",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${display.variable} ${body.variable} bg-app text-slate-900 antialiased`}>{children}</body>
    </html>
  );
}
