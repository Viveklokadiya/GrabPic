"use client";

import { RequireRole } from "@/components/auth-guard";

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole allowedRoles={["GUEST", "SUPER_ADMIN", "ADMIN"]}>
      {children}
    </RequireRole>
  );
}
