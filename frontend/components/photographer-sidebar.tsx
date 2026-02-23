"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/use-auth";

const NAV_ITEMS = [
    { href: "/photographer", label: "Dashboard", icon: "dashboard", exact: true },
    { href: "/photographer/events", label: "My Events", icon: "event_note", exact: false },
    { href: "/photographer/connections", label: "Cloud Storage", icon: "cloud_sync", exact: false },
    { href: "/photographer/profile", label: "Studio Profile", icon: "account_circle", exact: false },
];

export default function PhotographerSidebar() {
    const pathname = usePathname();
    const auth = useAuth();

    function isActive(href: string, exact: boolean) {
        if (exact) return pathname === href;
        return pathname.startsWith(href);
    }

    const email = auth.user?.email ?? "";
    const initials = email.slice(0, 2).toUpperCase();

    return (
        <aside className="flex w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-white h-screen sticky top-0">
            <div className="flex h-full flex-col justify-between p-4">
                <div className="flex flex-col gap-6">
                    {/* Logo / Brand */}
                    <div className="flex items-center gap-3 px-2 pt-2">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/30">
                            <span className="material-symbols-outlined text-[22px]">photo_camera</span>
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-sm font-bold text-slate-900 leading-tight">GrabPic Studio</h1>
                            <p className="text-xs text-slate-500">Photographer</p>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex flex-col gap-1">
                        {NAV_ITEMS.map((item) => {
                            const active = isActive(item.href, item.exact);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active
                                            ? "bg-primary/10 text-primary font-semibold"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        }`}
                                >
                                    <span className={`material-symbols-outlined text-[22px] ${active ? "fill-1" : ""}`}>
                                        {item.icon}
                                    </span>
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Bottom Section */}
                <div className="flex flex-col gap-4">
                    {/* Storage widget */}
                    <div className="rounded-xl bg-slate-50 p-4">
                        <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-slate-700">
                            <span className="material-symbols-outlined text-primary text-[18px]">cloud_upload</span>
                            Storage
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 mb-1.5">
                            <div className="bg-primary h-1.5 rounded-full w-[75%]" />
                        </div>
                        <p className="text-xs text-slate-500">75 GB of 100 GB used</p>
                    </div>

                    {/* User info */}
                    <div className="flex items-center gap-3 px-2 py-1">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                            {initials}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">{email}</p>
                            <p className="text-[10px] text-slate-500">Photographer</p>
                        </div>
                    </div>
                    <button
                        onClick={() => auth.logout?.()}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">logout</span>
                        Log Out
                    </button>
                </div>
            </div>
        </aside>
    );
}
