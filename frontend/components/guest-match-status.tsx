"use client";

import Link from "next/link";

import StatusPill from "@/components/status-pill";
import type { GuestMatchResponse } from "@/lib/api";
import { hasResults, isNoMatch, isPollingStatus, progressForStatus, statusLabel } from "@/lib/guest-match-state";

function toneForStatus(status: string | undefined): "neutral" | "success" | "warn" | "danger" {
  const value = String(status || "").toLowerCase();
  if (value === "completed") return "success";
  if (value === "queued" || value === "running") return "warn";
  if (value === "failed" || value === "canceled" || value === "cancelled") return "danger";
  return "neutral";
}

export default function GuestMatchStatusCard({
  match,
  isPolling,
  openHref,
  openLabel,
  onRetry,
}: {
  match: GuestMatchResponse | null;
  isPolling: boolean;
  openHref?: string;
  openLabel?: string;
  onRetry: () => void;
}) {
  const showResults = hasResults(match);
  const noMatch = isNoMatch(match);
  const pollingState = isPollingStatus(match?.status);
  const message = !match
    ? "No selfie submitted yet."
    : noMatch
      ? "No confident photos found. Try another clearer selfie."
      : match.message || "Processing selfie...";

  return (
    <section className="rounded-xl border border-line bg-white p-5">
      <h2 className="font-display text-xl font-semibold text-slate-900">Match Status</h2>
      <div className="mt-3 flex items-center gap-2">
        <StatusPill label={statusLabel(match?.status)} tone={toneForStatus(match?.status)} />
        {isPolling || pollingState ? <span className="text-xs text-muted">Live updates every 2s</span> : null}
      </div>
      <p className="mt-2 text-sm text-muted">{message}</p>
      {match?.query_id ? <p className="mt-1 text-xs text-muted">Query: {match.query_id}</p> : null}
      <div className="mt-3 h-2 w-full rounded-full bg-bg">
        <div className="h-2 rounded-full bg-accent transition-all duration-300" style={{ width: `${progressForStatus(match?.status)}%` }} />
      </div>
      {typeof match?.confidence === "number" ? (
        <p className="mt-2 text-xs text-muted">Confidence: {(match.confidence * 100).toFixed(1)}%</p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {showResults && openHref ? (
          <Link className="btn btn-secondary text-xs" href={openHref}>
            {openLabel || "Open Photos"}
          </Link>
        ) : null}
        {(noMatch || match?.status === "failed" || match?.status === "canceled" || match?.status === "cancelled") ? (
          <button className="btn btn-secondary text-xs" type="button" onClick={onRetry}>
            Upload Another Selfie
          </button>
        ) : null}
      </div>
    </section>
  );
}
