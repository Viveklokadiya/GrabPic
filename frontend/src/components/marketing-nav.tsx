"use client";

import Link from "next/link";
import { useState } from "react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function MarketingNav({ activePage = "" }: { activePage?: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-slate-200 bg-white/85 backdrop-blur-md px-6 py-4 md:px-10">
      <div className="flex items-center gap-3 text-slate-900">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </div>
        <Link href="/" className="text-xl font-bold tracking-tight">GrabPic</Link>
      </div>

      {/* Desktop Nav */}
      <nav className="hidden md:flex items-center gap-8">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm font-medium transition-colors ${
              activePage === link.label
                ? "text-primary"
                : "text-slate-600 hover:text-primary"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="hidden md:flex items-center gap-4">
        <Link href="/login" className="text-sm font-medium text-slate-900 hover:text-primary transition-colors">
          Login
        </Link>
        <Link
          href="/#waitlist"
          className="flex items-center justify-center rounded-lg h-10 px-5 bg-primary hover:bg-primary/90 transition-colors text-white text-sm font-bold shadow-lg shadow-primary/20"
        >
          Join Waitlist
        </Link>
      </div>

      {/* Mobile Toggle */}
      <button
        className="md:hidden p-2 text-slate-600"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
          {mobileOpen ? (
            <path d="M18 6L6 18M6 6l12 12" />
          ) : (
            <path d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-slate-200 shadow-lg md:hidden">
          <nav className="flex flex-col py-4 px-6 gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`py-2 text-sm font-medium transition-colors ${
                  activePage === link.label ? "text-primary" : "text-slate-600 hover:text-primary"
                }`}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <hr className="my-2 border-slate-100" />
            <Link href="/login" className="py-2 text-sm font-medium text-slate-600">Login</Link>
            <Link href="/#waitlist" className="mt-1 btn-marketing-primary text-center">Join Waitlist</Link>
          </nav>
        </div>
      )}
    </header>
  );
}
