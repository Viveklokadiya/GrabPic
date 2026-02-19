"use client";

import { useEffect, useMemo, useState } from "react";

import type { Role } from "@/lib/api";
import { clearAuthSession, getAuthSession } from "@/lib/auth-session";

export type AuthUser = {
  userId: string;
  email: string;
  role: Role;
};

export function useAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const session = getAuthSession();
    if (!session) {
      setUser(null);
      setToken("");
      setIsLoading(false);
      return;
    }
    setToken(session.token);
    setUser({ userId: session.userId, email: session.email, role: session.role });
    setIsLoading(false);
  }, []);

  const role = user?.role || null;

  return useMemo(
    () => ({
      user,
      role,
      token,
      isLoading,
      logout: () => {
        clearAuthSession();
        setUser(null);
        setToken("");
      },
    }),
    [user, role, token, isLoading]
  );
}
