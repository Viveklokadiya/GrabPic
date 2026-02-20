import type { GuestMatchResponse } from "@/lib/api";

export type GuestMatchStatus = "queued" | "running" | "completed" | "failed" | "canceled" | "unknown";

function normalize(raw: string | undefined): GuestMatchStatus {
  const value = String(raw || "").trim().toLowerCase();
  if (value === "queued") return "queued";
  if (value === "running") return "running";
  if (value === "completed") return "completed";
  if (value === "failed") return "failed";
  if (value === "canceled" || value === "cancelled") return "canceled";
  return "unknown";
}

export function isPollingStatus(status: string | undefined): boolean {
  const normalized = normalize(status);
  return normalized === "queued" || normalized === "running";
}

export function isTerminalStatus(status: string | undefined): boolean {
  const normalized = normalize(status);
  return normalized === "completed" || normalized === "failed" || normalized === "canceled";
}

export function hasResults(match: GuestMatchResponse | null): boolean {
  if (!match) return false;
  return normalize(match.status) === "completed" && Array.isArray(match.photos) && match.photos.length > 0;
}

export function isNoMatch(match: GuestMatchResponse | null): boolean {
  if (!match) return false;
  return normalize(match.status) === "completed" && (!Array.isArray(match.photos) || match.photos.length === 0);
}

export function progressForStatus(status: string | undefined): number {
  const normalized = normalize(status);
  if (normalized === "queued") return 28;
  if (normalized === "running") return 72;
  if (normalized === "completed") return 100;
  if (normalized === "failed" || normalized === "canceled") return 100;
  return 0;
}

export function statusLabel(status: string | undefined): string {
  const normalized = normalize(status);
  if (normalized === "queued") return "Queued";
  if (normalized === "running") return "Matching";
  if (normalized === "completed") return "Completed";
  if (normalized === "failed") return "Failed";
  if (normalized === "canceled") return "Canceled";
  return "Not Started";
}
