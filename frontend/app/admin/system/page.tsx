"use client";

import { useEffect, useState } from "react";

import type { AdminJobRow, GlobalStatsResponse } from "@/lib/api";
import { getAdminJobs, getAdminMetrics } from "@/lib/rbac-api";

export default function AdminSystemPage() {
  const [stats, setStats] = useState<GlobalStatsResponse | null>(null);
  const [jobs, setJobs] = useState<AdminJobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function run() {
      setLoading(true);
      setError("");
      try {
        const [metrics, jobRows] = await Promise.all([getAdminMetrics(), getAdminJobs(120)]);
        setStats(metrics);
        setJobs(jobRows);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load system data");
      } finally {
        setLoading(false);
      }
    }
    void run();
  }, []);

  if (loading) return <p className="text-sm text-muted">Loading system metrics...</p>;

  return (
    <main className="grid gap-4">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <article className="rounded-xl border border-line bg-white p-4 text-sm">Users: {stats?.users || 0}</article>
        <article className="rounded-xl border border-line bg-white p-4 text-sm">Events: {stats?.events || 0}</article>
        <article className="rounded-xl border border-line bg-white p-4 text-sm">Photos: {stats?.photos || 0}</article>
        <article className="rounded-xl border border-line bg-white p-4 text-sm">Jobs: {stats?.jobs || 0}</article>
        <article className="rounded-xl border border-line bg-white p-4 text-sm">Memberships: {stats?.memberships || 0}</article>
      </section>

      <section className="rounded-xl border border-line bg-white p-4">
        <h2 className="font-display text-xl font-semibold text-slate-900">Recent jobs</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr>
                <th className="py-2 pr-3">Job</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Last run</th>
                <th className="py-2">Failures</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.job_id} className="border-t border-line">
                  <td className="py-2 pr-3 font-mono text-xs">{job.job_id.slice(0, 8)}</td>
                  <td className="py-2 pr-3">{job.type}</td>
                  <td className="py-2 pr-3">{job.status}</td>
                  <td className="py-2 pr-3">{new Date(job.updated_at).toLocaleString()}</td>
                  <td className="py-2">{job.attempts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
