"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { PhotographerEventListItem } from "@/lib/api";
import { getPhotographerEvents } from "@/lib/rbac-api";

function statusBadge(status: string) {
  if (status === "RUNNING") return "bg-blue-50 text-blue-700 border border-blue-200";
  if (status === "QUEUED") return "bg-amber-50 text-amber-700 border border-amber-200";
  if (status === "COMPLETED") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  if (status === "FAILED") return "bg-red-50 text-red-700 border border-red-200";
  return "bg-slate-50 text-slate-600 border border-slate-200";
}

export default function CloudStoragePage() {
  const [events, setEvents] = useState<PhotographerEventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getPhotographerEvents()
      .then(setEvents)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load events"))
      .finally(() => setLoading(false));
  }, []);

  const activeTasks = useMemo(
    () => events.filter((event) => event.status === "RUNNING" || event.status === "QUEUED"),
    [events],
  );

  const syncHistory = useMemo(
    () => [...events].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 12),
    [events],
  );

  const totalProcessedPhotos = events.reduce((sum, event) => sum + Math.max(0, Number(event.processed_photos || event.photo_count || 0)), 0);
  const approxStorageGb = totalProcessedPhotos * 0.0065;
  const includedStorageGb = 100;
  const usagePercent = Math.min(100, Math.round((approxStorageGb / includedStorageGb) * 100));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div>
        <nav className="mb-4 flex items-center gap-2 text-sm text-slate-400">
          <span>Workspace</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span>Settings</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="font-medium text-slate-900">Cloud Storage</span>
        </nav>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Google Drive Connection</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          GrabPic syncs directly from your Google Drive event folders. New photos are auto-processed and become searchable for guests.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="group relative flex flex-col rounded-xl border-2 border-primary bg-white p-6 shadow-lg shadow-primary/5">
          <div className="absolute right-4 top-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              Connected
            </span>
          </div>
          <div className="mb-6 flex items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 p-3">
              <svg className="h-full w-full" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                <path d="m6.6 66.85 25.3-43.8 25.3 43.8z" fill="#0066da" />
                <path d="m43.8 23.05 25.3-43.8h-50.6z" fill="#00ac47" />
                <path d="m66.6 23.05 20.7 35.8h-46l-25.3-43.8z" fill="#ea4335" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Google Drive</h3>
              <p className="text-sm text-slate-500">Connected for event syncing</p>
            </div>
          </div>

          <div className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Events</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{loading ? "—" : events.length}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Sync Tasks</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{loading ? "—" : activeTasks.length}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Processed Photos</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{loading ? "—" : totalProcessedPhotos.toLocaleString()}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="text-slate-500">Drive folders are picked per event from the event setup page.</p>
            <Link href="/photographer/events/new" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
              Create Event Folder Link <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-bold text-slate-900">Storage Usage</h3>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
              <span>Approx usage from synced photos</span>
              <span>{usagePercent}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-primary" style={{ width: `${usagePercent}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>{approxStorageGb.toFixed(1)} GB used</span>
              <span>{includedStorageGb} GB included</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">Pro plan supports higher storage limits. Upgrade to increase event capacity.</p>
          <button className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90">
            Upgrade Storage Plan
          </button>
        </div>
      </section>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Active Sync Tasks</h2>
          <span className="text-xs text-slate-500">Real-time from your event statuses</span>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Event</th>
                <th className="hidden px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 md:table-cell">Event ID</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={4} className="px-5 py-8 text-sm text-slate-400">Loading sync tasks...</td></tr>
              ) : activeTasks.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-8 text-sm text-slate-400">No active sync tasks right now.</td></tr>
              ) : activeTasks.map((task) => (
                <tr key={task.event_id} className="transition-colors hover:bg-slate-50/60">
                  <td className="px-5 py-4">
                    <Link href={`/photographer/events/${task.event_id}`} className="font-semibold text-slate-900 hover:text-primary">
                      {task.name}
                    </Link>
                    <p className="text-xs text-slate-400">/{task.slug}</p>
                  </td>
                  <td className="hidden px-5 py-4 font-mono text-xs text-slate-500 md:table-cell">{task.event_code}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge(task.status)}`}>
                      {task.status === "RUNNING" ? <span className="size-1.5 rounded-full bg-blue-500 animate-pulse" /> : <span className="size-1.5 rounded-full bg-slate-400" />}
                      {task.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">
                    {task.processed_photos}/{task.total_photos || task.photo_count}
                    <span className="ml-2 text-xs text-slate-400">({Math.round(task.progress_percentage || 0)}%)</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Sync History</h2>
          <Link href="/photographer/events" className="text-sm font-semibold text-primary hover:underline">View All Events</Link>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Event</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                <th className="hidden px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 md:table-cell">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={3} className="px-5 py-8 text-sm text-slate-400">Loading history...</td></tr>
              ) : syncHistory.length === 0 ? (
                <tr><td colSpan={3} className="px-5 py-8 text-sm text-slate-400">No sync history yet.</td></tr>
              ) : syncHistory.map((item) => (
                <tr key={item.event_id} className="transition-colors hover:bg-slate-50/60">
                  <td className="px-5 py-4">
                    <Link href={`/photographer/events/${item.event_id}`} className="font-semibold text-slate-900 hover:text-primary">
                      {item.name}
                    </Link>
                    <p className="text-xs font-mono text-slate-400">Event ID: {item.event_code}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="hidden px-5 py-4 text-sm text-slate-500 md:table-cell">{new Date(item.updated_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
