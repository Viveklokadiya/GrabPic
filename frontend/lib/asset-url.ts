const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1").replace(/\/$/, "");
const BACKEND_BASE = API_BASE.replace(/\/api\/v1$/, "");

export function backendAssetUrl(pathOrUrl: string): string {
  const raw = String(pathOrUrl || "").trim();
  if (!raw) return "";
  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith("data:") || raw.startsWith("blob:")) {
    return raw;
  }
  return `${BACKEND_BASE}${raw.startsWith("/") ? raw : `/${raw}`}`;
}
