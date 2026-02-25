"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { AdminEventOverview } from "@/lib/api";
import { cancelAdminEvent, deleteEvent, getAdminEventsOverview } from "@/lib/rbac-api";
import { useAuth } from "@/lib/use-auth";

function statusBadge(status: string) {
    const s = status.toLowerCase();
    if (s === "running") return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (s === "queued") return "bg-amber-50 text-amber-700 border-amber-100";
    if (s.includes("complet") || s === "ready") return "bg-indigo-50 text-indigo-700 border-indigo-100";
    if (s === "failed") return "bg-red-50 text-red-700 border-red-100";
    return "bg-slate-100 text-slate-600 border-slate-200";
}

export default function AdminEventDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const auth = useAuth();
    const [event, setEvent] = useState<AdminEventOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [canceling, setCanceling] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        async function load() {
            setLoading(true); setError("");
            try {
                const res = await getAdminEventsOverview(200);
                const found = res.events.find((e) => e.event_id === id);
                if (!found) { setError("Event not found"); return; }
                setEvent(found);
            } catch (err) { setError(err instanceof Error ? err.message : "Failed to load event"); }
            finally { setLoading(false); }
        }
        void load();
    }, [id]);

    async function handleCancel() {
        if (!event) return;
        setCanceling(true);
        try { await cancelAdminEvent(event.event_id); router.refresh(); }
        catch (err) { setError(err instanceof Error ? err.message : "Failed to cancel"); }
        finally { setCanceling(false); }
    }

    async function handleDelete() {
        if (!event || auth.user?.role !== "SUPER_ADMIN") return;
        const ok = window.confirm(`Delete event "${event.name}" permanently? This removes photos, face vectors, guest matches, and jobs.`);
        if (!ok) return;

        setDeleting(true);
        setError("");
        try {
            await deleteEvent(event.event_id);
            router.push("/admin/events");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete event");
            setDeleting(false);
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center py-20 text-slate-400">
            <span className="material-symbols-outlined animate-spin text-4xl">progress_activity</span>
        </div>
    );

    if (error || !event) return (
        <div className="rounded-lg bg-red-50 border border-red-200 px-6 py-4 text-red-700 text-sm">
            {error || "Event not found."}
        </div>
    );

    const canCancel = event.status === "queued" || event.status === "running" || event.status === "syncing";

    return (
        <>
            {/* Back + Header */}
            <button onClick={() => router.back()} className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to Events
            </button>

            <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-slate-200 pb-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{event.name}</h1>
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${statusBadge(event.status)}`}>
                            {event.status}
                        </span>
                    </div>
                    <p className="text-slate-400 font-mono text-sm">/{event.slug}</p>
                    <p className="text-xs text-slate-400 mt-1">ID: {event.event_id}</p>
                </div>
                <div className="flex gap-2">
                    {auth.user?.role === "SUPER_ADMIN" && (
                        <button onClick={handleDelete} disabled={deleting} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 transition-all disabled:opacity-50">
                            <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                            {deleting ? "Deleting..." : "Delete Event"}
                        </button>
                    )}
                    {canCancel && (
                        <button onClick={handleCancel} disabled={canceling} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 transition-all disabled:opacity-50">
                            <span className="material-symbols-outlined text-[18px]">cancel</span>
                            {canceling ? "Canceling..." : "Cancel Processing"}
                        </button>
                    )}
                    {event.guest_ready && (
                        <a href={event.guest_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">
                            <span className="material-symbols-outlined text-[18px]">open_in_new</span> Guest View
                        </a>
                    )}
                </div>
            </header>

            {/* Counters */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-4 mb-8">
                {[
                    { label: "Photos", value: event.counters.photos, icon: "photo_library", color: "text-pink-600 bg-pink-50" },
                    { label: "Faces", value: event.counters.faces, icon: "face", color: "text-blue-600 bg-blue-50" },
                    { label: "Jobs", value: event.counters.jobs, icon: "work", color: "text-orange-600 bg-orange-50" },
                    { label: "Guest Queries", value: event.counters.guest_queries, icon: "person_search", color: "text-teal-600 bg-teal-50" },
                ].map((c) => (
                    <div key={c.label} className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm flex items-center gap-3">
                        <div className={`rounded-lg p-2.5 ${c.color}`}>
                            <span className="material-symbols-outlined text-[20px]">{c.icon}</span>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">{c.label}</p>
                            <p className="text-2xl font-bold text-slate-900">{c.value.toLocaleString()}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Event Info */}
                <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-6">
                    <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[18px]">info</span> Event Details
                    </h2>
                    <dl className="space-y-3 text-sm">
                        {[
                            { label: "Drive Link", value: event.drive_link, link: event.drive_link },
                            { label: "Drive Folder ID", value: event.drive_folder_id },
                            { label: "Guest Ready", value: event.guest_ready ? "✅ Yes" : "❌ No" },
                            { label: "Guest URL", value: event.guest_url || "Not available", link: event.guest_url },
                            { label: "Created", value: new Date(event.created_at).toLocaleString() },
                            { label: "Updated", value: new Date(event.updated_at).toLocaleString() },
                        ].map((r) => (
                            <div key={r.label} className="flex flex-col sm:flex-row sm:gap-4">
                                <dt className="w-32 shrink-0 text-xs font-semibold uppercase tracking-wider text-slate-400">{r.label}</dt>
                                <dd className="text-slate-700 break-all">
                                    {r.link ? <a href={r.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{r.value}</a> : r.value}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>

                {/* Latest Jobs */}
                <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-6">
                    <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[18px]">work_history</span> Recent Jobs
                    </h2>
                    {event.latest_jobs.length === 0 ? (
                        <p className="text-sm text-slate-400">No jobs yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {event.latest_jobs.map((job) => (
                                <div key={job.job_id} className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                                    <div className="flex flex-col">
                                        <span className="font-mono text-xs text-slate-600">{job.job_id.slice(0, 10)}...</span>
                                        <span className="text-xs text-slate-400">{job.type} · {job.stage}</span>
                                    </div>
                                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold ${statusBadge(job.status)}`}>
                                        {job.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Guest Queries */}
                <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-6 lg:col-span-2">
                    <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[18px]">person_search</span>
                        Recent Guest Queries
                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{event.counters.completed_queries}/{event.counters.guest_queries} completed</span>
                    </h2>
                    {event.latest_queries.length === 0 ? (
                        <p className="text-sm text-slate-400">No guest queries yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs uppercase text-slate-400 border-b border-slate-100">
                                    <tr>
                                        <th className="py-2 pr-4 font-semibold">Query ID</th>
                                        <th className="py-2 pr-4 font-semibold">Status</th>
                                        <th className="py-2 pr-4 font-semibold">Confidence</th>
                                        <th className="py-2 pr-4 font-semibold">Matches</th>
                                        <th className="py-2 font-semibold">Created</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {event.latest_queries.map((q) => (
                                        <tr key={q.query_id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-2 pr-4 font-mono text-xs text-slate-500">{q.query_id.slice(0, 10)}...</td>
                                            <td className="py-2 pr-4">
                                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold ${statusBadge(q.status)}`}>{q.status}</span>
                                            </td>
                                            <td className="py-2 pr-4 text-xs">{(q.confidence * 100).toFixed(1)}%</td>
                                            <td className="py-2 pr-4 text-xs font-medium text-slate-900">{q.match_count} photos</td>
                                            <td className="py-2 text-xs text-slate-400">{new Date(q.created_at).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
