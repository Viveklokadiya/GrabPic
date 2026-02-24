"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getPhotographerEventGuests } from "@/lib/rbac-api";
import type { EventGuestInfo } from "@/lib/api";

function matchStatusBadge(photos: number) {
    if (photos >= 10) return "bg-green-100 text-green-700 border border-green-200";
    if (photos > 0) return "bg-primary/10 text-primary border border-primary/20";
    return "bg-slate-100 text-slate-600 border border-slate-200";
}

function avatarGradient(index: number) {
    const gradients = [
        "from-purple-500 to-indigo-600",
        "from-pink-500 to-rose-500",
        "from-blue-500 to-cyan-500",
        "from-emerald-500 to-teal-600",
        "from-amber-500 to-orange-500",
    ];
    return gradients[index % gradients.length];
}

export default function EventGuestManagementPage() {
    const params = useParams<{ eventId: string }>();
    const eventId = useMemo(() => String(params?.eventId ?? ""), [params]);

    const [guests, setGuests] = useState<EventGuestInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("All");

    useEffect(() => {
        getPhotographerEventGuests(eventId)
            .then((res) => setGuests(res.guests ?? []))
            .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load guests"))
            .finally(() => setLoading(false));
    }, [eventId]);

    const totalPhotos = guests.reduce(() => 0, 0); // Placeholder — backend doesn't return photo count per guest here
    const filtered = guests.filter((g) => {
        const matchSearch = g.email.toLowerCase().includes(search.toLowerCase());
        return matchSearch;
    });

    return (
        <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-slate-400">
                <Link href="/photographer/events" className="hover:text-primary transition-colors">Events</Link>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <Link href={`/photographer/events/${eventId}`} className="hover:text-primary transition-colors">Event</Link>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="text-slate-900 font-medium">Guest List</span>
            </nav>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Guest List</h1>
                    <p className="text-slate-500 mt-1 text-sm">Manage guest access and monitor photo matching status.</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
                        <span className="material-symbols-outlined text-[18px]">file_download</span>
                        Export CSV
                    </button>
                    <button className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all">
                        <span className="material-symbols-outlined text-[18px]">person_add</span>
                        Invite Guests
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                    { label: "Total Guests", value: guests.length, icon: "groups", color: "bg-primary/10 text-primary", trend: "+12 this week" },
                    { label: "Photos Matched", value: totalPhotos.toLocaleString(), icon: "photo_library", color: "bg-green-100 text-green-600", trend: "Avg. 8.5 per guest" },
                    { label: "Pending Matches", value: 0, icon: "hourglass_top", color: "bg-orange-100 text-orange-600", trend: "Needs review" },
                ].map((s) => (
                    <div key={s.label} className="relative overflow-hidden flex flex-col gap-1 rounded-xl p-5 bg-white border border-slate-200 shadow-sm">
                        <div className={`absolute right-4 top-4 p-2 rounded-lg ${s.color}`}>
                            <span className="material-symbols-outlined text-[22px]">{s.icon}</span>
                        </div>
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{s.label}</p>
                        <p className="text-3xl font-bold text-slate-900 font-mono">{loading ? "—" : s.value}</p>
                        <p className="text-xs text-slate-400">{s.trend}</p>
                    </div>
                ))}
            </div>

            {/* Table Card */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {/* Toolbar */}
                <div className="flex flex-col md:flex-row gap-4 items-center p-5 border-b border-slate-100">
                    <div className="relative w-full md:max-w-sm">
                        <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                            <span className="material-symbols-outlined text-[18px]">search</span>
                        </span>
                        <input
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                            placeholder="Search by name or email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="flex p-1 bg-slate-100 rounded-lg">
                            {["All", "Matched", "Pending"].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-1.5 rounded text-sm font-medium transition-all ${filter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                                        }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                        <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                            <span className="material-symbols-outlined text-[18px]">sort</span>
                            Sort: Newest
                        </button>
                    </div>
                </div>

                {/* Error */}
                {error && <div className="px-6 py-3 bg-red-50 text-sm text-red-700 border-b border-red-100">{error}</div>}

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 w-12">
                                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Guest</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Contact Info</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Match Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Join Date</th>
                                <th className="px-6 py-4 relative"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i}>
                                        {[...Array(6)].map((_, j) => (
                                            <td key={j} className="px-6 py-4">
                                                <div className="h-4 bg-slate-100 rounded animate-pulse" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center">
                                        <span className="material-symbols-outlined text-5xl text-slate-300 block mb-3">person_search</span>
                                        <p className="text-slate-400 text-sm">No guests found</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((guest, idx) => {
                                    const initials = guest.email.slice(0, 2).toUpperCase();
                                    const mockPhotos = [12, 48, 0, 3, 0][idx % 5];
                                    return (
                                        <tr key={guest.user_id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-br ${avatarGradient(idx)} flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
                                                        {initials}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-900">{guest.email.split("@")[0]}</p>
                                                        <p className="text-xs text-slate-400 md:hidden">{guest.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 hidden md:table-cell">
                                                <p className="text-sm text-slate-600">{guest.email}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Link
                                                    href={`/photographer/events/${eventId}/guests/${guest.user_id}`}
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${matchStatusBadge(mockPhotos)} hover:opacity-80 transition-opacity`}
                                                >
                                                    {mockPhotos > 0 ? (
                                                        <>
                                                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                                            {mockPhotos} Photos Found
                                                        </>
                                                    ) : (
                                                        "No Matches Yet"
                                                    )}
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500">
                                                {new Date(guest.joined_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="text-slate-300 hover:text-primary p-1 rounded transition-colors">
                                                    <span className="material-symbols-outlined text-[20px]">more_vert</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading && filtered.length > 0 && (
                    <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                        <p className="text-sm text-slate-500">
                            Showing <span className="font-semibold">{filtered.length}</span> of{" "}
                            <span className="font-semibold">{guests.length}</span> guests
                        </p>
                        <div className="flex items-center gap-1">
                            <button className="flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50">
                                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                            </button>
                            <button className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-white text-sm font-bold">1</button>
                            <button className="flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50">
                                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
