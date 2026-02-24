"use client";

import { useEffect, useState } from "react";
import type { AdminJobRow, GlobalStatsResponse } from "@/lib/api";
import { getAdminJobs, getAdminMetrics } from "@/lib/rbac-api";

function MetricCard({ label, value, icon, color, description }: {
    label: string; value: number; icon: string; color: string; description?: string;
}) {
    return (
        <div className="rounded-xl bg-white border border-slate-200 p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <div className={`rounded-lg p-2.5 ${color}`}>
                    <span className="material-symbols-outlined text-[20px]">{icon}</span>
                </div>
            </div>
            <p className="text-4xl font-bold text-slate-900">{value.toLocaleString()}</p>
            {description && <p className="text-xs text-slate-400">{description}</p>}
        </div>
    );
}

export default function AdminMetricsPage() {
    const [stats, setStats] = useState<GlobalStatsResponse | null>(null);
    const [jobs, setJobs] = useState<AdminJobRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    async function load() {
        setLoading(true); setError("");
        try {
            const [metrics, jobRows] = await Promise.all([getAdminMetrics(), getAdminJobs(200)]);
            setStats(metrics);
            setJobs(jobRows);
        } catch (err) { setError(err instanceof Error ? err.message : "Failed to load metrics"); }
        finally { setLoading(false); }
    }

    useEffect(() => { void load(); }, []);

    const runningJobs = jobs.filter((j) => j.status === "running").length;
    const failedJobs = jobs.filter((j) => j.status === "failed").length;
    const completedJobs = jobs.filter((j) => j.status === "completed").length;
    const errorRate = jobs.length > 0 ? ((failedJobs / jobs.length) * 100).toFixed(1) : "0.0";

    return (
        <>
            <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">System Metrics</h1>
                    <p className="mt-2 text-slate-500 text-sm">Platform-wide health metrics and processing statistics.</p>
                </div>
                <button onClick={load} className="inline-flex items-center gap-2 rounded-lg bg-white ring-1 ring-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm">
                    <span className="material-symbols-outlined text-[18px]">refresh</span> Refresh
                </button>
            </header>

            {error && <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"><span className="material-symbols-outlined text-[18px]">error</span>{error}</div>}

            {loading ? (
                <div className="flex items-center justify-center py-20 text-slate-400">
                    <span className="material-symbols-outlined animate-spin text-4xl">progress_activity</span>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Platform Metrics */}
                    <section>
                        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-[20px]">database</span>
                            Platform Data
                        </h2>
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                            <MetricCard label="Total Users" value={stats?.users ?? 0} icon="group" color="bg-blue-50 text-blue-600" description="All registered accounts" />
                            <MetricCard label="Total Events" value={stats?.events ?? 0} icon="calendar_month" color="bg-indigo-50 text-indigo-600" description="All created events" />
                            <MetricCard label="Total Photos" value={stats?.photos ?? 0} icon="photo_library" color="bg-pink-50 text-pink-600" description="Photos indexed" />
                            <MetricCard label="Total Jobs" value={stats?.jobs ?? 0} icon="work" color="bg-orange-50 text-orange-600" description="All processing jobs" />
                            <MetricCard label="Memberships" value={stats?.memberships ?? 0} icon="person_add" color="bg-teal-50 text-teal-600" description="Guest event joins" />
                        </div>
                    </section>

                    {/* Job Health */}
                    <section>
                        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-[20px]">monitoring</span>
                            Job Health
                        </h2>
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                            <MetricCard label="Running" value={runningJobs} icon="bolt" color="bg-emerald-50 text-emerald-600" />
                            <MetricCard label="Failed" value={failedJobs} icon="error" color="bg-red-50 text-red-600" />
                            <MetricCard label="Completed" value={completedJobs} icon="check_circle" color="bg-indigo-50 text-indigo-600" />
                            <div className="rounded-xl bg-white border border-slate-200 p-6 shadow-sm flex flex-col gap-4">
                                <p className="text-sm font-medium text-slate-500">Error Rate</p>
                                <p className={`text-4xl font-bold ${parseFloat(errorRate) > 5 ? "text-red-600" : "text-emerald-600"}`}>{errorRate}%</p>
                                <p className="text-xs text-slate-400">Of all jobs in view</p>
                            </div>
                        </div>
                    </section>

                    {/* Recent Failed Jobs */}
                    {failedJobs > 0 && (
                        <section>
                            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-red-500 text-[20px]">warning</span>
                                Failed Jobs <span className="text-sm font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full">{failedJobs}</span>
                            </h2>
                            <div className="overflow-hidden rounded-xl border border-red-100 bg-white shadow-sm">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-red-50 text-xs uppercase text-red-400 border-b border-red-100">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold">Job ID</th>
                                            <th className="px-6 py-3 font-semibold">Type</th>
                                            <th className="px-6 py-3 font-semibold">Stage</th>
                                            <th className="px-6 py-3 font-semibold">Attempts</th>
                                            <th className="px-6 py-3 font-semibold">Last Run</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-red-50">
                                        {jobs.filter((j) => j.status === "failed").slice(0, 10).map((job) => (
                                            <tr key={job.job_id} className="hover:bg-red-50/50 transition-colors">
                                                <td className="px-6 py-3 font-mono text-xs text-slate-600">{job.job_id.slice(0, 12)}...</td>
                                                <td className="px-6 py-3 text-xs">{job.type}</td>
                                                <td className="px-6 py-3 text-xs text-red-600 max-w-[200px] truncate">{job.stage || job.error || "—"}</td>
                                                <td className="px-6 py-3 text-xs font-bold text-red-600">{job.attempts}</td>
                                                <td className="px-6 py-3 text-xs text-slate-400">{new Date(job.updated_at).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}
                </div>
            )}
        </>
    );
}
