"use client";

import { useAuth } from "@/lib/use-auth";

const navItems = [
  { href: "#how", label: "How it works" },
  { href: "#benefits", label: "Benefits" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function NavBar() {
  const auth = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex w-[min(1120px,92vw)] items-center justify-between gap-4 py-3">
        <a href="/" className="font-display text-xl font-semibold tracking-tight text-slate-950">
          GrabPic
        </a>
        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {auth.user ? (
            <a href="/dashboard" className="btn btn-secondary text-sm">
              Dashboard
            </a>
          ) : (
            <a href="/login" className="btn btn-secondary text-sm">
              Login
            </a>
          )}
          <a href="#waitlist" className="btn btn-primary text-sm">
            Join waitlist
          </a>
        </div>
      </div>
    </header>
  );
}
