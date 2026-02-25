"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AdminEventOverview } from "@/lib/api";
import { deleteEvent, getAdminEventsOverview } from "@/lib/rbac-api";
import { useAuth } from "@/lib/use-auth";

function statusBadge(status: string) {
    const s = status.toLowerCase();
    if (s === "running") return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (s === "queued") return "bg-amber-50 text-amber-700 border-amber-100";
    if (s === "completed" || s === "done") return "bg-indigo-50 text-indigo-700 border-indigo-100";
    if (s === "failed") return "bg-red-50 text-red-700 border-red-100";
    return "bg-slate-100 text-slate-600 border-slate-200";
}

export default function AdminEventsPage() {
    const auth = useAuth();
    const [data, setData] = useState<AdminEventOverview[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [deletingId, setDeletingId] = useState("");

    const canDelete = auth.user?.role === "SUPER_ADMIN";

    async function load() {
        setLoading(true); setError("");
        try { const res = await getAdminEventsOverview(100); setData(res.events); }
        catch (err) { setError(err instanceof Error ? err.message : "Failed to load events"); }
        finally { setLoading(false); }
    }

    async function onDelete(eventId: string, eventName: string) {
        if (!canDelete) return;
        const ok = window.confirm(`Delete event "${eventName}" permanently? This removes photos, face vectors, guest matches, and jobs.`);
        if (!ok) return;

        setDeletingId(eventId);
        setError("");
        try {
            await deleteEvent(eventId);
            setData((prev) => prev.filter((item) => item.event_id !== eventId));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete event");
        } finally {
            setDeletingId("");
        }
    }

    useEffect(() => { void load(); }, []);

    const filtered = useMemo(() =>
        search ? data.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()) || e.slug.includes(search.toLowerCase())) : data,
        [data, search]
    );

    return (
        <>
            <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Events Overview</h1>
                    <p className="mt-2 text-slate-500 text-sm">All events across the platform with processing status and counters.</p>
                </div>
                <button onClick={load} className="inline-flex items-center gap-2 rounded-lg bg-white ring-1 ring-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm">
                    <span className="material-symbols-outlined text-[18px]">refresh</span> Refresh
                </button>
            </header>

            {error && <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"><span className="material-symbols-outlined text-[18px]">error</span>{error}</div>}

            <div className="mb-5 relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                <input className="block w-full max-w-sm rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" placeholder="Search events or slugs..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
                                    <th className="px-6 py-4 font-semibold">Event</th>
                                    <th className="px-6 py-4 font-semibold">Status</th>
                                    <th className="px-6 py-4 font-semibold">Photos</th>
                                    <th className="px-6 py-4 font-semibold">Faces</th>
                                    <th className="px-6 py-4 font-semibold">Jobs</th>
                                    <th className="px-6 py-4 font-semibold">Queries</th>
                                    <th className="px-6 py-4 font-semibold">Created</th>
                                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-400">No events found.</td></tr>
                                ) : filtered.map((ev) => (
                                    <tr key={ev.event_id} className="group hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-900 group-hover:text-primary transition-colors">{ev.name}</span>
                                                <span className="text-xs text-slate-400 font-mono">/{ev.slug}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${statusBadge(ev.status)}`}>
                                                {ev.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium">{ev.counters.photos.toLocaleString()}</td>
                                        <td className="px-6 py-4">{ev.counters.faces.toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <span className="text-slate-900">{ev.counters.jobs}</span>
                                            {ev.counters.running_jobs > 0 && <span className="ml-1 text-xs text-orange-500">({ev.counters.running_jobs} running)</span>}
                                            {ev.counters.failed_jobs > 0 && <span className="ml-1 text-xs text-red-500">({ev.counters.failed_jobs} failed)</span>}
                                        </td>
                                        <td className="px-6 py-4">{ev.counters.guest_queries}</td>
                                        <td className="px-6 py-4 text-xs text-slate-500">{new Date(ev.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="inline-flex items-center gap-2">
                                                <Link href={`/admin/events/${ev.event_id}`} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-primary hover:text-primary transition-all shadow-sm">
                                                    <span className="material-symbols-outlined text-[14px]">open_in_new</span> View
                                                </Link>
                                                {canDelete ? (
                                                    <button
                                                        onClick={() => void onDelete(ev.event_id, ev.name)}
                                                        disabled={deletingId === ev.event_id}
                                                        className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">delete</span>
                                                        {deletingId === ev.event_id ? "Deleting..." : "Delete"}
                                                    </button>
                                                ) : null}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="border-t border-slate-200 px-6 py-3 text-xs text-slate-500">
                        Showing <span className="font-medium text-slate-900">{filtered.length}</span> of <span className="font-medium text-slate-900">{data.length}</span> events
                    </div>
                </div>
            )}
        </>
    );
}
