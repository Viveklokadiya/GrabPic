"use client";

import { RequireRole } from "@/components/auth-guard";

export default function LegacyPhotographerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole allowedRoles={["PHOTOGRAPHER", "SUPER_ADMIN", "ADMIN"]}>
      {children}
    </RequireRole>
  );
}
