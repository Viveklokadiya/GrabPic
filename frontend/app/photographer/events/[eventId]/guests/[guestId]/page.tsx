"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";

const MOCK_PHOTOS = [
    { id: "1", name: "DSC_8842.JPG", time: "14:32 PM", confidence: 99, level: "high" },
    { id: "2", name: "DSC_8901.JPG", time: "14:45 PM", confidence: 94, level: "high" },
    { id: "3", name: "DSC_9022.JPG", time: "15:10 PM", confidence: 81, level: "medium" },
    { id: "4", name: "DSC_9105.JPG", time: "15:30 PM", confidence: 92, level: "high" },
    { id: "5", name: "DSC_9332.JPG", time: "16:15 PM", confidence: 97, level: "high" },
    { id: "6", name: "DSC_9401.JPG", time: "16:45 PM", confidence: 78, level: "medium" },
];

function confidenceBadge(level: string) {
    if (level === "high") return "bg-white/90 text-emerald-600 border border-emerald-200";
    return "bg-white/90 text-amber-600 border border-amber-200";
}

function confidenceIcon(level: string) {
    return level === "high" ? "check_circle" : "warning";
}

export default function GuestMatchingDeepDivePage() {
    const params = useParams<{ eventId: string; guestId: string }>();
    const eventId = useMemo(() => String(params?.eventId ?? ""), [params]);
    const guestId = useMemo(() => String(params?.guestId ?? ""), [params]);

    return (
        <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-slate-400">
                <Link href="/photographer/events" className="hover:text-primary transition-colors">Events</Link>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <Link href={`/photographer/events/${eventId}/guests`} className="hover:text-primary transition-colors">Guests</Link>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="text-slate-900 font-medium">Guest Matching</span>
            </nav>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                        <Link href={`/photographer/events/${eventId}`} className="hover:text-primary transition-colors">Events</Link>
                        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                        <span className="text-slate-900 font-medium">Guest ID: {guestId.slice(0, 8)}</span>
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Guest Matching</h1>
                    <p className="text-slate-500 mt-1 text-sm">Manage AI facial recognition results. Review matches and confidence scores.</p>
                </div>
                <div className="flex gap-3">
                    <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                        Delete Guest
                    </button>
                    <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">autorenew</span>
                        Re-run Match
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left: Guest Reference */}
                <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-5">
                    {/* Reference Selfie Card */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100">
                            <h3 className="font-semibold text-slate-900">Reference Selfie</h3>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                <span className="size-1.5 rounded-full bg-emerald-500" />
                                Active
                            </span>
                        </div>
                        <div className="p-5 flex flex-col items-center">
                            <div className="relative w-full aspect-[4/5] rounded-lg overflow-hidden mb-4 group cursor-pointer shadow-md bg-slate-100 flex items-center justify-center">
                                <span className="material-symbols-outlined text-5xl text-slate-300">person</span>
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                                    <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 transition-all text-4xl">edit</span>
                                </div>
                            </div>
                            <div className="w-full space-y-2 text-sm">
                                <div className="flex items-center gap-2 py-1.5 border-b border-slate-50">
                                    <span className="material-symbols-outlined text-[16px] text-slate-400">mail</span>
                                    <span className="text-slate-500">Email</span>
                                    <span className="font-medium text-slate-900 ml-auto truncate">guest@example.com</span>
                                </div>
                                <div className="flex items-center gap-2 py-1.5 border-b border-slate-50">
                                    <span className="material-symbols-outlined text-[16px] text-slate-400">call</span>
                                    <span className="text-slate-500">Phone</span>
                                    <span className="font-medium text-slate-900 ml-auto">+1 (555) 012-3456</span>
                                </div>
                                <div className="flex items-center gap-2 py-1.5">
                                    <span className="material-symbols-outlined text-[16px] text-slate-400">schedule</span>
                                    <span className="text-slate-500">Added</span>
                                    <span className="font-medium text-slate-900 ml-auto">2 hours ago</span>
                                </div>
                            </div>
                            <button className="mt-5 w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">
                                <span className="material-symbols-outlined text-[16px]">upload</span>
                                Update Reference Photo
                            </button>
                        </div>
                    </div>

                    {/* Detection Stats */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Detection Stats</h3>
                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between text-sm mb-1.5">
                                    <span className="text-slate-600">Confidence Threshold</span>
                                    <span className="font-bold text-primary">85%</span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                    <div className="h-full rounded-full bg-primary w-[85%]" />
                                </div>
                            </div>
                            <div className="flex justify-between items-center py-2 border-t border-slate-100">
                                <span className="text-sm text-slate-600">Total Matches</span>
                                <span className="text-lg font-bold text-slate-900">14</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-t border-slate-100">
                                <span className="text-sm text-slate-600">Rejected</span>
                                <span className="text-lg font-bold text-slate-900">2</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Matched Gallery */}
                <div className="lg:col-span-8 xl:col-span-9">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm min-h-[600px] flex flex-col">
                        {/* Gallery Toolbar */}
                        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
                            <h2 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                                Matched Photos
                                <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                                    {MOCK_PHOTOS.length} found
                                </span>
                            </h2>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <span>Sort by:</span>
                                    <select className="bg-transparent border-none p-0 pr-6 text-slate-900 font-medium focus:ring-0 cursor-pointer text-sm">
                                        <option>Confidence Score</option>
                                        <option>Time Taken</option>
                                        <option>Newest First</option>
                                    </select>
                                </div>
                                <div className="h-4 w-px bg-slate-200" />
                                <button className="text-primary">
                                    <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>grid_view</span>
                                </button>
                                <button className="text-slate-400 hover:text-primary transition-colors">
                                    <span className="material-symbols-outlined text-[22px]">view_list</span>
                                </button>
                            </div>
                        </div>

                        {/* Gallery Grid */}
                        <div className="p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {MOCK_PHOTOS.map((photo) => (
                                <div
                                    key={photo.id}
                                    className="group relative bg-slate-100 rounded-lg overflow-hidden border border-slate-200 hover:shadow-lg hover:border-primary/50 transition-all"
                                >
                                    {/* Image placeholder */}
                                    <div className="aspect-square bg-gradient-to-br from-slate-200 to-slate-300 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10" />
                                        <div className="w-full h-full flex items-center justify-center">
                                            <span className="material-symbols-outlined text-5xl text-slate-400">image</span>
                                        </div>

                                        {/* Confidence Badge */}
                                        <div className="absolute top-2 left-2 z-20">
                                            <span className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-bold shadow-sm backdrop-blur-sm ${confidenceBadge(photo.level)}`}>
                                                <span className="material-symbols-outlined text-[13px]">{confidenceIcon(photo.level)}</span>
                                                {photo.confidence}% Match
                                            </span>
                                        </div>

                                        {/* Hover Actions */}
                                        <div className="absolute bottom-3 right-3 z-20 flex gap-2 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200">
                                            <button className="h-8 w-8 flex items-center justify-center rounded-full bg-white text-slate-700 shadow-md hover:text-red-600 transition-colors">
                                                <span className="material-symbols-outlined text-[16px]">close</span>
                                            </button>
                                            <button className="h-8 w-8 flex items-center justify-center rounded-full bg-primary text-white shadow-md hover:bg-primary/90 transition-colors">
                                                <span className="material-symbols-outlined text-[16px]">download</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Metadata */}
                                    <div className="p-2.5 flex justify-between items-center text-xs text-slate-400 border-t border-slate-100">
                                        <span>{photo.name}</span>
                                        <span>{photo.time}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        <div className="mt-auto px-6 py-4 border-t border-slate-100 flex justify-center items-center gap-2">
                            <button className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-300 cursor-not-allowed">
                                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                            </button>
                            <button className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary text-white font-semibold text-sm shadow-sm">1</button>
                            <button className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 text-sm transition-colors">2</button>
                            <button className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 text-sm transition-colors">3</button>
                            <button className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
