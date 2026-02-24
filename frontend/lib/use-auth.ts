"use client";

import { useEffect, useMemo, useState } from "react";

import type { Role } from "@/lib/api";
import { getAuthMe, logoutCurrentSession } from "@/lib/api";
import { clearAuthSession, getAuthSession, setAuthSession } from "@/lib/auth-session";

export type AuthUser = {
  userId: string;
  email: string;
  name: string;
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
    setUser({ userId: session.userId, email: session.email, name: session.name, role: session.role });

    let cancelled = false;
    getAuthMe(session.token)
      .then((me) => {
        if (cancelled) return;
        setAuthSession({
          token: session.token,
          role: me.role,
          email: me.email,
          userId: me.user_id,
          name: me.name || me.email,
        });
        setUser({ userId: me.user_id, email: me.email, name: me.name || me.email, role: me.role });
      })
      .catch(() => {
        if (cancelled) return;
        clearAuthSession();
        setUser(null);
        setToken("");
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const role = user?.role || null;

  return useMemo(
    () => ({
      user,
      role,
      token,
      isLoading,
      logout: async (options?: { redirectTo?: string | false }) => {
        if (token) {
          try {
            await logoutCurrentSession(token);
          } catch (_err) {
            // Ignore backend logout errors and clear local state anyway.
          }
        }
        clearAuthSession();
        setUser(null);
        setToken("");
        const redirectTo = options?.redirectTo === false ? "" : String(options?.redirectTo || "/login");
        if (redirectTo && typeof window !== "undefined") {
          window.location.assign(redirectTo);
        }
      },
    }),
    [user, role, token, isLoading]
  );
}
