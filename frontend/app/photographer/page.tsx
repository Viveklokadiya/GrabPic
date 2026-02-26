"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { PhotographerEventListItem } from "@/lib/api";
import { getPhotographerEvents } from "@/lib/rbac-api";

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
  const router = useRouter();
  const [origin, setOrigin] = useState("");
  const [events, setEvents] = useState<PhotographerEventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
    getPhotographerEvents()
      .then(setEvents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function copyText(value: string, key: string) {
    if (!value) return;
    try {
      await navigator.clipboard?.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((current) => (current === key ? "" : current)), 1400);
    } catch (_err) {
      // ignore
    }
  }

  async function downloadQrImage(url: string, filename: string) {
    if (!url) return;
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error("QR download failed");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  const total = events.length;
  const active = events.filter((e) => e.status === "RUNNING" || e.status === "QUEUED").length;
  const completed = events.filter((e) => e.status === "COMPLETED").length;
  const totalPhotos = events.reduce((s, e) => s + Math.max(0, Number(e.processed_photos ?? e.photo_count ?? 0)), 0);
  const totalGuests = events.reduce((s, e) => s + (e.guest_count ?? 0), 0);

  const recentEvents = [...events].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 5);
  const latestEvent = recentEvents[0] || null;

  const latestGuestLink = useMemo(() => {
    if (!origin || !latestEvent?.slug) return "";
    return `${origin}/g/${encodeURIComponent(latestEvent.slug)}`;
  }, [origin, latestEvent?.slug]);

  const latestQrUrl = useMemo(() => {
    if (!latestGuestLink) return "";
    return `/qr?size=320&data=${encodeURIComponent(latestGuestLink)}`;
  }, [latestGuestLink]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Welcome back! Here is an overview of your studio.</p>
        </div>
        <Link
          href="/photographer/events/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary/90"
        >
          <span className="material-symbols-outlined text-[20px]">add_circle</span>
          New Event
        </Link>
      </div>

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/photographer/events", label: "Total Events", value: loading ? "—" : String(total), icon: "event", color: "bg-indigo-50 text-indigo-600", accent: "from-indigo-500" },
          { href: "/photographer/events", label: "Active Jobs", value: loading ? "—" : String(active), icon: "sync", color: "bg-blue-50 text-blue-600", accent: "from-blue-500" },
          { href: "/photographer/events", label: "Photos Processed", value: loading ? "—" : totalPhotos.toLocaleString(), icon: "photo_library", color: "bg-violet-50 text-violet-600", accent: "from-violet-500" },
          { href: "/photographer/events", label: "Total Guests", value: loading ? "—" : totalGuests.toLocaleString(), icon: "group", color: "bg-emerald-50 text-emerald-600", accent: "from-emerald-500" },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
            <div className={`absolute right-0 top-0 h-full w-1 bg-gradient-to-b ${stat.accent} to-transparent`} />
            <div className={`mb-3 inline-flex items-center justify-center rounded-lg p-2 ${stat.color}`}>
              <span className="material-symbols-outlined text-[22px]">{stat.icon}</span>
            </div>
            <p className="font-mono text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">{stat.label}</p>
          </Link>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="font-bold text-slate-900">Recent Events</h2>
            <Link href="/photographer/events" className="text-xs font-semibold text-primary hover:underline">
              All Events
            </Link>
          </div>
          {loading ? (
            <div className="px-6 py-10 text-center text-sm text-slate-400">Loading events...</div>
          ) : recentEvents.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <span className="material-symbols-outlined mb-2 block text-4xl text-slate-300">event_note</span>
              <p className="text-sm text-slate-400">No events yet.</p>
              <Link href="/photographer/events/new" className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline">
                Create your first event →
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/70 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3 text-left font-semibold">Event</th>
                  <th className="px-6 py-3 text-left font-semibold">Event ID</th>
                  <th className="px-6 py-3 text-left font-semibold">Status</th>
                  <th className="hidden px-6 py-3 text-left font-semibold md:table-cell">Photos</th>
                  <th className="hidden px-6 py-3 text-left font-semibold md:table-cell">Guests</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentEvents.map((evt) => {
                  const copyEventIdKey = `event-code-${evt.event_id}`;
                  return (
                    <tr
                      key={evt.event_id}
                      className="cursor-pointer transition-colors hover:bg-slate-50/50"
                      onClick={() => router.push(`/photographer/events/${evt.event_id}`)}
                    >
                      <td className="px-6 py-3.5">
                        <p className="font-semibold text-slate-900">{evt.name}</p>
                        <p className="text-xs text-slate-400">/{evt.slug}</p>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-mono text-slate-700">
                          {evt.event_code}
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void copyText(evt.event_code, copyEventIdKey);
                            }}
                            className="inline-flex items-center rounded px-1 text-primary hover:bg-primary/10"
                            title="Copy Event ID"
                          >
                            <span className="material-symbols-outlined text-[12px]">content_copy</span>
                          </button>
                        </div>
                        {copiedKey === copyEventIdKey ? <p className="mt-1 text-[10px] font-medium text-emerald-700">Copied</p> : null}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge(evt.status)}`}>
                          <span className={`size-1.5 rounded-full ${statusDot(evt.status)}`} />
                          {evt.status}
                        </span>
                      </td>
                      <td className="hidden px-6 py-3.5 font-mono text-slate-500 md:table-cell">{evt.processed_photos}/{evt.total_photos || evt.photo_count}</td>
                      <td className="hidden px-6 py-3.5 font-mono text-slate-500 md:table-cell">{evt.guest_count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-bold text-slate-900">Latest Event Scanner</h2>
            {!latestEvent ? (
              <p className="text-sm text-slate-400">Create an event to generate guest scanner.</p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-800">{latestEvent.name}</p>
                <p className="text-xs text-slate-500">
                  Guest link opens face match directly: <span className="font-mono">/g/{latestEvent.slug}</span>
                </p>
                <div className="flex justify-center rounded-xl border border-slate-200 bg-slate-50 p-3">
                  {latestQrUrl ? <img src={latestQrUrl} alt="Event QR scanner" className="h-44 w-44 rounded-lg border border-slate-200 bg-white p-2" /> : null}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => void copyText(latestGuestLink, "latest-link")}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-primary/40 hover:text-primary"
                  >
                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                    Copy Link
                  </button>
                  <button
                    type="button"
                    data-no-loader="true"
                    onClick={() => void downloadQrImage(latestQrUrl, `grabpic-${latestEvent.slug}-scanner.png`)}
                    disabled={!latestQrUrl}
                    className="inline-flex items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[14px]">download</span>
                    Download QR
                  </button>
                </div>
                {copiedKey === "latest-link" ? <p className="text-[11px] text-emerald-700">Guest link copied.</p> : null}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-bold text-slate-900">Quick Actions</h2>
            <div className="flex flex-col gap-3">
              {[
                { href: "/photographer/events/new", icon: "add_photo_alternate", label: "Create New Event", desc: "Set up a new photo event" },
                { href: "/photographer/connections", icon: "cloud_sync", label: "Cloud Storage", desc: "Manage Drive connections" },
                { href: "/photographer/profile", icon: "account_circle", label: "Studio Profile", desc: "Edit your branding & plan" },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex items-center gap-3 rounded-lg border border-slate-100 px-4 py-3 transition-all hover:border-primary/30 hover:bg-primary/5"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-white">
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

          <div className="rounded-xl bg-gradient-to-br from-primary to-indigo-600 p-6 text-white shadow-lg shadow-primary/20">
            <h3 className="mb-4 text-sm font-semibold opacity-80">Monthly Overview</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-white/10 p-3">
                <p className="text-2xl font-bold">{completed}</p>
                <p className="mt-0.5 text-xs opacity-70">Completed</p>
              </div>
              <div className="rounded-lg bg-white/10 p-3">
                <p className="text-2xl font-bold">{active}</p>
                <p className="mt-0.5 text-xs opacity-70">Active Jobs</p>
              </div>
              <div className="rounded-lg bg-white/10 p-3">
                <p className="text-2xl font-bold">{totalPhotos.toLocaleString()}</p>
                <p className="mt-0.5 text-xs opacity-70">Photos</p>
              </div>
              <div className="rounded-lg bg-white/10 p-3">
                <p className="text-2xl font-bold">{totalGuests}</p>
                <p className="mt-0.5 text-xs opacity-70">Guests</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
