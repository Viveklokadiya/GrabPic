"use client";

import { RequireRole } from "@/components/auth-guard";
import { RoleLayoutShell } from "@/components/role-layout";

const NAV = [
  { href: "/photographer", label: "Dashboard" },
  { href: "/photographer/events", label: "My Events" },
  { href: "/p/new", label: "Upload / Sync (Legacy)" },
];

export default function PhotographerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole allowedRoles={["PHOTOGRAPHER", "SUPER_ADMIN"]}>
      <RoleLayoutShell title="Photographer Studio" navItems={NAV}>
        {children}
      </RoleLayoutShell>
    </RequireRole>
  );
}
