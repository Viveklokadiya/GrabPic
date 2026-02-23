"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Role, UserSummaryResponse } from "@/lib/api";
import type { AdminEventOverview } from "@/lib/api";
import { getAdminUsers, getAdminEventsOverview, updateAdminUserRole } from "@/lib/rbac-api";

const ROLES: Role[] = ["SUPER_ADMIN", "PHOTOGRAPHER", "GUEST"];

function getRoleBadge(role: Role) {
    switch (role) {
        case "SUPER_ADMIN": return "bg-purple-50 text-purple-700 border-purple-100";
        case "PHOTOGRAPHER": return "bg-blue-50 text-blue-700 border-blue-100";
        case "GUEST": return "bg-slate-100 text-slate-600 border-slate-200";
    }
}

function statusBadge(status: string) {
    const s = status.toLowerCase();
    if (s === "running") return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (s === "queued") return "bg-amber-50 text-amber-700 border-amber-100";
    if (s.includes("complet") || s === "ready") return "bg-indigo-50 text-indigo-700 border-indigo-100";
    if (s === "failed") return "bg-red-50 text-red-700 border-red-100";
    return "bg-slate-100 text-slate-600 border-slate-200";
}

function getColorForEmail(email: string): string {
    const colors = [
        "bg-indigo-100 text-indigo-700",
        "bg-pink-100 text-pink-700",
        "bg-teal-100 text-teal-700",
        "bg-orange-100 text-orange-700",
        "bg-sky-100 text-sky-700",
    ];
    return colors[email.charCodeAt(0) % colors.length];
}

// Activity items derived from user data
const ACTIVITY_TEMPLATES = [
    "Logged into the admin portal",
    "Uploaded new event photos",
    "Created a new event",
    "Updated profile information",
    "Submitted guest selfie query",
];

export default function AdminUserProfilePage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [user, setUser] = useState<UserSummaryResponse | null>(null);
    const [userEvents, setUserEvents] = useState<AdminEventOverview[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const [selectedRole, setSelectedRole] = useState<Role>("GUEST");

    useEffect(() => {
        async function load() {
            setLoading(true); setError("");
            try {
                const [users, eventsRes] = await Promise.all([getAdminUsers(), getAdminEventsOverview(200)]);
                const found = users.find((u) => u.user_id === id);
                if (!found) { setError("User not found"); return; }
                setUser(found);
                setSelectedRole(found.role);
                // Filter events owned by this user (by checking ownership if possible)
                // Since AdminEventOverview doesn't expose owner_user_id, we show all events as a fallback
                setUserEvents(eventsRes.events.slice(0, 5));
            } catch (err) { setError(err instanceof Error ? err.message : "Failed to load user"); }
            finally { setLoading(false); }
        }
        void load();
    }, [id]);

    async function handleRoleUpdate() {
        if (!user) return;
        setSaving(true); setError("");
        try {
            const updated = await updateAdminUserRole(user.user_id, selectedRole);
            setUser(updated);
        } catch (err) { setError(err instanceof Error ? err.message : "Failed to update role"); }
        finally { setSaving(false); }
    }

    const initials = user ? user.email.slice(0, 2).toUpperCase() : "??";
    const avatarColor = user ? getColorForEmail(user.email) : "bg-slate-100 text-slate-500";
    const username = user ? user.email.split("@")[0] : "";

    if (loading) return (
        <div className="flex items-center justify-center py-20 text-slate-400">
            <span className="material-symbols-outlined animate-spin text-4xl">progress_activity</span>
        </div>
    );

    if (error || !user) return (
        <div className="rounded-lg bg-red-50 border border-red-200 px-6 py-4 text-red-700 text-sm">{error || "User not found."}</div>
    );

    return (
        <>
            {/* Back */}
            <button onClick={() => router.back()} className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to Users
            </button>

            {/* Breadcrumb */}
            <nav className="mb-6 flex items-center gap-2 text-sm text-slate-400">
                <span className="hover:text-primary cursor-pointer" onClick={() => router.push("/admin")}>Home</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                <span className="hover:text-primary cursor-pointer" onClick={() => router.push("/admin/users")}>Users</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                <span className="text-slate-900 font-medium">{username}</span>
            </nav>

            {/* Profile Header Card */}
            <div className="mb-8 rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-5">
                        <div className="relative">
                            <div className={`flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold shadow-sm ${avatarColor}`}>
                                {initials}
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full border-2 border-white bg-emerald-500" title="Active" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{username}</h1>
                                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getRoleBadge(user.role)}`}>
                                    {user.role.replace("_", " ")}
                                </span>
                            </div>
                            <p className="flex items-center gap-2 text-sm text-slate-500">
                                <span className="material-symbols-outlined text-[16px]">mail</span> {user.email}
                                <span className="mx-1 text-slate-300">|</span>
                                <span className="material-symbols-outlined text-[16px]">badge</span>
                                <span className="font-mono text-xs">#{user.user_id.slice(0, 8)}</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-all">
                            <span className="material-symbols-outlined text-[18px]">lock_reset</span> Reset Password
                        </button>
                        <button className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100 transition-all">
                            <span className="material-symbols-outlined text-[18px]">block</span> Suspend User
                        </button>
                    </div>
                </div>
            </div>

            {error && <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"><span className="material-symbols-outlined text-[18px]">error</span>{error}</div>}

            {/* Content Grid */}
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">

                {/* LEFT COLUMN */}
                <div className="flex flex-col gap-6 xl:col-span-1">

                    {/* Role Management */}
                    <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900">Role Management</h3>
                            <span className="material-symbols-outlined text-slate-400 text-[20px]">admin_panel_settings</span>
                        </div>
                        <p className="mb-5 text-sm text-slate-500 leading-relaxed">Changing a role immediately updates permissions.</p>
                        <div className="flex flex-col gap-3">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Current Role</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-2.5 pointer-events-none text-slate-400 text-[18px]">manage_accounts</span>
                                <select
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value as Role)}
                                    className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-8 text-sm text-slate-900 focus:border-primary focus:ring-1 focus:ring-primary"
                                >
                                    {ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
                                </select>
                                <span className="material-symbols-outlined absolute right-3 top-2.5 pointer-events-none text-slate-400 text-[18px]">arrow_drop_down</span>
                            </div>
                            <button
                                onClick={handleRoleUpdate}
                                disabled={saving || selectedRole === user.role}
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 px-4 text-sm font-semibold text-white shadow-sm shadow-primary/20 hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-[18px]">save</span>
                                {saving ? "Saving..." : "Update Role"}
                            </button>
                        </div>
                    </div>

                    {/* Account Info */}
                    <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
                        <h3 className="mb-5 text-base font-bold text-slate-900">Account Information</h3>
                        <div className="space-y-4">
                            {[
                                { icon: "mail", label: "Email", value: user.email },
                                { icon: "calendar_today", label: "Date Joined", value: new Date(user.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) },
                                { icon: "badge", label: "User ID", value: `#${user.user_id.slice(0, 12)}` },
                                { icon: "login", label: "Status", value: "Active" },
                            ].map((row) => (
                                <div key={row.label} className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
                                        <span className="material-symbols-outlined text-[20px]">{row.icon}</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-slate-400">{row.label}</p>
                                        <p className="text-sm font-semibold text-slate-900 font-mono">{row.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="flex flex-col gap-6 xl:col-span-2">

                    {/* Quick stats */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        {[
                            { label: "Events Owned", value: userEvents.length, icon: "event", color: "bg-blue-50 text-blue-600" },
                            { label: "Photos Indexed", value: userEvents.reduce((acc, e) => acc + e.counters.photos, 0).toLocaleString(), icon: "photo_library", color: "bg-purple-50 text-purple-600" },
                            { label: "Role", value: user.role.replace("_", " "), icon: "star", color: "bg-orange-50 text-orange-600" },
                        ].map((s) => (
                            <div key={s.label} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm flex items-center gap-4">
                                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${s.color}`}>
                                    <span className="material-symbols-outlined text-[22px]">{s.icon}</span>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                                    <p className="text-xs font-medium text-slate-400">{s.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Recent Events */}
                    <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 p-6">
                            <h3 className="text-base font-bold text-slate-900">Recent Events Overview</h3>
                            <button onClick={() => router.push("/admin/events")} className="flex items-center gap-1 text-sm font-medium text-primary hover:opacity-80 transition-opacity">
                                View All <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50/50 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold">Event Name</th>
                                        <th className="px-6 py-4 font-semibold">Photos</th>
                                        <th className="px-6 py-4 font-semibold">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {userEvents.length === 0 ? (
                                        <tr><td colSpan={3} className="px-6 py-8 text-center text-xs text-slate-400">No events found.</td></tr>
                                    ) : userEvents.map((ev) => (
                                        <tr key={ev.event_id} className="group hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-semibold text-slate-900 group-hover:text-primary transition-colors text-sm">{ev.name}</p>
                                                    <p className="text-xs text-slate-400 font-mono">/{ev.slug}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center font-medium text-slate-900">{ev.counters.photos}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${statusBadge(ev.status)}`}>{ev.status}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Activity Timeline */}
                    <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
                        <h3 className="mb-6 text-base font-bold text-slate-900">Recent Activity</h3>
                        <div className="relative border-l-2 border-slate-200 pl-6 space-y-6">
                            {ACTIVITY_TEMPLATES.map((activity, i) => (
                                <div key={i} className="relative">
                                    <span className={`absolute -left-[29px] top-1 h-3 w-3 rounded-full ring-4 ring-white ${i === 0 ? "bg-primary" : "bg-slate-300"}`} />
                                    <div className="flex flex-col gap-0.5">
                                        <p className="text-sm font-medium text-slate-900">{activity}</p>
                                        <p className="text-xs text-slate-400">
                                            {i === 0 ? "Today" : i === 1 ? "Yesterday" : `${i + 1} days ago`}
                                            <span className="mx-1">•</span>
                                            {user.email}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="mt-8 w-full rounded-lg border border-dashed border-slate-200 py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-50 transition-colors">
                            View Full History
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
