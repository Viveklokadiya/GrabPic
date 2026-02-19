"use client";

import { RequireRole } from "@/components/auth-guard";
import { RoleLayoutShell } from "@/components/role-layout";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/system", label: "System" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole allowedRoles={["SUPER_ADMIN"]}>
      <RoleLayoutShell title="Super Admin" navItems={NAV}>
        {children}
      </RoleLayoutShell>
    </RequireRole>
  );
}
