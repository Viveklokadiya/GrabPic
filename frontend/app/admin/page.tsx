"use client";

import { useEffect, useMemo, useState } from "react";

import type { AdminEventStatusItem, AdminJobRow, GlobalStatsResponse } from "@/lib/api";
import { cancelAdminEvent, getAdminEventsStatus, getAdminJobs, getAdminMetrics } from "@/lib/rbac-api";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="rounded-xl border border-line bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </article>
  );
}

function canCancel(status: string): boolean {
  return status === "QUEUED" || status === "RUNNING";
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<GlobalStatsResponse | null>(null);
  const [events, setEvents] = useState<AdminEventStatusItem[]>([]);
  const [jobs, setJobs] = useState<AdminJobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelingEventId, setCancelingEventId] = useState("");

  const hasActiveProcessing = useMemo(() => events.some((item) => item.status === "QUEUED" || item.status === "RUNNING"), [events]);
  const runningJobs = useMemo(
    () => jobs.filter((job) => job.status === "queued" || job.status === "running" || job.status === "cancel_requested").length,
    [jobs]
  );
  const completedToday = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return jobs.filter((job) => job.status === "completed" && new Date(job.updated_at).getTime() >= start).length;
  }, [jobs]);

  async function loadAll(silent = false) {
    if (!silent) setLoading(true);
    setError("");
    try {
      const [metrics, eventRows, jobRows] = await Promise.all([getAdminMetrics(), getAdminEventsStatus(), getAdminJobs(300)]);
      setStats(metrics);
      setEvents(eventRows);
      setJobs(jobRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin dashboard");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll(false);
  }, []);

  useEffect(() => {
    if (!hasActiveProcessing) return;
    const timer = window.setInterval(() => {
      void loadAll(true);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [hasActiveProcessing]);

  async function onCancelEvent(eventId: string) {
    setCancelingEventId(eventId);
    setError("");
    setEvents((prev) => prev.map((item) => (item.event_id === eventId ? { ...item, status: "CANCELLED" } : item)));
    try {
      await cancelAdminEvent(eventId);
      await loadAll(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel event job");
    } finally {
      setCancelingEventId("");
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading admin dashboard...</p>;

  return (
    <main className="grid gap-4">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total events" value={stats?.events || 0} />
        <StatCard label="Total users" value={stats?.users || 0} />
        <StatCard label="Running jobs" value={runningJobs} />
        <StatCard label="Completed today" value={completedToday} />
      </section>

      <section className="rounded-xl border border-line bg-white p-4">
        <h2 className="font-display text-xl font-semibold text-slate-900">Events Processing Overview</h2>
        <p className="mt-1 text-xs text-muted">
          Polling every 2s while any event is queued/running. Admin can cancel active processing jobs.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr>
                <th className="py-2 pr-3">Event Name</th>
                <th className="py-2 pr-3">Owner</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Processed / Total</th>
                <th className="py-2 pr-3">Progress %</th>
                <th className="py-2 pr-3">Last Updated</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.event_id} className="border-t border-line">
                  <td className="py-2 pr-3">{event.event_name}</td>
                  <td className="py-2 pr-3">{event.owner_email}</td>
                  <td className="py-2 pr-3">{event.status}</td>
                  <td className="py-2 pr-3">
                    {event.processed_photos} / {event.total_photos}
                    {event.failed_photos > 0 ? ` (failed ${event.failed_photos})` : ""}
                  </td>
                  <td className="py-2 pr-3">{event.progress_percentage.toFixed(1)}%</td>
                  <td className="py-2 pr-3">{new Date(event.last_updated).toLocaleString()}</td>
                  <td className="py-2">
                    <button
                      className="btn btn-secondary text-xs"
                      type="button"
                      disabled={!canCancel(event.status) || cancelingEventId === event.event_id}
                      onClick={() => void onCancelEvent(event.event_id)}
                    >
                      {cancelingEventId === event.event_id ? "Canceling..." : "Cancel"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!events.length ? <p className="text-sm text-muted">No events found.</p> : null}
        </div>
      </section>
    </main>
  );
}
