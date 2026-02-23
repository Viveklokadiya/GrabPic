"use client";

import { useMemo, useState } from "react";

// Audit logs are frontend-only for now (no backend endpoint).
// The data structure is ready for when a backend /admin/audit endpoint is added.

type ActionType = "Role Change" | "Job Cancellation" | "Event Cancelled" | "User Suspension" | "Config Change" | "Access Granted" | "Auto Cleanup";

type AuditLog = {
    id: string;
    timestamp: Date;
    actor: string;
    isSystem: boolean;
    actionType: ActionType;
    details: string;
    target: string;
    ip: string;
};

function actionBadge(type: ActionType) {
    switch (type) {
        case "User Suspension": return "bg-red-100 text-red-700 border-red-200";
        case "Job Cancellation": return "bg-amber-100 text-amber-700 border-amber-200";
        case "Event Cancelled": return "bg-orange-100 text-orange-700 border-orange-200";
        case "Config Change": return "bg-blue-100 text-blue-700 border-blue-200";
        case "Role Change": return "bg-slate-100 text-slate-700 border-slate-200";
        case "Access Granted": return "bg-emerald-100 text-emerald-700 border-emerald-200";
        case "Auto Cleanup": return "bg-purple-100 text-purple-700 border-purple-200";
    }
}

function timeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} mins ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    return "Yesterday";
}

function getAvatarColor(name: string): string {
    const colors = [
        "bg-indigo-100 text-indigo-700",
        "bg-pink-100 text-pink-700",
        "bg-teal-100 text-teal-700",
        "bg-orange-100 text-orange-700",
        "bg-sky-100 text-sky-700",
    ];
    return colors[name.charCodeAt(0) % colors.length];
}

// Generated mock data representing real audit-style events
const MOCK_LOGS: AuditLog[] = [
    { id: "log-001", timestamp: new Date(Date.now() - 2 * 60000), actor: "Admin", isSystem: false, actionType: "User Suspension", details: "Suspended user photographer_01", target: "photographer_01", ip: "192.168.1.1" },
    { id: "log-002", timestamp: new Date(Date.now() - 15 * 60000), actor: "System Bot", isSystem: true, actionType: "Job Cancellation", details: "Cancelled processing for Job #8821", target: "job_8821", ip: "System (Internal)" },
    { id: "log-003", timestamp: new Date(Date.now() - 60 * 60000), actor: "Admin", isSystem: false, actionType: "Config Change", details: "Updated max_upload_limit: 50MB → 100MB", target: "system_config", ip: "10.0.0.5" },
    { id: "log-004", timestamp: new Date(Date.now() - 2 * 60 * 60000), actor: "Admin", isSystem: false, actionType: "Role Change", details: "Promoted dave_ops to Photographer", target: "dave_ops", ip: "192.168.1.1" },
    { id: "log-005", timestamp: new Date(Date.now() - 5 * 60 * 60000), actor: "Root", isSystem: false, actionType: "Access Granted", details: "Granted API access to client_app_v2", target: "client_app_v2", ip: "203.0.113.45" },
    { id: "log-006", timestamp: new Date(Date.now() - 23 * 60 * 60000), actor: "System Bot", isSystem: true, actionType: "Auto Cleanup", details: "Purged temporary files. Freed 2.4GB in /temp", target: "/temp", ip: "System (Internal)" },
    { id: "log-007", timestamp: new Date(Date.now() - 25 * 60 * 60000), actor: "Admin", isSystem: false, actionType: "Event Cancelled", details: "Manually cancelled event 'Sunset Wedding'", target: "evt_2029", ip: "192.168.1.1" },
];

const ACTION_TYPES: string[] = ["", "Role Change", "Job Cancellation", "Event Cancelled", "User Suspension", "Config Change", "Access Granted", "Auto Cleanup"];

export default function AdminAuditPage() {
    const [search, setSearch] = useState("");
    const [actionFilter, setActionFilter] = useState("");
    const [dateFilter, setDateFilter] = useState("");

    const filtered = useMemo(() =>
        MOCK_LOGS.filter((log) => {
            const matchSearch = !search ||
                log.actor.toLowerCase().includes(search.toLowerCase()) ||
                log.details.toLowerCase().includes(search.toLowerCase()) ||
                log.target.toLowerCase().includes(search.toLowerCase()) ||
                log.id.includes(search);
            const matchAction = !actionFilter || log.actionType === actionFilter;
            const matchDate = !dateFilter || log.timestamp.toISOString().startsWith(dateFilter);
            return matchSearch && matchAction && matchDate;
        }), [search, actionFilter, dateFilter]
    );

    // Quick stats
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const suspensionsToday = MOCK_LOGS.filter((l) => l.actionType === "User Suspension" && l.timestamp >= todayStart).length;
    const jobCancellations = MOCK_LOGS.filter((l) => l.actionType === "Job Cancellation").length;
    const configChanges = MOCK_LOGS.filter((l) => l.actionType === "Config Change").length;
    const uniqueActors = new Set(MOCK_LOGS.filter((l) => !l.isSystem).map((l) => l.actor)).size;

    function handleExportCSV() {
        const header = "ID,Timestamp,Actor,Action,Details,Target,IP\n";
        const rows = filtered
            .map((l) => `${l.id},${l.timestamp.toISOString()},${l.actor},${l.actionType},"${l.details}",${l.target},${l.ip}`)
            .join("\n");
        const blob = new Blob([header + rows], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "audit-logs.csv"; a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <>
            {/* Header */}
            <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Global Audit Logs</h1>
                    <p className="mt-2 text-sm text-slate-500">Track and review all critical administrative actions and system changes.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleExportCSV} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">download</span> Export CSV
                    </button>
                </div>
            </header>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
                {[
                    { label: "Suspensions Today", value: suspensionsToday, icon: "gavel", color: "bg-red-50 text-red-600" },
                    { label: "Job Cancellations", value: jobCancellations, icon: "warning", color: "bg-amber-50 text-amber-600" },
                    { label: "Config Changes", value: configChanges, icon: "settings", color: "bg-blue-50 text-blue-600" },
                    { label: "Active Admins", value: uniqueActors, icon: "verified_user", color: "bg-emerald-50 text-emerald-600" },
                ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3">
                        <div className={`rounded-lg p-2.5 ${s.color}`}>
                            <span className="material-symbols-outlined text-[20px]">{s.icon}</span>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">{s.label}</p>
                            <p className="text-xl font-bold text-slate-900">{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="mb-6 grid gap-4 rounded-xl bg-white p-4 shadow-sm border border-slate-200 lg:grid-cols-4">
                <div className="relative lg:col-span-2">
                    <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                    <input
                        value={search} onChange={(e) => setSearch(e.target.value)}
                        className="block w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                        placeholder="Search actor, action, or target..."
                    />
                </div>
                <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}
                    className="block w-full rounded-lg border border-slate-200 bg-white py-2.5 px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary">
                    {ACTION_TYPES.map((a) => <option key={a} value={a}>{a || "All Actions"}</option>)}
                </select>
                <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
                    className="block w-full rounded-lg border border-slate-200 bg-white py-2.5 px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                            <tr>
                                <th className="px-6 py-4 text-left font-semibold">Timestamp</th>
                                <th className="px-6 py-4 text-left font-semibold">Actor</th>
                                <th className="px-6 py-4 text-left font-semibold">Action Type</th>
                                <th className="px-6 py-4 text-left font-semibold">Details / Target</th>
                                <th className="px-6 py-4 text-left font-semibold">IP Address</th>
                                <th className="px-6 py-4 text-right font-semibold"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filtered.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">No log entries found.</td></tr>
                            ) : filtered.map((log) => (
                                <tr key={log.id} className="group cursor-pointer hover:bg-slate-50 transition-colors">
                                    <td className="whitespace-nowrap px-6 py-4">
                                        <div className="font-medium text-slate-900">{timeAgo(log.timestamp)}</div>
                                        <div className="text-xs text-slate-400">{log.timestamp.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {log.isSystem ? (
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                                    <span className="material-symbols-outlined text-[16px]">smart_toy</span>
                                                </div>
                                            ) : (
                                                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${getAvatarColor(log.actor)}`}>
                                                    {log.actor.charAt(0)}
                                                </div>
                                            )}
                                            <span className="text-sm font-medium text-slate-900 group-hover:text-primary transition-colors">{log.actor}</span>
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4">
                                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${actionBadge(log.actionType)}`}>
                                            {log.actionType}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-slate-900 text-sm">{log.details}</div>
                                        <div className="mt-0.5 text-xs text-slate-400 font-mono">{log.id}</div>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-slate-500">{log.ip}</td>
                                    <td className="whitespace-nowrap px-6 py-4 text-right">
                                        <span className="material-symbols-outlined text-slate-300 group-hover:text-primary text-[20px] transition-colors">chevron_right</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Pagination */}
                <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3">
                    <p className="text-xs text-slate-500">
                        Showing <span className="font-medium text-slate-900">{filtered.length}</span> of <span className="font-medium text-slate-900">{MOCK_LOGS.length}</span> results
                    </p>
                    <nav className="inline-flex rounded-md shadow-sm -space-x-px">
                        <button className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-200 hover:bg-slate-50">
                            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                        </button>
                        <button className="relative z-10 inline-flex items-center bg-primary px-4 py-2 text-sm font-semibold text-white">1</button>
                        <button className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-200 hover:bg-slate-50">
                            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                        </button>
                    </nav>
                </div>
            </div>
        </>
    );
}
