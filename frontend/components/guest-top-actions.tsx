"use client";

import { useAuth } from "@/lib/use-auth";

export default function GuestTopActions() {
  const auth = useAuth();
  if (auth.isLoading || !auth.user) return null;

  return (
    <div className="fixed right-4 top-4 z-[70]">
      <button
        type="button"
        onClick={() => void auth.logout?.()}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-rose-200 hover:text-rose-600"
      >
        <span className="material-symbols-outlined text-[16px]">logout</span>
        Logout
      </button>
    </div>
  );
}
