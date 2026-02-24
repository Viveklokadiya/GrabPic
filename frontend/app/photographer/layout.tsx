"use client";

import PhotographerSidebar from "@/components/photographer-sidebar";
import { RequireRole } from "@/components/auth-guard";

export default function PhotographerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole allowedRoles={["PHOTOGRAPHER", "SUPER_ADMIN", "ADMIN"]}>
      <div className="flex min-h-screen w-full flex-row overflow-hidden bg-slate-50">
        <PhotographerSidebar />
        <main className="flex flex-1 flex-col min-w-0 overflow-y-auto p-8">{children}</main>
      </div>
    </RequireRole>
  );
}
