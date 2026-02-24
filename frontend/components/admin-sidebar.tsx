"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/use-auth";

const NAV_ITEMS = [
    { href: "/admin", label: "Dashboard", icon: "dashboard", exact: true },
    { href: "/admin/users", label: "Users", icon: "group", exact: false },
    { href: "/admin/events", label: "Events", icon: "calendar_month", exact: false },
    { href: "/admin/jobs", label: "Jobs", icon: "work", exact: false },
    { href: "/admin/metrics", label: "System Metrics", icon: "monitoring", exact: false },
    { href: "/admin/audit", label: "Audit Logs", icon: "assignment", exact: false },
];

export default function AdminSidebar() {
    const pathname = usePathname();
    const auth = useAuth();

    return (
        <aside className="flex w-64 flex-col border-r border-slate-200 bg-white transition-all duration-300 shrink-0">
            <div className="flex h-full flex-col justify-between p-4">
                <div className="flex flex-col gap-6">
                    {/* Logo */}
                    <div className="flex items-center gap-3 px-2 pt-2 pb-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/30">
                            <span className="material-symbols-outlined text-2xl">camera_enhance</span>
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-slate-900 text-base font-bold leading-tight tracking-tight">GrabPic Admin</h1>
                            <p className="text-slate-500 text-xs font-medium">
                                {auth.user?.role === "SUPER_ADMIN" ? "Super Admin Console" : "Admin Console"}
                            </p>
                        </div>
                    </div>

                    {/* Nav */}
                    <nav className="flex flex-col gap-1.5">
                        {NAV_ITEMS.map((item) => {
                            const isActive = item.exact
                                ? pathname === item.href
                                : pathname === item.href || pathname.startsWith(item.href + "/");
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${isActive
                                        ? "bg-primary text-white shadow-md shadow-primary/20 hover:bg-primary/90"
                                        : "text-slate-600 hover:bg-slate-100 hover:text-primary"
                                        }`}
                                >
                                    <span
                                        className={`material-symbols-outlined text-[20px] transition-colors ${isActive ? "text-white" : "text-slate-400 group-hover:text-primary"
                                            }`}
                                    >
                                        {item.icon}
                                    </span>
                                    <span className="text-sm font-semibold">{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Bottom: profile + logout */}
                <div className="flex flex-col gap-1 border-t border-slate-200 pt-4">
                    <div className="flex items-center gap-3 px-3 py-2 mb-1">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold uppercase">
                            {auth.user?.email?.charAt(0) ?? "A"}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <p className="text-slate-900 text-xs font-semibold truncate">{auth.user?.email ?? "Admin"}</p>
                            <p className="text-slate-500 text-xs">{(auth.user?.role || "ADMIN").replace("_", " ")}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => void auth.logout?.()}
                        className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all w-full text-left"
                    >
                        <span className="material-symbols-outlined text-[20px] text-slate-400 group-hover:text-red-600 transition-colors">
                            logout
                        </span>
                        <span className="text-sm font-medium">Log Out</span>
                    </button>
                </div>
            </div>
        </aside>
    );
}
