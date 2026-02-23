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
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.slug.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "ALL" || e.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">My Events</h1>
          <p className="text-slate-500 mt-1 text-sm">Manage and monitor all your photo events.</p>
        </div>
        <Link
          href="/photographer/events/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Create Event
        </Link>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: events.length, status: "ALL", icon: "folder" },
          { label: "Active", value: events.filter((e) => e.status === "RUNNING" || e.status === "QUEUED").length, status: "RUNNING", icon: "sync" },
          { label: "Completed", value: events.filter((e) => e.status === "COMPLETED").length, status: "COMPLETED", icon: "check_circle" },
          { label: "Failed", value: events.filter((e) => e.status === "FAILED").length, status: "FAILED", icon: "error" },
        ].map((s) => (
          <button
            key={s.status}
            onClick={() => setFilter(filter === s.status ? "ALL" : s.status)}
            className={`flex flex-col items-start p-4 rounded-xl border transition-all text-left ${filter === s.status
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-slate-200 bg-white hover:border-primary/40"
              }`}
          >
            <span className={`material-symbols-outlined text-[22px] mb-2 ${filter === s.status ? "text-primary" : "text-slate-400"}`}>
              {s.icon}
            </span>
            <p className="text-2xl font-bold text-slate-900">{loading ? "—" : s.value}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
            <span className="material-symbols-outlined text-[20px]">search</span>
          </span>
          <input
            className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
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
              className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${filter === f
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-primary/40"
                }`}
            >
              {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error ? (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {/* Events Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-2/3 mb-3" />
              <div className="h-3 bg-slate-100 rounded w-1/2 mb-6" />
              <div className="h-2 bg-slate-100 rounded w-full mb-2" />
              <div className="h-6 bg-slate-100 rounded w-1/3 mt-4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-20 text-center">
          <span className="material-symbols-outlined text-5xl text-slate-300 mb-3 block">event_note</span>
          <p className="text-slate-500 font-medium">No events found</p>
          <Link href="/photographer/events/new" className="mt-4 inline-flex items-center gap-1 text-sm text-primary font-semibold hover:underline">
            <span className="material-symbols-outlined text-[16px]">add</span> Create your first event
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((evt) => {
            const sc = statusConfig(evt.status);
            const progress = evt.photo_count > 0 ? Math.min(100, Math.round((evt.photo_count / Math.max(evt.photo_count, 1)) * 100)) : 0;
            const lastSync = evt.last_sync_at ? new Date(evt.last_sync_at).toLocaleDateString() : "Not started";
            return (
              <article
                key={evt.event_id}
                className="group flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-primary/30 transition-all overflow-hidden"
              >
                {/* Card top accent */}
                <div className={`h-1 w-full ${sc.dot.replace("animate-pulse", "").trim()} opacity-50`} />
                <div className="flex flex-col flex-1 p-5">
                  {/* Status badge */}
                  <div className="flex items-start justify-between mb-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${sc.badge}`}>
                      <span className={`size-1.5 rounded-full ${sc.dot}`} />
                      {sc.label}
                    </span>
                    <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors text-[20px]">
                      arrow_outward
                    </span>
                  </div>

                  {/* Event name */}
                  <h3 className="font-bold text-slate-900 mb-1 leading-tight">{evt.name}</h3>
                  <p className="text-xs text-slate-400 mb-4">/{evt.slug}</p>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>{evt.photo_count} photos processed</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${evt.status === "COMPLETED" ? "bg-emerald-500" : "bg-primary"} transition-all`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats row */}
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
                <div className="px-5 pb-4">
                  <Link
                    href={`/photographer/events/${evt.event_id}`}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/5 py-2 text-sm font-semibold text-primary hover:bg-primary hover:text-white transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                    Open Event
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
