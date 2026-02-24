"use client";

import { RequireRole } from "@/components/auth-guard";
import GuestTopActions from "@/components/guest-top-actions";

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole allowedRoles={["GUEST", "SUPER_ADMIN", "ADMIN"]}>
      <>
        <GuestTopActions />
        {children}
      </>
    </RequireRole>
  );
}
