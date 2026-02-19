"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import type { Role } from "@/lib/api";
import { roleHomePath } from "@/lib/auth-session";
import { useAuth } from "@/lib/use-auth";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (auth.isLoading) return;
    if (!auth.token || !auth.user) {
      router.replace("/login");
    }
  }, [auth.isLoading, auth.token, auth.user, router]);

  if (auth.isLoading) {
    return <div className="page-wrap text-sm text-muted">Checking session...</div>;
  }
  if (!auth.token || !auth.user) {
    return <div className="page-wrap text-sm text-muted">Redirecting to login...</div>;
  }
  return <>{children}</>;
}

export function RequireRole({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: Role[] }) {
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (auth.isLoading) return;
    if (!auth.token || !auth.user) {
      router.replace("/login");
      return;
    }
    if (!allowedRoles.includes(auth.user.role)) {
      router.replace("/403");
    }
  }, [auth.isLoading, auth.token, auth.user, allowedRoles, router]);

  if (auth.isLoading) {
    return <div className="page-wrap text-sm text-muted">Checking permissions...</div>;
  }
  if (!auth.token || !auth.user) {
    return <div className="page-wrap text-sm text-muted">Redirecting to login...</div>;
  }
  if (!allowedRoles.includes(auth.user.role)) {
    return (
      <div className="page-wrap text-sm text-muted">
        Access denied for role {auth.user.role}. Redirecting...
      </div>
    );
  }
  return <>{children}</>;
}

export function RoleRouter() {
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (auth.isLoading) return;
    if (!auth.user) {
      router.replace("/login");
      return;
    }
    router.replace(roleHomePath(auth.user.role));
  }, [auth.isLoading, auth.user, router]);

  return <div className="page-wrap text-sm text-muted">Routing to your dashboard...</div>;
}
