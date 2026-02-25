"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ToastStack, type ToastMessage } from "@/components/toast-stack";
import type { AdminEventStatusItem, AdminJobRow, GlobalStatsResponse } from "@/lib/api";
import { cancelAdminEvent, deleteEvent, getAdminEventsStatus, getAdminJobs, getAdminMetrics } from "@/lib/rbac-api";
import { useAuth } from "@/lib/use-auth";

type StatusMeta = { label: string; dot: string; badge: string };

function getStatusMeta(status: string): StatusMeta {
  switch (status) {
    case "RUNNING": return { label: "RUNNING", dot: "bg-emerald-500 animate-pulse", badge: "bg-emerald-50 text-emerald-700 border-emerald-100" };
    case "QUEUED": return { label: "QUEUED", dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700 border-amber-100" };
    case "COMPLETED": return { label: "COMPLETED", dot: "bg-indigo-500", badge: "bg-indigo-50 text-indigo-700 border-indigo-100" };
    case "FAILED": return { label: "ERROR", dot: "bg-red-500", badge: "bg-red-50 text-red-700 border-red-100" };
    case "CANCELLED": return { label: "CANCELLED", dot: "bg-slate-400", badge: "bg-slate-100 text-slate-600 border-slate-200" };
    default: return { label: status, dot: "bg-slate-400", badge: "bg-slate-100 text-slate-600 border-slate-200" };
  }
}

function StatCard({ label, value, icon, iconBg, iconColor, trend }: {
  label: string; value: string | number; icon: string; iconBg: string; iconColor: string; trend?: string;
}) {
  return (
    <article className="group relative flex flex-col justify-between rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition-all hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <h3 className="text-3xl font-bold text-slate-900">{typeof value === "number" ? value.toLocaleString() : value}</h3>
        </div>
        <div className={`rounded-lg ${iconBg} p-3 ${iconColor} transition-colors group-hover:${iconBg.replace("/10", "")} group-hover:text-white`}>
          <span className="material-symbols-outlined text-[24px]">{icon}</span>
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center text-sm">
          <span className="flex items-center font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-xs">
            <span className="material-symbols-outlined text-[14px] mr-1">trending_up</span>{trend}
          </span>
          <span className="ml-2 text-slate-400 text-xs">vs last month</span>
        </div>
      )}
    </article>
  );
}

function canCancel(status: string): boolean {
  return status === "QUEUED" || status === "RUNNING";
}

export default function AdminDashboardPage() {
  const auth = useAuth();
  const [stats, setStats] = useState<GlobalStatsResponse | null>(null);
  const [events, setEvents] = useState<AdminEventStatusItem[]>([]);
  const [jobs, setJobs] = useState<AdminJobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelingId, setCancelingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{ eventId: string; eventName: string } | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const hasActiveProcessing = useMemo(() => events.some((e) => e.status === "QUEUED" || e.status === "RUNNING"), [events]);
  const activeJobs = useMemo(() => jobs.filter((j) => j.status === "queued" || j.status === "running" || j.status === "cancel_requested").length, [jobs]);
  const completedToday = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return jobs.filter((j) => j.status === "completed" && new Date(j.updated_at) >= start).length;
  }, [jobs]);

  const filteredEvents = useMemo(() =>
    search ? events.filter((e) => e.event_name.toLowerCase().includes(search.toLowerCase()) || e.owner_email.toLowerCase().includes(search.toLowerCase())) : events,
    [events, search]
  );

  const canDelete = auth.user?.role === "SUPER_ADMIN";

  function dismissToast(toastId: string) {
    setToasts((prev) => prev.filter((toast) => toast.id !== toastId));
  }

  function showToast(variant: ToastMessage["variant"], title: string, message: string) {
    const toastId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev, { id: toastId, variant, title, message }]);
  }

  async function loadAll(silent = false) {
    if (!silent) setLoading(true);
    setError("");
    try {
      const [metrics, evRows, jRows] = await Promise.all([getAdminMetrics(), getAdminEventsStatus(), getAdminJobs(300)]);
      setStats(metrics);
      setEvents(evRows);
      setJobs(jRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin data");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => { void loadAll(false); }, []);
  useEffect(() => {
    if (!hasActiveProcessing) return;
    const t = window.setInterval(() => void loadAll(true), 2000);
    return () => window.clearInterval(t);
  }, [hasActiveProcessing]);

  async function onCancel(eventId: string, eventName: string) {
    setCancelingId(eventId);
    setEvents((prev) => prev.map((e) => e.event_id === eventId ? { ...e, status: "CANCELLED" } : e));
    try {
      await cancelAdminEvent(eventId);
      showToast("info", "Cancellation requested", `"${eventName}" is being canceled.`);
      await loadAll(true);
    }
    catch (err) {
      const message = err instanceof Error ? err.message : "Failed to cancel";
      setError(message);
      showToast("error", "Cancel failed", message);
      await loadAll(true);
    }
    finally { setCancelingId(""); }
  }

  function requestDelete(eventId: string, eventName: string) {
    if (!canDelete) return;
    setPendingDelete({ eventId, eventName });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;

    const { eventId, eventName } = pendingDelete;
    setDeletingId(eventId);
    setError("");

    try {
      await deleteEvent(eventId);
      setEvents((prev) => prev.filter((e) => e.event_id !== eventId));
      setPendingDelete(null);
      showToast("success", "Event deleted", `"${eventName}" was permanently removed.`);
      await loadAll(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete event";
      setError(message);
      showToast("error", "Delete failed", message);
      setPendingDelete(null);
    } finally {
      setDeletingId("");
    }
  }

  return (
    <>
      {/* Page Header */}
      <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h2>
          <p className="text-slate-500 mt-2 text-sm">Welcome back, Admin. {hasActiveProcessing ? "⚡ Active processing in progress." : "System is running smoothly."}</p>
        </div>
        <button onClick={() => void loadAll(false)} className="inline-flex items-center gap-2 rounded-lg bg-white ring-1 ring-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
          <span className="material-symbols-outlined text-[18px]">refresh</span> Refresh
        </button>
      </header>

      {error && <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"><span className="material-symbols-outlined text-[18px]">error</span> {error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <span className="material-symbols-outlined animate-spin text-4xl">progress_activity</span>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-10">
            <StatCard label="Total Users" value={stats?.users ?? 0} icon="group" iconBg="bg-blue-50" iconColor="text-blue-600" trend="+12%" />
            <StatCard label="Total Events" value={stats?.events ?? 0} icon="calendar_month" iconBg="bg-indigo-50" iconColor="text-indigo-600" trend="+5%" />
            <StatCard label="Active Jobs" value={activeJobs} icon="bolt" iconBg="bg-orange-50" iconColor="text-orange-600" />
            <StatCard label="Completed Today" value={completedToday} icon="photo_library" iconBg="bg-pink-50" iconColor="text-pink-600" trend="+15%" />
          </section>

          {/* Live Events Table */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 bg-slate-50/50 rounded-t-xl">
              <div className="flex items-center gap-3">
                {hasActiveProcessing && <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
                <h3 className="text-lg font-bold text-slate-900">Live Events Processing</h3>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{filteredEvents.length} events</span>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-56 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs font-medium focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="Filter events..."
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="whitespace-nowrap px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Event Name</th>
                    <th className="whitespace-nowrap px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Photographer</th>
                    <th className="whitespace-nowrap px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Status</th>
                    <th className="whitespace-nowrap px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider w-1/4">Progress</th>
                    <th className="whitespace-nowrap px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Photos</th>
                    <th className="whitespace-nowrap px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEvents.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">No events found.</td></tr>
                  ) : filteredEvents.map((event) => {
                    const meta = getStatusMeta(event.status);
                    const pct = event.progress_percentage.toFixed(1);
                    const isRunning = event.status === "RUNNING";
                    return (
                      <tr key={event.event_id} className="group hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900">{event.event_name}</span>
                            <span className="text-xs text-slate-400 font-mono mt-0.5">#{event.event_id.slice(0, 8)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold uppercase">
                              {event.owner_email.charAt(0)}
                            </div>
                            <span className="text-slate-700 font-medium text-xs">{event.owner_email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold border shadow-sm ${meta.badge}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="font-medium text-slate-500">{isRunning ? "Processing..." : event.status === "QUEUED" ? "Waiting..." : "Done"}</span>
                              <span className={`font-bold ${isRunning ? "text-primary" : "text-slate-500"}`}>{pct}%</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full transition-all ${event.status === "FAILED" ? "bg-red-500" :
                                    event.status === "COMPLETED" ? "bg-indigo-500" :
                                      isRunning ? "bg-primary shadow-[0_0_8px_rgba(72,72,229,0.5)] animate-pulse" : "bg-amber-400"
                                  }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600">
                          {event.processed_photos}/{event.total_photos}
                          {event.failed_photos > 0 && <span className="text-red-500 ml-1">({event.failed_photos} failed)</span>}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <Link
                              href={`/admin/events/${event.event_id}`}
                              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:border-primary hover:text-primary"
                            >
                              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                              View
                            </Link>
                            {canCancel(event.status) ? (
                              <button
                                onClick={() => void onCancel(event.event_id, event.event_name)}
                                disabled={cancelingId === event.event_id}
                                className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-all hover:bg-red-100 hover:border-red-300 disabled:opacity-50"
                              >
                                <span className="material-symbols-outlined text-[16px]">cancel</span>
                                {cancelingId === event.event_id ? "Canceling..." : "Cancel"}
                              </button>
                            ) : null}
                            {canDelete ? (
                              <button
                                onClick={() => requestDelete(event.event_id, event.event_name)}
                                disabled={deletingId === event.event_id}
                                className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-all hover:bg-red-100 hover:border-red-300 disabled:opacity-50"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                {deletingId === event.event_id ? "Deleting..." : "Delete"}
                              </button>
                            ) : null}
                            {!canCancel(event.status) && !canDelete ? (
                              <span className="text-xs text-slate-300">—</span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete Event Permanently?"
        description={pendingDelete ? `"${pendingDelete.eventName}" will be deleted with all photos, vectors, jobs, and guest matches.` : ""}
        confirmLabel="Delete Event"
        cancelLabel="Keep Event"
        loading={Boolean(pendingDelete) && deletingId === pendingDelete?.eventId}
        onCancel={() => {
          if (deletingId) return;
          setPendingDelete(null);
        }}
        onConfirm={() => void confirmDelete()}
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
