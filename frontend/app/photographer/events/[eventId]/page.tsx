"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";

import type { EventGuestsResponse, EventPhotoSafeResponse, EventProcessingStatusResponse, EventResponse } from "@/lib/api";
import { backendAssetUrl } from "@/lib/asset-url";
import {
  cancelPhotographerEvent,
  getPhotographerEvent,
  getPhotographerEventGuests,
  getPhotographerEventPhotos,
  getPhotographerEventStatus,
  syncPhotographerEvent,
} from "@/lib/rbac-api";

function isActiveStatus(value: string | undefined): boolean {
  return value === "QUEUED" || value === "RUNNING";
}

function statusConfig(status: string) {
  const map: Record<string, { badge: string; dot: string; label: string }> = {
    COMPLETED: { badge: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", label: "Completed" },
    RUNNING: { badge: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500 animate-pulse", label: "Syncing" },
    QUEUED: { badge: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500", label: "Queued" },
    FAILED: { badge: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500", label: "Failed" },
  };
  return map[status] ?? { badge: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400", label: status };
}

export default function PhotographerEventDetailsPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = useMemo(() => String(params?.eventId || ""), [params]);

  const [origin, setOrigin] = useState("");
  const [copiedKey, setCopiedKey] = useState("");
  const [eventData, setEventData] = useState<EventResponse | null>(null);
  const [photos, setPhotos] = useState<EventPhotoSafeResponse[]>([]);
  const [guests, setGuests] = useState<EventGuestsResponse | null>(null);
  const [statusData, setStatusData] = useState<EventProcessingStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const statusRef = useRef<EventProcessingStatusResponse | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  async function copyText(text: string, key: string) {
    if (!text) return;
    try {
      await navigator.clipboard?.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((current) => (current === key ? "" : current)), 1400);
    } catch (_err) {
      // ignore clipboard errors
    }
  }
  async function downloadQrImage(url: string, filename: string) {
    if (!url) return;
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error("QR download failed");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  async function loadEventMeta() {
    if (!eventId) return;
    const [evtResp, guestsResp] = await Promise.all([
      getPhotographerEvent(eventId),
      getPhotographerEventGuests(eventId),
    ]);
    setEventData(evtResp);
    setGuests(guestsResp);
  }

  async function loadPhotos() {
    if (!eventId) return;
    setPhotos(await getPhotographerEventPhotos(eventId));
  }

  async function refreshStatus() {
    if (!eventId) return;
    const next = await getPhotographerEventStatus(eventId);
    statusRef.current = next;
    setStatusData(next);
    if (next.status === "COMPLETED") await loadPhotos();
  }

  async function loadAll() {
    if (!eventId) return;
    setLoading(true);
    setError("");
    try {
      await Promise.all([loadEventMeta(), loadPhotos(), refreshStatus()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    statusRef.current = null;
    void loadAll();
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    if (!isActiveStatus(statusData?.status)) return;
    const timer = setInterval(() => {
      void refreshStatus();
    }, 3000);
    return () => clearInterval(timer);
  }, [eventId, statusData?.status]);

  async function onSync() {
    setSyncing(true);
    setError("");
    try {
      await syncPhotographerEvent(eventId);
      await Promise.all([loadEventMeta(), refreshStatus()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start sync");
    } finally {
      setSyncing(false);
    }
  }

  async function onCancel() {
    setCanceling(true);
    try {
      await cancelPhotographerEvent(eventId);
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setCanceling(false);
    }
  }

  const sc = statusConfig(eventData?.status ?? "");
  const progress = Math.max(0, Math.min(100, statusData?.progress_percentage ?? 0));
  const guestList = guests?.guests ?? [];
  const processed = Math.max(0, statusData?.processed_photos ?? 0);
  const total = Math.max(0, statusData?.total_photos ?? 0);
  const remainingPhotos = Math.max(0, total - processed);
  const etaMinutes = remainingPhotos > 0 ? Math.max(1, Math.ceil(remainingPhotos / 120)) : 0;

  const publicGuestPath = useMemo(() => {
    if (!eventData?.slug) return "";
    return `/g/${encodeURIComponent(eventData.slug)}`;
  }, [eventData?.slug]);

  const publicGuestUrl = useMemo(() => {
    if (!origin || !publicGuestPath) return "";
    return `${origin}${publicGuestPath}`;
  }, [origin, publicGuestPath]);

  const qrImageUrl = useMemo(() => {
    if (!publicGuestUrl) return "";
    return `/api/qr?size=320&data=${encodeURIComponent(publicGuestUrl)}`;
  }, [publicGuestUrl]);

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-7xl animate-pulse flex-col gap-6">
        <div className="h-8 w-1/3 rounded bg-slate-200" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-slate-100" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
      <nav className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/photographer/events" className="transition-colors hover:text-primary">Events</Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="font-medium text-slate-900">{eventData?.name ?? "Event Details"}</span>
      </nav>

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${sc.badge}`}>
              <span className={`size-1.5 rounded-full ${sc.dot}`} />
              {sc.label}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-mono text-slate-600">
              Event ID: {eventData?.event_code || "----"}
              <button
                type="button"
                onClick={() => void copyText(eventData?.event_code || "", "event-id")}
                className="inline-flex items-center rounded px-1 text-primary hover:bg-primary/10"
                title="Copy Event ID"
              >
                <span className="material-symbols-outlined text-[14px]">content_copy</span>
              </button>
              {copiedKey === "event-id" ? <span className="font-semibold text-emerald-600">Copied</span> : null}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{eventData?.name ?? "—"}</h1>
          <p className="mt-1 text-sm text-slate-500">/{eventData?.slug}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={canceling || !isActiveStatus(statusData?.status)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[18px]">pause_circle</span>
            {canceling ? "Canceling..." : "Pause"}
          </button>
          <button
            onClick={onSync}
            disabled={syncing}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 disabled:opacity-60"
          >
            <span className={`material-symbols-outlined text-[18px] ${syncing ? "animate-spin" : ""}`}>sync</span>
            {syncing ? "Starting..." : "Sync Now"}
          </button>
        </div>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {[
          { label: "Total Photos", value: total, icon: "photo_library", color: "text-indigo-600 bg-indigo-50" },
          { label: "Processed", value: processed, icon: "auto_awesome", color: "text-emerald-600 bg-emerald-50" },
          { label: "Guests", value: guestList.length, icon: "group", color: "text-violet-600 bg-violet-50" },
        ].map((s) => (
          <div key={s.label} className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`mb-2 inline-flex w-fit items-center justify-center rounded-lg p-2 ${s.color}`}>
              <span className="material-symbols-outlined text-[22px]">{s.icon}</span>
            </div>
            <p className="font-mono text-2xl font-bold text-slate-900">{s.value.toLocaleString()}</p>
            <p className="text-xs font-medium text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Public Guest Face Match Link</h2>
            {publicGuestPath ? (
              <Link href={publicGuestPath} className="text-xs font-semibold text-primary hover:underline">
                Open Page
              </Link>
            ) : null}
          </div>
          {!publicGuestUrl ? (
            <p className="text-sm text-slate-400">Public guest link will appear after slug is available.</p>
          ) : (
            <>
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="material-symbols-outlined text-[16px] text-slate-400">link</span>
                <span className="flex-1 truncate text-xs text-slate-600">{publicGuestUrl}</span>
                <button
                  type="button"
                  onClick={() => void copyText(publicGuestUrl, "guest-link")}
                  className="text-primary hover:text-primary/80"
                  title="Copy Guest Link"
                >
                  <span className="material-symbols-outlined text-[16px]">content_copy</span>
                </button>
              </div>
              {copiedKey === "guest-link" ? <p className="mt-2 text-[11px] text-emerald-700">Guest link copied.</p> : null}
            </>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 font-bold text-slate-900">Scanner Card</h2>
          {!publicGuestUrl ? (
            <p className="text-sm text-slate-400">QR scanner will be available after guest link is ready.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-3">
                {qrImageUrl ? (
                  <img src={qrImageUrl} alt="Guest QR" className="h-44 w-44 rounded-lg border border-slate-200 bg-white p-2" />
                ) : null}
              </div>
              <p className="text-[11px] text-slate-500">Guests can scan this and open face match directly without login for public events.</p>
              <button
                type="button"
                data-no-loader="true"
                onClick={() => void downloadQrImage(qrImageUrl, `grabpic-${eventData?.slug || "event"}-scanner.png`)}
                disabled={!qrImageUrl}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[14px]">download</span>
                Download QR
              </button>
            </div>
          )}
        </div>
      </div>

      {statusData ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="font-bold text-slate-900">Batch Processing</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {isActiveStatus(statusData.status) ? "Processing photos from Drive..." : `Status: ${statusData.status}`}
              </p>
            </div>
            <span className="font-mono text-3xl font-bold text-primary">{progress.toFixed(0)}%</span>
          </div>
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%`, boxShadow: "0 0 12px rgba(72,72,229,0.4)" }}
            />
          </div>
          <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-slate-400">
            <span>
              {processed} / {total} photos
              {statusData.failed_photos > 0 ? <span className="ml-2 text-red-500">• {statusData.failed_photos} failed</span> : null}
            </span>
            <span>Updated {new Date(statusData.updated_at).toLocaleTimeString()}</span>
          </div>
          {isActiveStatus(statusData.status) && remainingPhotos > 0 ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Face match is already available for {processed} processed photo(s). {remainingPhotos} photo(s) are still syncing. Estimated time left: {etaMinutes} minute{etaMinutes > 1 ? "s" : ""}.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 font-bold text-slate-900">
              <span className="material-symbols-outlined text-[20px] text-primary">folder_shared</span>
              Google Drive Sync
            </h2>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between border-b border-slate-100 py-3">
                <span className="text-slate-500">Current Path</span>
                <div className="flex items-center gap-2 font-medium text-slate-700">
                  <span className="material-symbols-outlined text-[18px] text-slate-400">folder_open</span>
                  {eventData?.drive_folder_id ? `.../${eventData.drive_folder_id.slice(0, 20)}` : "Not connected"}
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500">Drive Link</span>
                {eventData?.drive_link ? (
                  <a href={eventData.drive_link} target="_blank" rel="noreferrer" className="max-w-[200px] truncate text-xs font-medium text-primary hover:underline">
                    Open in Drive ↗
                  </a>
                ) : <span className="text-slate-400">—</span>}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold text-slate-900">
                <span className="material-symbols-outlined text-[20px] text-primary">photo_library</span>
                Live Gallery Preview
              </h2>
              <span className="text-xs text-slate-400">{photos.length} photos</span>
            </div>
            {photos.length === 0 ? (
              <div className="py-10 text-center">
                <span className="material-symbols-outlined mb-2 block text-4xl text-slate-300">image_not_supported</span>
                <p className="text-sm text-slate-400">No photos processed yet. Start sync to begin.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {photos.slice(0, 8).map((photo) => (
                  <div key={photo.photo_id} className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100">
                    <img
                      src={backendAssetUrl(photo.thumbnail_url)}
                      alt={photo.file_name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 transition-all group-hover:bg-black/20" />
                  </div>
                ))}
                {photos.length > 8 ? (
                  <div className="flex aspect-square items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-500">
                    +{photos.length - 8} more
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold text-slate-900">
                <span className="material-symbols-outlined text-[20px] text-primary">group</span>
                Guests
              </h2>
              <Link href={`/photographer/events/${eventId}/guests`} className="text-xs font-semibold text-primary hover:underline">
                Manage →
              </Link>
            </div>
            {guestList.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No guests yet</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {guestList.slice(0, 5).map((g) => {
                  const initials = g.email.slice(0, 2).toUpperCase();
                  return (
                    <li key={g.user_id} className="flex items-center gap-3 border-b border-slate-50 py-2 last:border-0">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{g.email}</p>
                        <p className="text-xs text-slate-400">{new Date(g.joined_at).toLocaleDateString()}</p>
                      </div>
                    </li>
                  );
                })}
                {guestList.length > 5 ? (
                  <li className="pt-1 text-center">
                    <Link href={`/photographer/events/${eventId}/guests`} className="text-xs font-semibold text-primary hover:underline">
                      +{guestList.length - 5} more guests
                    </Link>
                  </li>
                ) : null}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-bold text-slate-700">Event Pages</h3>
            <div className="flex flex-col gap-2">
              {[
                { href: `/photographer/events/${eventId}/sync`, icon: "sync_alt", label: "Live Sync Monitor" },
                { href: `/photographer/events/${eventId}/guests`, icon: "group", label: "Guest Management" },
                { href: `/photographer/events/${eventId}/settings`, icon: "settings", label: "Event Settings" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-primary"
                >
                  <span className="material-symbols-outlined text-[18px]">{l.icon}</span>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
