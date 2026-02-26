"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getPhotographerEvents } from "@/lib/rbac-api";
import type { PhotographerEventListItem } from "@/lib/api";

function statusConfig(status: string) {
  const map: Record<string, { badge: string; dot: string; label: string }> = {
    COMPLETED: { badge: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", label: "Completed" },
    RUNNING: { badge: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500 animate-pulse", label: "Syncing" },
    QUEUED: { badge: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500", label: "Queued" },
    FAILED: { badge: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500", label: "Failed" },
  };
  return map[status] ?? { badge: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400", label: status };
}

function eventProgress(evt: PhotographerEventListItem): { processed: number; total: number; percent: number } {
  const processed = Math.max(0, Number(evt.processed_photos ?? evt.photo_count ?? 0));
  const totalCandidate = Math.max(0, Number(evt.total_photos ?? 0));
  const total = totalCandidate > 0 ? totalCandidate : Math.max(processed, Number(evt.photo_count ?? 0));

  let percent = Number(evt.progress_percentage ?? 0);
  if (!(percent > 0) && total > 0) {
    percent = (processed / total) * 100;
  }
  if ((evt.status === "RUNNING" || evt.status === "QUEUED") && percent >= 100) {
    percent = 99;
  }

  return {
    processed,
    total,
    percent: Math.max(0, Math.min(100, Math.round(percent))),
  };
}

export default function PhotographerEventsPage() {
  const [events, setEvents] = useState<PhotographerEventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    getPhotographerEvents()
      .then(setEvents)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = events.filter((e) => {
    const needle = search.toLowerCase();
    const matchSearch = e.name.toLowerCase().includes(needle) || e.slug.toLowerCase().includes(needle) || e.event_code.toLowerCase().includes(needle);
    const matchFilter = filter === "ALL" || e.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">My Events</h1>
          <p className="mt-1 text-sm text-slate-500">Manage and monitor all your photo events.</p>
        </div>
        <Link
          href="/photographer/events/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary/90"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Create Event
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Total", value: events.length, status: "ALL", icon: "folder" },
          { label: "Active", value: events.filter((e) => e.status === "RUNNING" || e.status === "QUEUED").length, status: "RUNNING", icon: "sync" },
          { label: "Completed", value: events.filter((e) => e.status === "COMPLETED").length, status: "COMPLETED", icon: "check_circle" },
          { label: "Failed", value: events.filter((e) => e.status === "FAILED").length, status: "FAILED", icon: "error" },
        ].map((s) => (
          <button
            key={s.status}
            onClick={() => setFilter(filter === s.status ? "ALL" : s.status)}
            className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${filter === s.status ? "border-primary bg-primary/5 shadow-sm" : "border-slate-200 bg-white hover:border-primary/40"}`}
          >
            <span className={`material-symbols-outlined mb-2 text-[22px] ${filter === s.status ? "text-primary" : "text-slate-400"}`}>{s.icon}</span>
            <p className="text-2xl font-bold text-slate-900">{loading ? "—" : s.value}</p>
            <p className="mt-0.5 text-xs font-medium text-slate-500">{s.label}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative max-w-md flex-1">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
            <span className="material-symbols-outlined text-[20px]">search</span>
          </span>
          <input
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {["ALL", "RUNNING", "COMPLETED", "FAILED"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f === filter ? "ALL" : f)}
              className={`rounded-lg border px-4 py-2 text-xs font-semibold transition-all ${filter === f ? "border-primary bg-primary text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-primary/40"}`}
            >
              {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      {loading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-3 h-4 w-2/3 rounded bg-slate-200" />
              <div className="mb-6 h-3 w-1/2 rounded bg-slate-100" />
              <div className="mb-2 h-2 w-full rounded bg-slate-100" />
              <div className="mt-4 h-6 w-1/3 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-20 text-center">
          <span className="material-symbols-outlined mb-3 block text-5xl text-slate-300">event_note</span>
          <p className="font-medium text-slate-500">No events found</p>
          <Link href="/photographer/events/new" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            <span className="material-symbols-outlined text-[16px]">add</span> Create your first event
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((evt) => {
            const sc = statusConfig(evt.status);
            const progress = eventProgress(evt);
            const lastSync = evt.last_sync_at ? new Date(evt.last_sync_at).toLocaleDateString() : "Not started";

            return (
              <Link
                key={evt.event_id}
                href={`/photographer/events/${evt.event_id}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
              >
                <div className={`h-1 w-full ${sc.dot.replace("animate-pulse", "").trim()} opacity-50`} />
                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-3 flex items-start justify-between">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${sc.badge}`}>
                      <span className={`size-1.5 rounded-full ${sc.dot}`} />
                      {sc.label}
                    </span>
                    <span className="material-symbols-outlined text-[20px] text-slate-300 transition-colors group-hover:text-primary">arrow_outward</span>
                  </div>

                  <h3 className="mb-1 leading-tight text-slate-900 font-bold">{evt.name}</h3>
                  <p className="mb-1 text-xs text-slate-400">/{evt.slug}</p>
                  <p className="mb-4 text-[11px] font-mono text-slate-500">Event ID: {evt.event_code}</p>

                  <div className="mb-4">
                    <div className="mb-1 flex justify-between text-xs text-slate-500">
                      <span>{progress.processed} / {progress.total} processed</span>
                      <span>{progress.percent}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all ${evt.status === "COMPLETED" ? "bg-emerald-500" : "bg-primary"}`}
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-auto flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">group</span>
                      {evt.guest_count} guests
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      {lastSync}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
