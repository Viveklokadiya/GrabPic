"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { getPhotographerEventStatus } from "@/lib/rbac-api";
import type { EventProcessingStatusResponse } from "@/lib/api";

type ActivityLog = {
    time: string;
    filename: string;
    status: "matched" | "processing" | "error" | "synced";
    matchLabel?: string;
    confidence?: number;
    error?: string;
};

const MOCK_LOGS: ActivityLog[] = [
    { time: "10:42:05", filename: "IMG_9901.CR3", status: "matched", matchLabel: "Speaker A", confidence: 98 },
    { time: "10:42:03", filename: "IMG_9902.CR3", status: "matched", matchLabel: "Speaker B", confidence: 92 },
    { time: "10:42:01", filename: "IMG_9903.CR3", status: "processing" },
    { time: "10:41:55", filename: "IMG_9899.CR3", status: "error", error: "Upload Failed (Err 404)" },
    { time: "10:41:48", filename: "IMG_9898.CR3", status: "matched", matchLabel: "Crowd Group C", confidence: 88 },
    { time: "10:41:42", filename: "IMG_9897.CR3", status: "matched", matchLabel: "VIP Guest", confidence: 99 },
];

export default function LiveEventSyncPage() {
    const params = useParams<{ eventId: string }>();
    const eventId = useMemo(() => String(params?.eventId ?? ""), [params]);

    const [statusData, setStatusData] = useState<EventProcessingStatusResponse | null>(null);
    const [activityFilter, setActivityFilter] = useState("All Activities");
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        const fetch = () => { getPhotographerEventStatus(eventId).then(setStatusData).catch(() => { }); };
        fetch();
        intervalRef.current = setInterval(fetch, 3000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [eventId]);

    const isLive = statusData?.status === "RUNNING" || statusData?.status === "QUEUED";
    const progress = statusData?.progress_percentage ?? 46;
    const totalPhotos = statusData?.total_photos ?? 4502;
    const processed = statusData?.processed_photos ?? 2100;
    const failed = statusData?.failed_photos ?? 3;

    return (
        <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-slate-400">
                <Link href="/photographer/events" className="hover:text-primary transition-colors">Events</Link>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <Link href={`/photographer/events/${eventId}`} className="hover:text-primary transition-colors">Event</Link>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="text-slate-900 font-medium">Live Sync Monitor</span>
            </nav>

            {/* Event Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2 border-b border-slate-200">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${isLive ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"}`}>
                            <span className={`size-2 rounded-full ${isLive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                            {isLive ? "Live Sync Active" : (statusData?.status ?? "Idle")}
                        </span>
                        <span className="text-slate-400 text-sm">ID: #{eventId.slice(0, 8).toUpperCase()}</span>
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Annual Tech Summit 2024</h1>
                    <p className="text-slate-500 text-sm">San Francisco, CA • Main Auditorium</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 h-10 px-5 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-all">
                        <span className="material-symbols-outlined text-[18px]">pause_circle</span>
                        Pause
                    </button>
                    <Link
                        href={`/photographer/events/${eventId}`}
                        className="flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-white text-sm font-semibold shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all"
                    >
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                        View Gallery
                    </Link>
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                    {
                        label: "Total Photos Found",
                        value: totalPhotos.toLocaleString(),
                        icon: "photo_library",
                        color: "text-primary bg-primary/10",
                        accent: "bg-primary",
                        badge: "+12%",
                        badgeColor: "text-emerald-600 bg-emerald-50",
                    },
                    {
                        label: "AI Processed & Tagged",
                        value: processed.toLocaleString(),
                        icon: "auto_awesome",
                        color: "text-emerald-600 bg-emerald-50",
                        accent: "bg-emerald-500",
                        badge: "450 photos/hr",
                        badgeColor: "text-slate-500 bg-slate-50",
                    },
                    {
                        label: "Failed Uploads",
                        value: failed.toString(),
                        icon: "warning",
                        color: "text-rose-600 bg-rose-50",
                        accent: "bg-rose-500",
                        badge: "+1 new",
                        badgeColor: "text-rose-600 bg-rose-50",
                    },
                ].map((s) => (
                    <div key={s.label} className="relative overflow-hidden rounded-xl bg-white p-6 border border-slate-200 shadow-sm">
                        <div className={`absolute right-0 top-0 h-full w-1 ${s.accent}`} />
                        <div className="flex items-start justify-between mb-4">
                            <div className={`p-2 rounded-lg ${s.color}`}>
                                <span className="material-symbols-outlined text-[22px]">{s.icon}</span>
                            </div>
                            <span className={`flex items-center text-xs font-bold px-2 py-1 rounded ${s.badgeColor}`}>{s.badge}</span>
                        </div>
                        <p className="text-sm text-slate-500 mb-1">{s.label}</p>
                        <p className="text-3xl font-bold text-slate-900 font-mono">{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Progress */}
            <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-6">
                <div className="flex flex-col gap-4">
                    <div className="flex items-end justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Batch Processing</h3>
                            <p className="text-slate-500 text-sm mt-0.5">Processing RAW files from Card A...</p>
                        </div>
                        <span className="text-3xl font-bold text-primary font-mono">{progress.toFixed(0)}%</span>
                    </div>
                    <div className="relative w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${progress}%`, boxShadow: "0 0 15px rgba(72,72,229,0.5)" }}
                        />
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2 text-slate-500">
                            <span className="material-symbols-outlined text-[16px]">timer</span>
                            Estimated remaining: <span className="text-slate-900 font-mono font-medium ml-1">12m 30s</span>
                        </div>
                        <button className="text-xs text-slate-400 hover:text-primary font-medium transition-colors">View Queue Details</button>
                    </div>
                </div>
            </div>

            {/* Activity Log */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900">Recent Activity Log</h3>
                    <div className="flex gap-2">
                        <select
                            className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-primary"
                            value={activityFilter}
                            onChange={(e) => setActivityFilter(e.target.value)}
                        >
                            <option>All Activities</option>
                            <option>Matched Only</option>
                            <option>Errors Only</option>
                        </select>
                        <button className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-[18px]">refresh</span>
                        </button>
                    </div>
                </div>

                <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <div className="col-span-2">Time</div>
                        <div className="col-span-4">Filename</div>
                        <div className="col-span-4">Status / Match</div>
                        <div className="col-span-2 text-right">Confidence</div>
                    </div>

                    {/* Log items */}
                    <div className="flex flex-col divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
                        {MOCK_LOGS.map((log, i) => (
                            <div
                                key={i}
                                className={`grid grid-cols-12 gap-4 px-6 py-3 items-center transition-colors ${log.status === "error"
                                        ? "bg-rose-50/60 hover:bg-rose-100/40"
                                        : "hover:bg-slate-50/70"
                                    }`}
                            >
                                <div className="col-span-2 text-slate-400 font-mono text-sm">{log.time}</div>
                                <div className="col-span-4 flex items-center gap-3">
                                    <span className={`material-symbols-outlined text-[18px] ${log.status === "error" ? "text-rose-500" : "text-slate-400"}`}>
                                        {log.status === "error" ? "broken_image" : "image"}
                                    </span>
                                    <span className="text-slate-900 text-sm font-medium">{log.filename}</span>
                                </div>
                                <div className="col-span-4 flex items-center gap-2">
                                    <span className={`size-2 rounded-full flex-shrink-0 ${log.status === "matched" ? "bg-emerald-500" :
                                            log.status === "processing" ? "bg-primary animate-pulse" :
                                                "bg-rose-500"
                                        }`} />
                                    {log.status === "matched" ? (
                                        <span className="text-emerald-700 text-sm font-medium">Matched: {log.matchLabel}</span>
                                    ) : log.status === "processing" ? (
                                        <span className="text-primary text-sm font-medium">AI Processing...</span>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span className="text-rose-600 text-sm font-medium">{log.error}</span>
                                            <button className="text-xs bg-rose-500 text-white px-2 py-0.5 rounded hover:bg-rose-600 transition-colors">Retry</button>
                                        </div>
                                    )}
                                </div>
                                <div className={`col-span-2 text-right font-mono text-sm ${log.status === "error" ? "text-rose-500" : "text-slate-900"}`}>
                                    {log.confidence ? `${log.confidence}%` : log.status === "processing" ? "—" : "Err"}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center text-xs text-slate-400">
                        <span>Showing recent 50 activities</span>
                        <a href="#" className="hover:text-primary font-medium transition-colors">View full history</a>
                    </div>
                </div>
            </div>
        </div>
    );
}
