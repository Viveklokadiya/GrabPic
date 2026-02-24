"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { updatePhotographerEvent } from "@/lib/rbac-api";

export default function EventSettingsPage() {
    const params = useParams<{ eventId: string }>();
    const eventId = useMemo(() => String(params?.eventId ?? ""), [params]);

    const [isPrivate, setIsPrivate] = useState(true);
    const [applyWatermark, setApplyWatermark] = useState(false);
    const [expiryDate, setExpiryDate] = useState("");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState("");

    async function onSave() {
        setSaving(true);
        setSaved(false);
        setError("");
        try {
            await updatePhotographerEvent(eventId, {});
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to save");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-slate-400">
                <Link href="/photographer/events" className="hover:text-primary transition-colors">Events</Link>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <Link href={`/photographer/events/${eventId}`} className="hover:text-primary transition-colors">Event</Link>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="text-slate-900 font-medium">Settings</span>
            </nav>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Event Settings</h1>
                    <p className="text-slate-500 mt-1 text-sm">Configure access, visibility, and manage actions for this event.</p>
                </div>
                <div className="flex gap-3">
                    <Link
                        href={`/photographer/events/${eventId}`}
                        className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        Discard
                    </Link>
                    <button
                        onClick={onSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold shadow-sm hover:bg-primary/90 disabled:opacity-60 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[16px]">save</span>
                        {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
                    </button>
                </div>
            </div>

            {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
            {saved && <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">check_circle</span> Settings saved successfully.
            </div>}

            {/* Access & Visibility Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <h2 className="text-base font-bold text-slate-900 mb-2">Access & Visibility</h2>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        Control who can see this event gallery and how long the link remains active. Changes update the live gallery immediately.
                    </p>
                </div>
                <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="p-6 flex flex-col gap-8">
                        {/* Private toggle */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-8">
                            <div className="flex gap-4">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary h-fit">
                                    <span className="material-symbols-outlined text-[22px]">{isPrivate ? "lock" : "public"}</span>
                                </div>
                                <div>
                                    <label className="text-base font-semibold text-slate-900">Private Gallery</label>
                                    <p className="text-sm text-slate-500 mt-0.5 max-w-sm">
                                        When enabled, visitors must enter a passcode to view photos. Disable for public access.
                                    </p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={isPrivate}
                                    onChange={(e) => setIsPrivate(e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                            </label>
                        </div>

                        {/* Link expiry */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div className="flex gap-4">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary h-fit">
                                    <span className="material-symbols-outlined text-[22px]">timer</span>
                                </div>
                                <div>
                                    <label className="text-base font-semibold text-slate-900">Link Expiry</label>
                                    <p className="text-sm text-slate-500 mt-0.5 max-w-sm">
                                        Set a date when the public link will automatically deactivate.
                                    </p>
                                </div>
                            </div>
                            <div className="relative flex-shrink-0">
                                <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                                    <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                                </span>
                                <input
                                    type="date"
                                    value={expiryDate}
                                    onChange={(e) => setExpiryDate(e.target.value)}
                                    className="rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Protection Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <h2 className="text-base font-bold text-slate-900 mb-2">Protection</h2>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        Manage watermark settings for this specific gallery.
                    </p>
                </div>
                <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex gap-4">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary h-fit">
                                    <span className="material-symbols-outlined text-[22px]">branding_watermark</span>
                                </div>
                                <div>
                                    <label className="text-base font-semibold text-slate-900">Apply Watermark</label>
                                    <p className="text-sm text-slate-500 mt-0.5">Overlay your logo on all photos in this gallery.</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={applyWatermark}
                                    onChange={(e) => setApplyWatermark(e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8 border-t border-slate-200">
                <div className="lg:col-span-1">
                    <h2 className="text-base font-bold text-red-600 mb-2">Danger Zone</h2>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        Irreversible actions. Please proceed with caution.
                    </p>
                </div>
                <div className="lg:col-span-2 rounded-xl border border-red-200 bg-white shadow-sm overflow-hidden">
                    <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div>
                            <h3 className="font-bold text-slate-900">Delete Event</h3>
                            <p className="text-sm text-slate-500 mt-0.5 max-w-md">
                                Permanently remove this event, all synced photos, and client data. This action cannot be undone.
                            </p>
                        </div>
                        <button className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-600 hover:text-white font-semibold text-sm transition-all group">
                            <span className="material-symbols-outlined text-[18px] group-hover:text-white">delete_forever</span>
                            Delete Event
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
