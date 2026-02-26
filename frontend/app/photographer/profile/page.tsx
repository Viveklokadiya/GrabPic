"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/use-auth";
import { getPhotographerEvents } from "@/lib/rbac-api";
import type { PhotographerEventListItem } from "@/lib/api";

const BRAND_COLORS = [
  { hex: "#4848e5", bg: "bg-primary" },
  { hex: "#3b82f6", bg: "bg-blue-500" },
  { hex: "#10b981", bg: "bg-emerald-500" },
  { hex: "#8b5cf6", bg: "bg-violet-500" },
  { hex: "#f59e0b", bg: "bg-amber-500" },
];

export default function StudioProfilePage() {
  const auth = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [studioName, setStudioName] = useState("Focus Photography");
  const [website, setWebsite] = useState("https://focus-photo.com");
  const [about, setAbout] = useState("Capturing moments that last a lifetime. Specialized in weddings, events, and portrait photography.");
  const [brandColor, setBrandColor] = useState("#4848e5");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [events, setEvents] = useState<PhotographerEventListItem[]>([]);

  useEffect(() => {
    getPhotographerEvents().then(setEvents).catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      if (logoPreview && logoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

  const stats = useMemo(() => {
    const totalEvents = events.length;
    const totalPhotos = events.reduce((sum, event) => sum + Math.max(0, Number(event.processed_photos || event.photo_count || 0)), 0);
    const totalGuests = events.reduce((sum, event) => sum + Math.max(0, Number(event.guest_count || 0)), 0);
    const activeSync = events.filter((event) => event.status === "RUNNING" || event.status === "QUEUED").length;
    return { totalEvents, totalPhotos, totalGuests, activeSync };
  }, [events]);

  const usageGb = stats.totalPhotos * 0.0065;
  const planStorageGb = 100;
  const usagePct = Math.min(100, Math.round((usageGb / planStorageGb) * 100));

  async function onSave() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function onPickLogo(file: File | null) {
    if (!file) return;
    if (logoPreview && logoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoPreview(URL.createObjectURL(file));
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Studio Settings</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your public profile and branding presence.</p>
        </div>
        <div className="flex gap-3">
          <button className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50">
            Discard
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>

      {saved ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          Changes saved successfully.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-4 text-base font-bold text-slate-900">
              <span className="material-symbols-outlined text-[20px] text-primary">storefront</span>
              Studio Information
            </h2>
            <div className="grid gap-6">
              <div className="flex flex-col gap-5 sm:flex-row">
                <div className="flex-shrink-0">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Profile Picture</label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative flex h-32 w-32 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-100 to-slate-200 transition-colors hover:border-primary"
                  >
                    {logoPreview ? (
                      <img src={logoPreview} alt="Studio logo" className="h-full w-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-5xl text-slate-400">person</span>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
                      <span className="material-symbols-outlined text-2xl text-white">upload</span>
                    </div>
                  </button>
                </div>

                <div className="flex-1 grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-slate-700">Studio Name</label>
                      <input
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        value={studioName}
                        onChange={(e) => setStudioName(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-slate-700">Website URL</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                          <span className="material-symbols-outlined text-[16px]">language</span>
                        </span>
                        <input
                          type="url"
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-slate-700">About the Studio</label>
                    <textarea
                      rows={3}
                      className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      value={about}
                      onChange={(e) => setAbout(e.target.value)}
                      placeholder="Tell your clients a bit about yourself..."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-4 text-base font-bold text-slate-900">
              <span className="material-symbols-outlined text-[20px] text-primary">palette</span>
              Branding & Guest View
            </h2>
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700">Studio Logo</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    className="hidden"
                    onChange={(e) => onPickLogo(e.target.files?.[0] || null)}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 transition-colors hover:border-primary hover:bg-primary/5"
                  >
                    <div className="text-center">
                      <span className="material-symbols-outlined mb-2 block text-4xl text-slate-400">cloud_upload</span>
                      <p className="text-sm font-medium text-slate-900">
                        <span className="text-primary hover:underline">Click to upload</span> or drag and drop
                      </p>
                      <p className="mt-1 text-xs text-slate-400">SVG, PNG, JPG (max. 2MB)</p>
                    </div>
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-sm font-semibold text-slate-700">Guest Interface Color</label>
                  <div className="flex flex-wrap items-center gap-3">
                    {BRAND_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setBrandColor(c.hex)}
                        className={`h-8 w-8 rounded-full ${c.bg} transition-all ${brandColor === c.hex ? "scale-110 ring-2 ring-current ring-offset-2" : "hover:scale-105"}`}
                        style={brandColor === c.hex ? { color: c.hex } : {}}
                        title={c.hex}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative flex min-h-[280px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                <div className="pointer-events-none w-52 overflow-hidden rounded-[2rem] border-4 border-slate-900 bg-white shadow-2xl">
                  <div className="flex flex-col" style={{ height: 360 }}>
                    <div className="relative h-28 flex-shrink-0" style={{ background: brandColor, opacity: 0.9 }}>
                      <div className="absolute bottom-[-20px] left-1/2 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border-2 border-white bg-white shadow-md">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo preview" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-lg text-slate-800">camera</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col items-center px-4 pb-4 pt-8 text-center">
                      <h4 className="text-xs font-bold text-slate-900">{studioName}</h4>
                      <p className="mb-3 text-[9px] text-slate-400">Guest event preview</p>
                      <div className="w-full space-y-2">
                        <div className="flex h-7 w-full items-center justify-center rounded-md text-[9px] font-bold text-white shadow-sm" style={{ backgroundColor: brandColor }}>
                          Face Match
                        </div>
                        <div className="flex h-7 w-full items-center justify-center rounded-md border border-slate-200 text-[9px] font-bold text-slate-600">
                          My Photos
                        </div>
                      </div>
                      <div className="mt-auto w-full border-t border-slate-100 pt-3">
                        <p className="text-[7px] text-slate-400">Powered by {studioName}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-3 right-3 rounded-md border border-white/20 bg-white/80 px-2 py-1 text-xs font-bold text-slate-600 shadow-sm backdrop-blur">
                  Live Preview
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-4">
          <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Subscription</h3>
              <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                PRO PLAN
              </span>
            </div>
            <div className="space-y-5">
              <div>
                <p className="text-sm text-slate-500">Signed in as <span className="font-semibold text-slate-900">{auth.user?.email || "photographer"}</span></p>
                <p className="mt-1 text-2xl font-extrabold text-slate-900">
                  $29 <span className="text-sm font-medium text-slate-500">/mo</span>
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <span className="material-symbols-outlined text-[18px] text-primary">cloud</span>
                  Storage Usage
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${usagePct}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-xs text-slate-400">
                  <span>{usageGb.toFixed(1)} GB Used</span>
                  <span>{planStorageGb} GB Total</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <button className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary/90">
                  Upgrade Plan
                </button>
                <button className="flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50">
                  Manage Billing
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h4 className="mb-4 text-sm font-bold text-slate-900">Monthly Overview</h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Events", value: String(stats.totalEvents) },
                { label: "Photos", value: stats.totalPhotos.toLocaleString() },
                { label: "Guests", value: stats.totalGuests.toLocaleString() },
                { label: "Active Sync", value: String(stats.activeSync) },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="mb-1 text-xs text-slate-400">{s.label}</p>
                  <p className="text-xl font-bold text-slate-900">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
