"use client";

import Link from "next/link";

import { useAuth } from "@/lib/use-auth";

export default function GuestTopActions() {
  const auth = useAuth();
  if (auth.isLoading || !auth.user) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[70] flex flex-col gap-2 sm:bottom-6 sm:right-6">
      {auth.user.role === "PHOTOGRAPHER" ? (
        <Link
          href="/photographer"
          className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary shadow-xl shadow-primary/10 transition hover:bg-primary/15"
        >
          <span className="material-symbols-outlined text-[16px]">switch_account</span>
          Photographer Mode
        </Link>
      ) : null}
      <button
        type="button"
        onClick={() => void auth.logout?.()}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xl shadow-slate-900/10 transition hover:border-primary/40 hover:text-primary/90"
      >
        <span className="material-symbols-outlined text-[16px]">logout</span>
        Logout
      </button>
    </div>
  );
}
