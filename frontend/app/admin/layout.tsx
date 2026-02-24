"use client";

import { RequireRole } from "@/components/auth-guard";
import AdminSidebar from "@/components/admin-sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
      <div className="flex h-screen w-full overflow-hidden bg-[#f6f6f8]">
        {/* Sidebar */}
        <AdminSidebar />
        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto max-w-7xl p-6 lg:p-10">
            {children}
          </div>
        </main>
      </div>
    </RequireRole>
  );
}
