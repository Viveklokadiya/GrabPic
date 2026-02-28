"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/lib/use-auth";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "dashboard", exact: true },
  { href: "/admin/users", label: "Users", icon: "group", exact: false },
  { href: "/admin/events", label: "Events", icon: "calendar_month", exact: false },
  { href: "/admin/jobs", label: "Jobs", icon: "work", exact: false },
  { href: "/admin/metrics", label: "System Metrics", icon: "monitoring", exact: false },
  { href: "/admin/audit", label: "Audit Logs", icon: "assignment", exact: false },
];

type AdminSidebarProps = {
  mobileOpen?: boolean;
  onClose?: () => void;
};

export default function AdminSidebar({ mobileOpen = false, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const auth = useAuth();

  useEffect(() => {
    onClose?.();
  }, [pathname, onClose]);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-900/35 transition-opacity duration-300 lg:hidden ${
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => onClose?.()}
        aria-hidden
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col justify-between p-4">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between px-2 pb-2 pt-2 lg:justify-start">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/30">
                  <span className="material-symbols-outlined text-2xl">camera_enhance</span>
                </div>
                <div className="flex flex-col">
                  <h1 className="text-base font-bold leading-tight tracking-tight text-slate-900">GrabPic Admin</h1>
                  <p className="text-xs font-medium text-slate-500">
                    {auth.user?.role === "SUPER_ADMIN" ? "Super Admin Console" : "Admin Console"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onClose?.()}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 lg:hidden"
                aria-label="Close navigation"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <nav className="flex flex-col gap-1.5">
              {NAV_ITEMS.map((item) => {
                const isActive = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${
                      isActive ? "bg-primary text-white shadow-md shadow-primary/20 hover:bg-primary/90" : "text-slate-600 hover:bg-slate-100 hover:text-primary"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[20px] transition-colors ${
                        isActive ? "text-white" : "text-slate-400 group-hover:text-primary"
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

          <div className="flex flex-col gap-1 border-t border-slate-200 pt-4">
            <div className="mb-1 flex items-center gap-3 px-3 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold uppercase text-primary">
                {auth.user?.email?.charAt(0) ?? "A"}
              </div>
              <div className="flex min-w-0 flex-col">
                <p className="truncate text-xs font-semibold text-slate-900">{auth.user?.email ?? "Admin"}</p>
                <p className="text-xs text-slate-500">{(auth.user?.role || "ADMIN").replace("_", " ")}</p>
              </div>
            </div>
            <button
              onClick={() => void auth.logout?.()}
              className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-slate-600 transition-all hover:bg-red-50 hover:text-red-600"
            >
              <span className="material-symbols-outlined text-[20px] text-slate-400 transition-colors group-hover:text-red-600">
                logout
              </span>
              <span className="text-sm font-medium">Log Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
