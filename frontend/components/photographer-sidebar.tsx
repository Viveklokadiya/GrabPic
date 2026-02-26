"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { PhotographerEventListItem } from "@/lib/api";
import { getPhotographerEvents } from "@/lib/rbac-api";
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
  const [events, setEvents] = useState<PhotographerEventListItem[]>([]);
  const [storageLoading, setStorageLoading] = useState(true);

  useEffect(() => {
    if (auth.isLoading) return;
    if (!auth.token) {
      setEvents([]);
      setStorageLoading(false);
      return;
    }

    let cancelled = false;
    setStorageLoading(true);

    getPhotographerEvents()
      .then((nextEvents) => {
        if (cancelled) return;
        setEvents(nextEvents);
      })
      .catch(() => {
        if (cancelled) return;
        setEvents([]);
      })
      .finally(() => {
        if (cancelled) return;
        setStorageLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [auth.isLoading, auth.token]);

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  const email = auth.user?.email ?? "";
  const initials = email.slice(0, 2).toUpperCase();

  const storage = useMemo(() => {
    const processedPhotos = events.reduce((sum, event) => sum + Math.max(0, Number(event.processed_photos || event.photo_count || 0)), 0);
    const usedGb = processedPhotos * 0.0065;
    const totalGb = 100;
    const pct = Math.min(100, Math.max(0, Math.round((usedGb / totalGb) * 100)));
    return { usedGb, totalGb, pct };
  }, [events]);

  return (
    <aside className="sticky top-0 flex h-screen w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-full flex-col justify-between p-4">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3 px-2 pt-2">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/30">
              <span className="material-symbols-outlined text-[22px]">photo_camera</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-bold leading-tight text-slate-900">GrabPic Studio</h1>
              <p className="text-xs text-slate-500">{(auth.user?.role || "PHOTOGRAPHER").replace("_", " ")}</p>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active ? "bg-primary/10 text-primary font-semibold" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
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

        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <span className="material-symbols-outlined text-[18px] text-primary">cloud_upload</span>
              Storage
            </div>
            <div className="mb-1.5 h-1.5 w-full rounded-full bg-slate-200">
              <div
                className={`h-1.5 rounded-full bg-primary ${storageLoading ? "animate-pulse" : ""}`}
                style={{ width: `${storageLoading ? 8 : storage.pct}%` }}
              />
            </div>
            <p className="text-xs text-slate-500">
              {storageLoading ? "Calculating usage..." : `${storage.usedGb.toFixed(1)} GB of ${storage.totalGb} GB used`}
            </p>
          </div>

          <div className="flex items-center gap-3 px-2 py-1">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
              {initials}
            </div>
            <div className="min-w-0 flex flex-col">
              <p className="truncate text-xs font-semibold text-slate-900">{email}</p>
              <p className="text-[10px] text-slate-500">{(auth.user?.role || "PHOTOGRAPHER").replace("_", " ")}</p>
            </div>
          </div>

          <Link
            href="/guest"
            className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary/90 transition-colors hover:bg-primary/15"
          >
            <span className="material-symbols-outlined text-[20px]">switch_account</span>
            Switch to Guest
          </Link>

          <button
            onClick={() => void auth.logout?.()}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Log Out
          </button>
        </div>
      </div>
    </aside>
  );
}
