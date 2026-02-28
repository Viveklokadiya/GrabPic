"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";

import type { EventPhotoSafeResponse, EventProcessingStatusResponse, EventResponse } from "@/lib/api";
import {
  cancelPhotographerEvent,
  getPhotographerEvent,
  getPhotographerEventPhotos,
  getPhotographerEventStatus,
  syncPhotographerEvent,
} from "@/lib/rbac-api";

type ActivityFilter = "All Activities" | "Jobs Only" | "Errors Only";
type ActivityTone = "ok" | "warn" | "error" | "info";

type ActivityRow = {
  id: string;
  at: string;
  source: string;
  detail: string;
  status: string;
  tone: ActivityTone;
};

function isActiveStatus(value: string | undefined): boolean {
  return value === "QUEUED" || value === "RUNNING";
}

function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}m ${secs}s`;
}

function toneForJob(status: string, hasError: boolean): ActivityTone {
  if (hasError) return "error";
  const normalized = String(status || "").toUpperCase();
  if (normalized === "COMPLETED") return "ok";
  if (normalized === "RUNNING" || normalized === "QUEUED" || normalized === "CANCEL_REQUESTED") return "warn";
  if (normalized === "FAILED" || normalized === "CANCELED" || normalized === "CANCELLED") return "error";
  return "info";
}

function prettyJobType(value: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "Job";
  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (s) => s.toUpperCase());
}

function formatTime(value: string): string {
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return "--:--:--";
  return new Date(ts).toLocaleTimeString();
}

export default function LiveEventSyncPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = useMemo(() => String(params?.eventId ?? ""), [params]);

  const [eventData, setEventData] = useState<EventResponse | null>(null);
  const [statusData, setStatusData] = useState<EventProcessingStatusResponse | null>(null);
  const [photos, setPhotos] = useState<EventPhotoSafeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("All Activities");
  const [syncing, setSyncing] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [ratePerHour, setRatePerHour] = useState<number | null>(null);

  const rateSnapshotRef = useRef<{ processed: number; at: number } | null>(null);

  const totalPhotos = Math.max(statusData?.total_photos ?? 0, photos.length);
  const processed = Math.max(statusData?.processed_photos ?? 0, photos.length);
  const failed = Math.max(statusData?.failed_photos ?? 0, 0);
  const progress = totalPhotos > 0
    ? Math.max(0, Math.min(100, statusData?.progress_percentage ?? (processed / totalPhotos) * 100))
    : 0;
  const remaining = Math.max(0, totalPhotos - processed);
  const isLive = isActiveStatus(statusData?.status);

  useEffect(() => {
    if (!statusData) return;
    const now = Date.now();
    const currentProcessed = Math.max(0, statusData.processed_photos ?? 0);
    const prev = rateSnapshotRef.current;

    if (prev && now > prev.at) {
      const delta = currentProcessed - prev.processed;
      const deltaSeconds = (now - prev.at) / 1000;
      if (delta > 0 && deltaSeconds > 0) {
        setRatePerHour((delta / deltaSeconds) * 3600);
      }
    }

    rateSnapshotRef.current = { processed: currentProcessed, at: now };
  }, [statusData?.processed_photos, statusData?.updated_at]);

  const etaSeconds = useMemo(() => {
    if (!isLive || remaining <= 0 || !ratePerHour || ratePerHour <= 0) return null;
    return remaining / (ratePerHour / 3600);
  }, [isLive, remaining, ratePerHour]);

  const statusView = useMemo(() => {
    const status = String(statusData?.status || eventData?.status || "IDLE").toUpperCase();
    const map: Record<string, { badge: string; dot: string; label: string }> = {
      COMPLETED: { badge: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", label: "Completed" },
      RUNNING: { badge: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500 animate-pulse", label: "Live Sync Active" },
      QUEUED: { badge: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500", label: "Queued" },
      FAILED: { badge: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500", label: "Failed" },
      CANCELED: { badge: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400", label: "Canceled" },
      CANCELLED: { badge: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400", label: "Canceled" },
    };
    return map[status] ?? { badge: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400", label: status || "Idle" };
  }, [eventData?.status, statusData?.status]);

  const activityRows = useMemo<ActivityRow[]>(() => {
    const fromJobs: ActivityRow[] = (eventData?.jobs || []).map((job) => {
      const at = job.updated_at || job.created_at || new Date().toISOString();
      return {
        id: `job-${job.job_id}`,
        at,
        source: prettyJobType(job.type),
        detail: job.error || job.stage || "Updated",
        status: String(job.status || "unknown").toUpperCase(),
        tone: toneForJob(job.status, Boolean(job.error)),
      };
    });

    const fromPhotos: ActivityRow[] = photos.slice(0, 12).map((photo, index) => {
      const baseAt = statusData?.updated_at || eventData?.updated_at || new Date().toISOString();
      const shifted = new Date(Date.parse(baseAt) - index * 1000).toISOString();
      return {
        id: `photo-${photo.photo_id}`,
        at: shifted,
        source: "Photo Sync",
        detail: photo.file_name,
        status: "SYNCED",
        tone: "ok",
      };
    });

    const merged = [...fromJobs, ...fromPhotos]
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

    const filtered = merged.filter((row) => {
      if (activityFilter === "Jobs Only") return row.id.startsWith("job-");
      if (activityFilter === "Errors Only") return row.tone === "error";
      return true;
    });

    if (filtered.length > 0) return filtered.slice(0, 50);

    return [
      {
        id: "fallback",
        at: statusData?.updated_at || eventData?.updated_at || new Date().toISOString(),
        source: "Event Sync",
        detail: `Status: ${statusView.label}`,
        status: String(statusData?.status || eventData?.status || "IDLE").toUpperCase(),
        tone: isLive ? "warn" : "info",
      },
    ];
  }, [activityFilter, eventData?.jobs, eventData?.status, eventData?.updated_at, isLive, photos, statusData?.status, statusData?.updated_at, statusView.label]);

  async function loadAll(showLoading: boolean) {
    if (!eventId) return;
    if (showLoading) setLoading(true);
    try {
      const [evt, stat, photoList] = await Promise.all([
        getPhotographerEvent(eventId),
        getPhotographerEventStatus(eventId),
        getPhotographerEventPhotos(eventId),
      ]);
      setEventData(evt);
      setStatusData(stat);
      setPhotos(photoList);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load live sync monitor");
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  useEffect(() => {
    rateSnapshotRef.current = null;
    setRatePerHour(null);
    void loadAll(true);
    const timer = setInterval(() => {
      void loadAll(false);
    }, 5000);
    return () => clearInterval(timer);
  }, [eventId]);

  async function onPause() {
    if (!eventId) return;
    setCanceling(true);
    try {
      await cancelPhotographerEvent(eventId);
      await loadAll(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to pause sync");
    } finally {
      setCanceling(false);
    }
  }

  async function onSyncNow() {
    if (!eventId) return;
    setSyncing(true);
    try {
      await syncPhotographerEvent(eventId);
      await loadAll(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start sync");
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-6xl animate-pulse flex-col gap-6">
        <div className="h-8 w-1/3 rounded bg-slate-200" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {[...Array(3)].map((_, idx) => (
            <div key={idx} className="h-32 rounded-xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full">
      <nav className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/photographer/events" className="hover:text-primary transition-colors">Events</Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <Link href={`/photographer/events/${eventId}`} className="hover:text-primary transition-colors">Event</Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-slate-900 font-medium">Live Sync Monitor</span>
      </nav>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2 border-b border-slate-200">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${statusView.badge}`}>
              <span className={`size-2 rounded-full ${statusView.dot}`} />
              {statusView.label}
            </span>
            <span className="text-slate-400 text-sm">ID: {eventData?.event_code || eventId.slice(0, 8).toUpperCase()}</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{eventData?.name || "Event"}</h1>
          <p className="text-slate-500 text-sm">/{eventData?.slug || "event"} • Updated {formatTime(statusData?.updated_at || eventData?.updated_at || "")}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onPause}
            disabled={canceling || !isLive}
            className="flex items-center gap-2 h-10 px-5 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">pause_circle</span>
            {canceling ? "Pausing..." : "Pause"}
          </button>
          <button
            onClick={onSyncNow}
            disabled={syncing}
            className="flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-white text-sm font-semibold shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[18px] ${syncing ? "animate-spin" : ""}`}>sync</span>
            {syncing ? "Starting..." : "Sync Now"}
          </button>
          <Link
            href={`/photographer/events/${eventId}`}
            className="flex items-center gap-2 h-10 px-5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">visibility</span>
            View Gallery
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          {
            label: "Total Photos Found",
            value: totalPhotos.toLocaleString(),
            icon: "photo_library",
            color: "text-primary bg-primary/10",
            accent: "bg-primary",
            badge: `${progress.toFixed(0)}% done`,
            badgeColor: "text-emerald-600 bg-emerald-50",
          },
          {
            label: "AI Processed & Tagged",
            value: processed.toLocaleString(),
            icon: "auto_awesome",
            color: "text-emerald-600 bg-emerald-50",
            accent: "bg-emerald-500",
            badge: ratePerHour ? `${Math.round(ratePerHour).toLocaleString()} photos/hr` : "Rate unavailable",
            badgeColor: "text-slate-500 bg-slate-50",
          },
          {
            label: "Failed Uploads",
            value: failed.toString(),
            icon: "warning",
            color: "text-rose-600 bg-rose-50",
            accent: "bg-rose-500",
            badge: failed > 0 ? `${failed} issue${failed === 1 ? "" : "s"}` : "No issues",
            badgeColor: failed > 0 ? "text-rose-600 bg-rose-50" : "text-slate-500 bg-slate-50",
          },
        ].map((s) => (
          <div key={s.label} className="relative overflow-hidden rounded-xl bg-white p-6 border border-slate-200 shadow-sm">
            <div className={`absolute right-0 top-0 h-full w-1 ${s.accent}`} />
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2 rounded-lg ${s.color}`}>
                <span className="material-symbols-outlined text-[22px]">{s.icon}</span>
              </div>
              <span className={`flex items-center text-xs font-bold px-2 py-1 rounded ${s.badgeColor}`}>{s.badge}</span>
            </div>
            <p className="text-sm text-slate-500 mb-1">{s.label}</p>
            <p className="text-3xl font-bold text-slate-900 font-mono">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-end justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Batch Processing</h3>
              <p className="text-slate-500 text-sm mt-0.5">
                {isLive ? "Syncing photos from Google Drive..." : `Status: ${statusView.label}`}
              </p>
            </div>
            <span className="text-3xl font-bold text-primary font-mono">{progress.toFixed(0)}%</span>
          </div>
          <div className="relative w-full h-4 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, boxShadow: "0 0 15px rgba(72,72,229,0.5)" }}
            />
          </div>
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <span className="material-symbols-outlined text-[16px]">timer</span>
              Estimated remaining:
              <span className="text-slate-900 font-mono font-medium ml-1">
                {etaSeconds !== null ? formatDuration(etaSeconds) : (isLive ? "Calculating..." : "Complete")}
              </span>
            </div>
            <span className="text-xs text-slate-400">Updated {formatTime(statusData?.updated_at || "")}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">Recent Activity Log</h3>
          <div className="flex gap-2">
            <select
              className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-primary"
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value as ActivityFilter)}
            >
              <option>All Activities</option>
              <option>Jobs Only</option>
              <option>Errors Only</option>
            </select>
            <button
              type="button"
              onClick={() => void loadAll(false)}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-primary transition-colors"
              title="Refresh"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <div className="col-span-2">Time</div>
            <div className="col-span-3">Source</div>
            <div className="col-span-5">Details</div>
            <div className="col-span-2 text-right">Status</div>
          </div>

          <div className="flex flex-col divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
            {activityRows.map((row) => (
              <div key={row.id} className={`grid grid-cols-12 gap-4 px-6 py-3 items-center transition-colors ${row.tone === "error" ? "bg-rose-50/60" : "hover:bg-slate-50/70"}`}>
                <div className="col-span-2 text-slate-400 font-mono text-sm">{formatTime(row.at)}</div>
                <div className="col-span-3 text-slate-700 text-sm font-medium">{row.source}</div>
                <div className="col-span-5 flex items-center gap-2">
                  <span
                    className={`size-2 rounded-full flex-shrink-0 ${
                      row.tone === "ok" ? "bg-emerald-500" :
                      row.tone === "warn" ? "bg-amber-500" :
                      row.tone === "error" ? "bg-rose-500" :
                      "bg-slate-400"
                    }`}
                  />
                  <span className={`text-sm ${row.tone === "error" ? "text-rose-600" : "text-slate-700"}`}>{row.detail}</span>
                </div>
                <div className={`col-span-2 text-right text-sm font-mono ${row.tone === "error" ? "text-rose-600" : "text-slate-900"}`}>
                  {row.status}
                </div>
              </div>
            ))}
          </div>

          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center text-xs text-slate-400">
            <span>Showing latest {activityRows.length} items</span>
            <span>Auto-refresh every 5s</span>
          </div>
        </div>
      </div>
    </div>
  );
}
