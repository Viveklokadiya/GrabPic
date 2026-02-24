"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { GuestEventListItem } from "@/lib/api";
import { getGuestEvents } from "@/lib/rbac-api";

function statusBadge(status: string) {
    if (status === "COMPLETED") return { cls: "bg-blue-50 text-blue-600 border-blue-100", dot: "bg-blue-500", label: "Photos Ready" };
    if (status === "RUNNING") return { cls: "bg-orange-50 text-orange-600 border-orange-100", dot: "bg-orange-500 animate-pulse", label: "Processing" };
    return { cls: "bg-slate-50 text-slate-500 border-slate-200", dot: "bg-slate-400", label: "Archived" };
}

export default function GuestHistoryPage() {
    const [events, setEvents] = useState<GuestEventListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState("newest");

    useEffect(() => {
        getGuestEvents()
            .then(setEvents)
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const filtered = events
        .filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
            if (sort === "newest") return new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime();
            return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
        });

    return (
        <div className="min-h-screen bg-[#f6f6f8] font-sans antialiased flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
                <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="size-8 text-blue-600">
                                <svg className="w-full h-full fill-current" viewBox="0 0 48 48">
                                    <path d="M24 4C25.7818 14.2173 33.7827 22.2182 44 24C33.7827 25.7818 25.7818 33.7827 24 44C22.2182 33.7827 14.2173 25.7818 4 24C14.2173 22.2182 22.2182 14.2173 24 4Z" />
                                </svg>
                            </div>
                            <span className="text-xl font-bold tracking-tight text-slate-900">GrabPic</span>
                        </div>
                        <nav className="hidden md:flex items-center gap-8">
                            <Link href="/guest" className="text-sm font-medium text-slate-600 hover:text-blue-500 transition-colors">Home</Link>
                            <Link href="/guest/history" className="text-sm font-medium text-blue-600">My Events</Link>
                            <Link href="/guest/join" className="text-sm font-medium text-slate-600 hover:text-blue-500 transition-colors">Find Photos</Link>
                        </nav>
                        <div className="flex items-center gap-4">
                            <Link href="/guest" className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                                <span className="material-symbols-outlined">home</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-grow max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Your Event History</h1>
                        <p className="text-slate-500 text-lg max-w-2xl">Manage the events you&apos;ve attended and access your photo collections in one place.</p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                                <span className="material-symbols-outlined text-[20px]">search</span>
                            </span>
                            <input
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-slate-900 placeholder:text-slate-400"
                                placeholder="Search events..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <select
                            className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-slate-900 font-medium cursor-pointer"
                            value={sort}
                            onChange={(e) => setSort(e.target.value)}
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                        </select>
                    </div>
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="rounded-xl bg-white border border-slate-100 overflow-hidden animate-pulse">
                                <div className="h-48 bg-slate-200" />
                                <div className="p-5 space-y-3">
                                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                                    <div className="h-3 bg-slate-50 rounded w-1/2" />
                                    <div className="h-8 bg-slate-100 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filtered.map((item) => {
                            const badge = statusBadge(item.status);
                            return (
                                <div key={item.event_id} className="group relative bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-blue-400/30 transition-all duration-300">
                                    <div className="relative h-48 w-full overflow-hidden bg-slate-200 flex items-center justify-center">
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                                        <span className="material-symbols-outlined text-6xl text-slate-300">event</span>
                                        <div className="absolute top-3 right-3 z-20">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md bg-white/90 backdrop-blur text-xs font-semibold shadow-sm ${badge.cls}`}>
                                                <span className={`size-1.5 rounded-full mr-1.5 ${badge.dot}`} />
                                                {badge.label}
                                            </span>
                                        </div>
                                        <div className="absolute bottom-4 left-4 z-20 text-white">
                                            <p className="text-sm font-medium opacity-90 mb-1">{new Date(item.joined_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                                            <h3 className="text-xl font-bold leading-tight">{item.name}</h3>
                                        </div>
                                    </div>
                                    <div className="p-5">
                                        <div className="flex items-center text-slate-500 text-sm mb-6">
                                            <span className="material-symbols-outlined text-[18px] mr-1.5">photo_library</span>
                                            <span>Joined {new Date(item.joined_at).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Link
                                                href={`/guest/my-photos/${item.event_id}`}
                                                className={`flex-1 h-10 px-4 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 ${item.status === "COMPLETED"
                                                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                                                        : "bg-slate-100 text-slate-400 cursor-not-allowed pointer-events-none"
                                                    }`}
                                            >
                                                <span>{item.status === "COMPLETED" ? "View My Photos" : "Processing..."}</span>
                                                {item.status === "COMPLETED" && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
                                            </Link>
                                            <Link
                                                href={`/guest/events/${item.event_id}`}
                                                className="h-10 w-10 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-500 hover:border-blue-200 transition-colors"
                                                title="Open Event"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Join New Event Card */}
                        <Link
                            href="/guest/join"
                            className="group relative flex flex-col items-center justify-center min-h-[380px] rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 hover:border-blue-400 hover:bg-blue-500/5 transition-all duration-300 cursor-pointer"
                        >
                            <div className="flex flex-col items-center text-center p-8 gap-4">
                                <div className="size-16 rounded-full bg-white shadow-sm flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform duration-300">
                                    <span className="material-symbols-outlined text-4xl">add_a_photo</span>
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-bold text-slate-900">Join a new event</h3>
                                    <p className="text-sm text-slate-500">Have an event code or QR?</p>
                                </div>
                                <span className="mt-2 text-blue-500 font-semibold text-sm group-hover:underline">Enter code manually</span>
                            </div>
                        </Link>
                    </div>
                )}

                {!loading && filtered.length === 0 && events.length > 0 && (
                    <div className="text-center py-16 rounded-2xl bg-white border border-slate-100">
                        <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">search_off</span>
                        <p className="text-slate-500 font-medium">No events matched your search.</p>
                    </div>
                )}
            </main>

            <footer className="border-t border-slate-200 bg-white py-8 mt-auto">
                <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-slate-500">© 2024 GrabPic Inc. All rights reserved.</p>
                    <div className="flex gap-6">
                        <Link href="/privacy" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Privacy Policy</Link>
                        <Link href="/terms" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Terms of Service</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
