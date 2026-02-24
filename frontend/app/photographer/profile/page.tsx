"use client";

import { useState } from "react";
import { useAuth } from "@/lib/use-auth";

const BRAND_COLORS = [
    { hex: "#4848e5", bg: "bg-primary" },
    { hex: "#3b82f6", bg: "bg-blue-500" },
    { hex: "#10b981", bg: "bg-emerald-500" },
    { hex: "#8b5cf6", bg: "bg-violet-500" },
    { hex: "#f59e0b", bg: "bg-amber-500" },
];

export default function StudioProfilePage() {
    const auth = useAuth();
    const [studioName, setStudioName] = useState("Focus Photography");
    const [website, setWebsite] = useState("https://focus-photo.com");
    const [about, setAbout] = useState("Capturing moments that last a lifetime. Specialized in weddings, events, and portrait photography.");
    const [brandColor, setBrandColor] = useState("#4848e5");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [customColor, setCustomColor] = useState("4848e5");

    async function onSave() {
        setSaving(true);
        await new Promise((r) => setTimeout(r, 1000)); // Simulated save
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    }

    return (
        <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Studio Settings</h1>
                    <p className="text-slate-500 mt-1 text-sm">Manage your public profile and branding presence.</p>
                </div>
                <div className="flex gap-3">
                    <button className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                        Discard
                    </button>
                    <button
                        onClick={onSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-bold shadow-lg shadow-primary/25 hover:bg-primary/90 disabled:opacity-60 transition-all"
                    >
                        <span className="material-symbols-outlined text-[18px]">save</span>
                        {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
                    </button>
                </div>
            </div>

            {saved && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Changes saved successfully.
                </div>
            )}

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                {/* Left Column */}
                <div className="space-y-8 lg:col-span-8">
                    {/* Studio Information */}
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 mb-5 pb-4 border-b border-slate-100">
                            <span className="material-symbols-outlined text-primary text-[20px]">storefront</span>
                            Studio Information
                        </h2>
                        <div className="grid gap-6">
                            <div className="flex flex-col gap-5 sm:flex-row">
                                {/* Avatar Upload */}
                                <div className="flex-shrink-0">
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Profile Picture</label>
                                    <div className="relative group h-32 w-32 cursor-pointer overflow-hidden rounded-full border-2 border-dashed border-slate-300 hover:border-primary transition-colors bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-5xl text-slate-400">person</span>
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                                            <span className="material-symbols-outlined text-white text-2xl">upload</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Fields */}
                                <div className="flex-1 grid gap-4">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-sm font-semibold text-slate-700">Studio Name</label>
                                            <input
                                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
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
                                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
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
                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                                            value={about}
                                            onChange={(e) => setAbout(e.target.value)}
                                            placeholder="Tell your clients a bit about yourself..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Branding */}
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 mb-5 pb-4 border-b border-slate-100">
                            <span className="material-symbols-outlined text-primary text-[20px]">palette</span>
                            Branding & Guest View
                        </h2>
                        <div className="grid gap-8 md:grid-cols-2">
                            <div className="space-y-6">
                                {/* Logo Upload */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-semibold text-slate-700">Studio Logo</label>
                                    <div className="flex w-full items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
                                        <div className="text-center">
                                            <span className="material-symbols-outlined text-4xl text-slate-400 mb-2 block">cloud_upload</span>
                                            <p className="text-sm font-medium text-slate-900">
                                                <span className="text-primary hover:underline">Click to upload</span> or drag and drop
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1">SVG, PNG, JPG (max. 2MB)</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Color Picker */}
                                <div className="flex flex-col gap-3">
                                    <label className="text-sm font-semibold text-slate-700">Guest Interface Color</label>
                                    <div className="flex flex-wrap items-center gap-3">
                                        {BRAND_COLORS.map((c) => (
                                            <button
                                                key={c.hex}
                                                onClick={() => setBrandColor(c.hex)}
                                                className={`h-8 w-8 rounded-full ${c.bg} transition-all ${brandColor === c.hex ? "ring-2 ring-offset-2 ring-current scale-110" : "hover:scale-105"
                                                    }`}
                                                style={brandColor === c.hex ? { color: c.hex } : {}}
                                            />
                                        ))}
                                        <div className="ml-2 flex items-center rounded-lg border border-slate-200 bg-white pl-2">
                                            <span className="text-xs text-slate-400">#</span>
                                            <input
                                                className="h-8 w-20 border-0 bg-transparent text-sm font-medium text-slate-700 focus:ring-0 uppercase pl-1 pr-2"
                                                value={customColor}
                                                maxLength={6}
                                                onChange={(e) => {
                                                    setCustomColor(e.target.value.toUpperCase());
                                                    setBrandColor(`#${e.target.value}`);
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Live Preview */}
                            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center min-h-[280px]">
                                <div className="pointer-events-none w-52 shadow-2xl rounded-[2rem] border-4 border-slate-900 bg-white overflow-hidden">
                                    <div className="flex flex-col" style={{ height: 360 }}>
                                        {/* Mockup header */}
                                        <div className="h-28 relative flex-shrink-0" style={{ background: brandColor, opacity: 0.9 }}>
                                            <div className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 h-10 w-10 rounded-full border-2 border-white bg-white shadow-md flex items-center justify-center">
                                                <span className="material-symbols-outlined text-slate-800 text-lg">camera</span>
                                            </div>
                                        </div>
                                        <div className="flex-1 px-4 pt-8 pb-4 flex flex-col items-center text-center">
                                            <h4 className="text-xs font-bold text-slate-900">{studioName}</h4>
                                            <p className="text-[9px] text-slate-400 mb-3">Sep 24, 2024 • San Francisco</p>
                                            <div className="w-full space-y-2">
                                                <div className="h-7 w-full rounded-md text-white text-[9px] font-bold flex items-center justify-center shadow-sm" style={{ backgroundColor: brandColor }}>
                                                    View Photos
                                                </div>
                                                <div className="h-7 w-full rounded-md border border-slate-200 text-slate-600 text-[9px] font-bold flex items-center justify-center">
                                                    Guestbook
                                                </div>
                                            </div>
                                            <div className="mt-auto pt-3 border-t border-slate-100 w-full">
                                                <p className="text-[7px] text-slate-400">Powered by {studioName}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute bottom-3 right-3 rounded-md bg-white/80 backdrop-blur px-2 py-1 text-xs font-bold text-slate-600 shadow-sm border border-white/20">
                                    Live Preview
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Subscription Card */}
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 sticky top-6">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-base font-bold text-slate-900">Subscription</h3>
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary border border-primary/20">
                                PRO PLAN
                            </span>
                        </div>
                        <div className="space-y-5">
                            <div>
                                <p className="text-sm text-slate-500">
                                    Your plan renews on <span className="font-semibold text-slate-900">Oct 24, 2024</span>
                                </p>
                                <p className="text-2xl font-extrabold text-slate-900 mt-1">
                                    $29 <span className="text-sm font-medium text-slate-500">/mo</span>
                                </p>
                            </div>

                            {/* Storage */}
                            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-3">
                                    <span className="material-symbols-outlined text-primary text-[18px]">cloud</span>
                                    Storage Usage
                                </div>
                                <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
                                    <div className="h-full rounded-full bg-primary w-[45%]" />
                                </div>
                                <div className="flex justify-between text-xs text-slate-400 mt-2">
                                    <span>45 GB Used</span>
                                    <span>100 GB Total</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-2.5">
                                <button className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all">
                                    Upgrade Plan
                                </button>
                                <button className="flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all">
                                    Manage Billing
                                </button>
                            </div>
                            <div className="pt-2 border-t border-slate-100 text-center">
                                <a className="flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-primary transition-colors" href="#">
                                    <span className="material-symbols-outlined text-[14px]">help</span>
                                    Need help with your plan?
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Monthly Overview mini */}
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                        <h4 className="text-sm font-bold text-slate-900 mb-4">Monthly Overview</h4>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: "Events", value: "12" },
                                { label: "Downloads", value: "1.4k" },
                                { label: "Guests", value: "342" },
                                { label: "Revenue", value: "$348" },
                            ].map((s) => (
                                <div key={s.label} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                                    <p className="text-xs text-slate-400 mb-1">{s.label}</p>
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
