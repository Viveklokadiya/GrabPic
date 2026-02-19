"use client";

import { RequireRole } from "@/components/auth-guard";
import { RoleLayoutShell } from "@/components/role-layout";

const NAV = [
  { href: "/guest", label: "Events" },
  { href: "/guest/my-photos", label: "My Photos" },
];

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole allowedRoles={["GUEST", "SUPER_ADMIN"]}>
      <RoleLayoutShell title="Guest Portal" navItems={NAV} compactTopNav>
        {children}
      </RoleLayoutShell>
    </RequireRole>
  );
}
