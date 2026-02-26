import type { Role } from "@/lib/api";

export type AuthSession = {
  userId: string;
  email: string;
  name: string;
  role: Role;
  token: string;
};

const KEY_TOKEN = "grabpic_access_token";
const KEY_ROLE = "grabpic_user_role";
const KEY_EMAIL = "grabpic_user_email";
const KEY_USER_ID = "grabpic_user_id";
const KEY_NAME = "grabpic_user_name";

export function setAuthSession(session: AuthSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_TOKEN, session.token);
  localStorage.setItem(KEY_ROLE, session.role);
  localStorage.setItem(KEY_EMAIL, session.email);
  localStorage.setItem(KEY_USER_ID, session.userId);
  localStorage.setItem(KEY_NAME, session.name);
}

export function getAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(KEY_TOKEN) || "";
  const role = (localStorage.getItem(KEY_ROLE) || "") as Role;
  const email = localStorage.getItem(KEY_EMAIL) || "";
  const userId = localStorage.getItem(KEY_USER_ID) || "";
  const name = localStorage.getItem(KEY_NAME) || "";
  if (!token || !role || !email || !userId) return null;
  return { token, role, email, userId, name };
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY_TOKEN);
  localStorage.removeItem(KEY_ROLE);
  localStorage.removeItem(KEY_EMAIL);
  localStorage.removeItem(KEY_USER_ID);
  localStorage.removeItem(KEY_NAME);
}

export function roleHomePath(role: Role): string {
  if (role === "SUPER_ADMIN") return "/photographer";
  if (role === "ADMIN") return "/photographer";
  if (role === "PHOTOGRAPHER") return "/photographer";
  return "/guest";
}
