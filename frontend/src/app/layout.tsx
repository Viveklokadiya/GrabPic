import type { Metadata } from "next";
import { DM_Sans, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";

import NavigationLoader from "@/components/navigation-loader";
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
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block" rel="stylesheet" />
      </head>
      <body className={`${display.variable} ${body.variable} bg-app text-slate-900 antialiased`} suppressHydrationWarning>
        <Script id="strip-extension-attrs" strategy="beforeInteractive">
          {`(() => {
  const attrs = [
    "bis_skin_checked",
    "bis_register",
    "data-gr-ext-installed",
    "data-new-gr-c-s-check-loaded",
    "data-new-gr-c-s-loaded",
    "vsc-initialized"
  ];
  const cleanNode = (el) => {
    for (const attr of attrs) {
      if (el.hasAttribute(attr)) {
        el.removeAttribute(attr);
      }
    }
    for (const { name } of Array.from(el.attributes)) {
      if (name.startsWith("__processed_")) {
        el.removeAttribute(name);
      }
    }
  };
  cleanNode(document.documentElement);
  cleanNode(document.body);
  for (const el of document.querySelectorAll("*")) {
    cleanNode(el);
  }
})();`}
        </Script>
        <NavigationLoader />
        {children}
      </body>
    </html>
  );
}
