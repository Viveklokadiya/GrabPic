"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getPhotographerEvents } from "@/lib/rbac-api";
import type { PhotographerEventListItem } from "@/lib/api";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    COMPLETED: "bg-emerald-100 text-emerald-700",
    RUNNING: "bg-blue-100 text-blue-700",
    QUEUED: "bg-amber-100 text-amber-700",
    FAILED: "bg-red-100 text-red-700",
  };
  return map[status] ?? "bg-slate-100 text-slate-600";
}

function statusDot(status: string) {
  const map: Record<string, string> = {
    COMPLETED: "bg-emerald-500",
    RUNNING: "bg-blue-500 animate-pulse",
    QUEUED: "bg-amber-500",
    FAILED: "bg-red-500",
  };
  return map[status] ?? "bg-slate-400";
}

export default function PhotographerDashboard() {
  const [events, setEvents] = useState<PhotographerEventListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPhotographerEvents()
      .then(setEvents)
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const total = events.length;
  const active = events.filter((e) => e.status === "RUNNING" || e.status === "QUEUED").length;
  const completed = events.filter((e) => e.status === "COMPLETED").length;
  const totalPhotos = events.reduce((s, e) => s + (e.photo_count ?? 0), 0);
  const totalGuests = events.reduce((s, e) => s + (e.guest_count ?? 0), 0);

  const recentEvents = [...events].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 5);

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 mt-1 text-sm">Welcome back! Here&apos;s an overview of your studio.</p>
        </div>
        <Link
          href="/photographer/events/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">add_circle</span>
          New Event
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: "Total Events", value: loading ? "—" : String(total), icon: "event", color: "bg-indigo-50 text-indigo-600", accent: "from-indigo-500" },
          { label: "Active Jobs", value: loading ? "—" : String(active), icon: "sync", color: "bg-blue-50 text-blue-600", accent: "from-blue-500" },
          { label: "Photos Processed", value: loading ? "—" : totalPhotos.toLocaleString(), icon: "photo_library", color: "bg-violet-50 text-violet-600", accent: "from-violet-500" },
          { label: "Total Guests", value: loading ? "—" : totalGuests.toLocaleString(), icon: "group", color: "bg-emerald-50 text-emerald-600", accent: "from-emerald-500" },
        ].map((stat) => (
          <div key={stat.label} className="relative overflow-hidden rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
            <div className={`absolute right-0 top-0 h-full w-1 bg-gradient-to-b ${stat.accent} to-transparent`} />
            <div className={`inline-flex items-center justify-center rounded-lg p-2 mb-3 ${stat.color}`}>
              <span className="material-symbols-outlined text-[22px]">{stat.icon}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 font-mono">{stat.value}</p>
            <p className="text-xs text-slate-500 mt-1 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Events */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">Recent Events</h2>
            <Link href="/photographer/events" className="text-xs text-primary font-semibold hover:underline">
              View all →
            </Link>
          </div>
          {loading ? (
            <div className="px-6 py-10 text-center text-sm text-slate-400">Loading events...</div>
          ) : recentEvents.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-2 block">event_note</span>
              <p className="text-sm text-slate-400">No events yet.</p>
              <Link href="/photographer/events/new" className="mt-3 inline-flex text-sm text-primary font-semibold hover:underline">
                Create your first event →
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/70 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-6 py-3 text-left font-semibold">Event</th>
                  <th className="px-6 py-3 text-left font-semibold">Status</th>
                  <th className="px-6 py-3 text-left font-semibold hidden md:table-cell">Photos</th>
                  <th className="px-6 py-3 text-left font-semibold hidden md:table-cell">Guests</th>
                  <th className="px-6 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentEvents.map((evt) => (
                  <tr key={evt.event_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3.5">
                      <p className="font-semibold text-slate-900">{evt.name}</p>
                      <p className="text-xs text-slate-400">{evt.slug}</p>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge(evt.status)}`}>
                        <span className={`size-1.5 rounded-full ${statusDot(evt.status)}`} />
                        {evt.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 hidden md:table-cell text-slate-500 font-mono">{evt.photo_count}</td>
                    <td className="px-6 py-3.5 hidden md:table-cell text-slate-500 font-mono">{evt.guest_count}</td>
                    <td className="px-6 py-3.5 text-right">
                      <Link
                        href={`/photographer/events/${evt.event_id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        Open <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
            <h2 className="font-bold text-slate-900 mb-4">Quick Actions</h2>
            <div className="flex flex-col gap-3">
              {[
                { href: "/photographer/events/new", icon: "add_photo_alternate", label: "Create New Event", desc: "Set up a new photo event" },
                { href: "/photographer/connections", icon: "cloud_sync", label: "Cloud Storage", desc: "Manage Drive connections" },
                { href: "/photographer/profile", icon: "account_circle", label: "Studio Profile", desc: "Edit your branding & plan" },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 border border-slate-100 hover:border-primary/30 hover:bg-primary/5 transition-all group"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all">
                    <span className="material-symbols-outlined text-[20px]">{action.icon}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{action.label}</p>
                    <p className="text-xs text-slate-400">{action.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Overview mini stats */}
          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-primary to-indigo-600 shadow-lg shadow-primary/20 p-6 text-white">
            <h3 className="text-sm font-semibold opacity-80 mb-4">Monthly Overview</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-white/10 p-3">
                <p className="text-2xl font-bold">{completed}</p>
                <p className="text-xs opacity-70 mt-0.5">Completed</p>
              </div>
              <div className="rounded-lg bg-white/10 p-3">
                <p className="text-2xl font-bold">{active}</p>
                <p className="text-xs opacity-70 mt-0.5">Active Jobs</p>
              </div>
              <div className="rounded-lg bg-white/10 p-3">
                <p className="text-2xl font-bold">{totalPhotos.toLocaleString()}</p>
                <p className="text-xs opacity-70 mt-0.5">Photos</p>
              </div>
              <div className="rounded-lg bg-white/10 p-3">
                <p className="text-2xl font-bold">{totalGuests}</p>
                <p className="text-xs opacity-70 mt-0.5">Guests</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
