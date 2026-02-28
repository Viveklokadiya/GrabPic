"use client";

import { useCallback, useState } from "react";

import PhotographerSidebar from "@/components/photographer-sidebar";
import { RequireRole } from "@/components/auth-guard";

export default function PhotographerLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <RequireRole allowedRoles={["PHOTOGRAPHER", "SUPER_ADMIN", "ADMIN"]}>
      <div className="flex min-h-screen w-full flex-row overflow-hidden bg-slate-50">
        <PhotographerSidebar mobileOpen={sidebarOpen} onClose={closeSidebar} />
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm lg:hidden">
            <button
              type="button"
              onClick={openSidebar}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
              aria-label="Open navigation"
            >
              <span className="material-symbols-outlined text-[18px]">menu</span>
              Menu
            </button>
            <p className="text-sm font-semibold text-slate-800">Photographer Panel</p>
          </div>
          {children}
        </main>
      </div>
    </RequireRole>
  );
}
