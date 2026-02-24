"use client";

import { useEffect, useMemo, useState } from "react";
import type { AdminJobRow } from "@/lib/api";
import { getAdminJobs } from "@/lib/rbac-api";

function getJobStatusMeta(status: string) {
    switch (status) {
        case "running": return { badge: "bg-emerald-50 text-emerald-700 border-emerald-100", dot: "bg-emerald-500 animate-pulse" };
        case "queued": return { badge: "bg-amber-50 text-amber-700 border-amber-100", dot: "bg-amber-500" };
        case "completed": return { badge: "bg-indigo-50 text-indigo-700 border-indigo-100", dot: "bg-indigo-500" };
        case "failed": return { badge: "bg-red-50 text-red-700 border-red-100", dot: "bg-red-500" };
        case "cancel_requested": return { badge: "bg-orange-50 text-orange-700 border-orange-100", dot: "bg-orange-400" };
        case "cancelled": return { badge: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" };
        default: return { badge: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" };
    }
}

const JOB_STATUSES = ["", "queued", "running", "completed", "failed", "cancelled"];

export default function AdminJobsPage() {
    const [jobs, setJobs] = useState<AdminJobRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [search, setSearch] = useState("");

    async function load() {
        setLoading(true); setError("");
        try { setJobs(await getAdminJobs(200)); }
        catch (err) { setError(err instanceof Error ? err.message : "Failed to load jobs"); }
        finally { setLoading(false); }
    }

    useEffect(() => { void load(); }, []);

    const filtered = useMemo(() =>
        jobs.filter((j) => {
            const matchStatus = !statusFilter || j.status === statusFilter;
            const matchSearch = !search || j.job_id.includes(search) || j.type.toLowerCase().includes(search.toLowerCase()) || j.stage.toLowerCase().includes(search.toLowerCase());
            return matchStatus && matchSearch;
        }), [jobs, statusFilter, search]
    );

    const counts = useMemo(() => ({
        running: jobs.filter((j) => j.status === "running").length,
        queued: jobs.filter((j) => j.status === "queued").length,
        failed: jobs.filter((j) => j.status === "failed").length,
        completed: jobs.filter((j) => j.status === "completed").length,
    }), [jobs]);

    return (
        <>
            <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">AI Jobs Monitor</h1>
                    <p className="mt-2 text-slate-500 text-sm">Monitor background AI processing jobs across all events.</p>
                </div>
                <button onClick={load} className="inline-flex items-center gap-2 rounded-lg bg-white ring-1 ring-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm">
                    <span className="material-symbols-outlined text-[18px]">refresh</span> Refresh
                </button>
            </header>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
                {[
                    { label: "Running", value: counts.running, color: "text-emerald-600", bg: "bg-emerald-50", icon: "bolt" },
                    { label: "Queued", value: counts.queued, color: "text-amber-600", bg: "bg-amber-50", icon: "schedule" },
                    { label: "Failed", value: counts.failed, color: "text-red-600", bg: "bg-red-50", icon: "error" },
                    { label: "Completed", value: counts.completed, color: "text-indigo-600", bg: "bg-indigo-50", icon: "check_circle" },
                ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-white border border-slate-200 p-4 flex items-center gap-3 shadow-sm">
                        <div className={`rounded-lg ${s.bg} p-2.5 ${s.color}`}>
                            <span className="material-symbols-outlined text-[20px]">{s.icon}</span>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">{s.label}</p>
                            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {error && <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"><span className="material-symbols-outlined text-[18px]">error</span>{error}</div>}

            {/* Filters */}
            <div className="mb-5 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                    <input className="block w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" placeholder="Search job ID, type, stage..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <select className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    {JOB_STATUSES.map((s) => <option key={s} value={s}>{s || "All Statuses"}</option>)}
                </select>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20 text-slate-400">
                    <span className="material-symbols-outlined animate-spin text-4xl">progress_activity</span>
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Job ID</th>
                                    <th className="px-6 py-4 font-semibold">Type</th>
                                    <th className="px-6 py-4 font-semibold">Status</th>
                                    <th className="px-6 py-4 font-semibold">Stage</th>
                                    <th className="px-6 py-4 font-semibold">Attempts</th>
                                    <th className="px-6 py-4 font-semibold">Event</th>
                                    <th className="px-6 py-4 font-semibold">Last Run</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">No jobs found.</td></tr>
                                ) : filtered.map((job) => {
                                    const meta = getJobStatusMeta(job.status);
                                    return (
                                        <tr key={job.job_id} className="group hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">{job.job_id.slice(0, 8)}...</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                                                    <span className="material-symbols-outlined text-[14px] text-slate-400">settings</span>
                                                    {job.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${meta.badge}`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                                                    {job.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-500 max-w-[180px] truncate">{job.stage || "—"}</td>
                                            <td className="px-6 py-4">
                                                <span className={`font-medium ${job.attempts > 2 ? "text-red-600" : "text-slate-700"}`}>{job.attempts}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {job.event_id ? (
                                                    <span className="font-mono text-xs text-slate-500">{job.event_id.slice(0, 8)}...</span>
                                                ) : <span className="text-slate-300">—</span>}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-500">{new Date(job.updated_at).toLocaleString()}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="border-t border-slate-200 px-6 py-3 text-xs text-slate-500">
                        Showing <span className="font-medium text-slate-900">{filtered.length}</span> of <span className="font-medium text-slate-900">{jobs.length}</span> jobs
                    </div>
                </div>
            )}
        </>
    );
}
