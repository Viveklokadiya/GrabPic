"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createPhotographerEvent } from "@/lib/rbac-api";
import { saveEventSecrets } from "@/lib/local";

export default function CreateEventPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [driveLink, setDriveLink] = useState("");
    const [slug, setSlug] = useState("");
    const [privacy, setPrivacy] = useState<"public" | "private">("public");
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState("");

    async function onCreate(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setCreating(true);
        setError("");
        try {
            const created = await createPhotographerEvent({
                name: name.trim(),
                drive_link: driveLink.trim(),
                slug: slug.trim() || undefined,
            });
            saveEventSecrets({
                eventId: created.event_id,
                slug: created.slug,
                adminToken: created.admin_token,
                guestCode: created.guest_code,
            });
            router.push(`/photographer/events/${created.event_id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create event");
        } finally {
            setCreating(false);
        }
    }

    return (
        <div className="flex flex-col gap-8 max-w-3xl mx-auto w-full">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-slate-400">
                <a href="/photographer/events" className="hover:text-primary transition-colors">Events</a>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="text-slate-900 font-medium">Create New Event</span>
            </nav>

            {/* Header */}
            <div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Create New Event</h1>
                <p className="text-slate-500 mt-1">Set up a new photo event and connect your Google Drive folder.</p>
            </div>

            {/* Form Card */}
            <form onSubmit={onCreate} className="flex flex-col gap-6">
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                    <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 mb-5 pb-4 border-b border-slate-100">
                        <span className="material-symbols-outlined text-primary text-[20px]">event</span>
                        Event Details
                    </h2>

                    <div className="flex flex-col gap-5">
                        {/* Event Name */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700">Event Name <span className="text-red-400">*</span></label>
                            <input
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                placeholder="e.g. Sarah & Mike's Wedding"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        {/* Date input (visual only for now) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-semibold text-slate-700">Event Date</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                                        <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                                    </span>
                                    <input
                                        type="date"
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-semibold text-slate-700">Location</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                                        <span className="material-symbols-outlined text-[18px]">location_on</span>
                                    </span>
                                    <input
                                        type="text"
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        placeholder="e.g. San Francisco, CA"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Custom Slug */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700">
                                Custom URL Slug <span className="text-xs text-slate-400 font-normal">(optional)</span>
                            </label>
                            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                                <span className="px-3 py-2.5 text-sm text-slate-400 border-r border-slate-200 bg-slate-100 select-none">grabpic.app/g/</span>
                                <input
                                    className="flex-1 border-none bg-transparent px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                                    placeholder="sarah-mike-wedding"
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Drive Link Card */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                    <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 mb-5 pb-4 border-b border-slate-100">
                        <span className="material-symbols-outlined text-primary text-[20px]">folder_shared</span>
                        Google Drive Source
                    </h2>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-slate-700">Drive Folder Link <span className="text-red-400">*</span></label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                                <span className="material-symbols-outlined text-[18px]">link</span>
                            </span>
                            <input
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="https://drive.google.com/drive/folders/..."
                                value={driveLink}
                                onChange={(e) => setDriveLink(e.target.value)}
                                required
                            />
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Paste a shared Google Drive folder link. Photos will be synced and processed automatically.</p>
                    </div>
                </div>

                {/* Privacy Card */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                    <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 mb-5 pb-4 border-b border-slate-100">
                        <span className="material-symbols-outlined text-primary text-[20px]">lock</span>
                        Privacy Settings
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {(["public", "private"] as const).map((p) => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setPrivacy(p)}
                                className={`flex items-start gap-4 rounded-xl border-2 p-4 transition-all text-left ${privacy === p
                                        ? "border-primary bg-primary/5"
                                        : "border-slate-200 hover:border-slate-300"
                                    }`}
                            >
                                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${privacy === p ? "bg-primary text-white" : "bg-slate-100 text-slate-400"}`}>
                                    <span className="material-symbols-outlined text-[20px]">{p === "public" ? "public" : "lock"}</span>
                                </div>
                                <div>
                                    <p className={`font-bold text-sm ${privacy === p ? "text-primary" : "text-slate-900"}`}>
                                        {p === "public" ? "Public" : "Private"}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {p === "public" ? "Anyone with the link can view photos" : "Guests must enter a code"}
                                    </p>
                                </div>
                                {privacy === p && (
                                    <span className="ml-auto material-symbols-outlined text-primary text-[18px]">check_circle</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Pro Tip */}
                <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-100 px-5 py-4">
                    <span className="material-symbols-outlined text-amber-500 text-[20px] flex-shrink-0 mt-0.5">tips_and_updates</span>
                    <div>
                        <p className="text-sm font-semibold text-amber-900">Pro Tip</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                            Make sure your Google Drive folder is shared with the service account. Processing starts automatically after creation.
                        </p>
                    </div>
                </div>

                {error ? (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
                ) : null}

                {/* Actions */}
                <div className="flex items-center gap-3 justify-end">
                    <a
                        href="/photographer/events"
                        className="px-5 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </a>
                    <button
                        type="submit"
                        disabled={creating}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 disabled:opacity-60 transition-all"
                    >
                        {creating ? (
                            <>
                                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                                Creating...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                                Create Event
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
