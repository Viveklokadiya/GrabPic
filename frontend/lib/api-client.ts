import { getAuthSession } from "@/lib/auth-session";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1").replace(/\/$/, "");

type ErrorPayload = { error?: { message?: string } };

async function parse<T>(response: Response): Promise<T> {
  if (response.ok) return (await response.json()) as T;
  let message = `Request failed with ${response.status}`;
  try {
    const payload = (await response.json()) as ErrorPayload;
    if (payload?.error?.message) message = payload.error.message;
  } catch (_err) {
    // ignore
  }
  throw new Error(message);
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("Authorization")) {
    const session = getAuthSession();
    if (session?.token) {
      headers.set("Authorization", `Bearer ${session.token}`);
    }
  }
  const response = await fetch(`${API_BASE}${path.startsWith("/") ? path : `/${path}`}`, {
    ...options,
    headers,
    cache: options.cache || "no-store",
  });
  return parse<T>(response);
}
