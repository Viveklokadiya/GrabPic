"use client";

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

function statusTone(status: string): string {
  if (status === "COMPLETED") return "text-teal-700";
  if (status === "FAILED" || status === "CANCELLED") return "text-red-700";
  return "text-amber-700";
}

export default function PhotographerEventDetailsPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = useMemo(() => String(params?.eventId || ""), [params]);

  const [eventData, setEventData] = useState<EventResponse | null>(null);
  const [photos, setPhotos] = useState<EventPhotoSafeResponse[]>([]);
  const [guests, setGuests] = useState<EventGuestsResponse | null>(null);
  const [statusData, setStatusData] = useState<EventProcessingStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const statusRef = useRef<EventProcessingStatusResponse | null>(null);

  async function loadEventMeta() {
    if (!eventId) return;
    const [eventResponse, guestsResponse] = await Promise.all([getPhotographerEvent(eventId), getPhotographerEventGuests(eventId)]);
    setEventData(eventResponse);
    setGuests(guestsResponse);
  }

  async function loadPhotos(showLoading = false) {
    if (!eventId) return;
    if (showLoading) setPhotosLoading(true);
    try {
      setPhotos(await getPhotographerEventPhotos(eventId));
    } finally {
      if (showLoading) setPhotosLoading(false);
    }
  }

  async function refreshStatusAndPhotos() {
    if (!eventId) return;
    const prevStatus = statusRef.current;
    const nextStatus = await getPhotographerEventStatus(eventId);

    const shouldReloadPhotos =
      !prevStatus ||
      nextStatus.processed_photos !== prevStatus.processed_photos ||
      nextStatus.total_photos !== prevStatus.total_photos ||
      nextStatus.status !== prevStatus.status;
    statusRef.current = nextStatus;
    setStatusData(nextStatus);
    if (shouldReloadPhotos || nextStatus.status === "COMPLETED") {
      await loadPhotos(false);
    }
  }

  async function loadAll() {
    if (!eventId) return;
    setLoading(true);
    setError("");
    try {
      await Promise.all([loadEventMeta(), loadPhotos(true), refreshStatusAndPhotos()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load event details");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    statusRef.current = null;
    void loadAll();
  }, [eventId]);

  const inviteUrl = useMemo(() => {
    if (!eventData?.slug) return "";
    return `/guest/join?slug=${encodeURIComponent(eventData.slug)}`;
  }, [eventData?.slug]);

  const publicSelfieUrl = useMemo(() => {
    if (!eventData?.slug) return "";
    return (eventData.guest_url || `/g/${eventData.slug}`).trim();
  }, [eventData?.slug, eventData?.guest_url]);

  useEffect(() => {
    if (!eventId) return;
    if (!isActiveStatus(statusData?.status)) return;
    const timer = window.setInterval(() => {
      void refreshStatusAndPhotos();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [eventId, statusData?.status]);

  async function onSync() {
    if (!eventId) return;
    setSyncing(true);
    setError("");
    try {
      await syncPhotographerEvent(eventId);
      await Promise.all([loadEventMeta(), refreshStatusAndPhotos()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start sync");
    } finally {
      setSyncing(false);
    }
  }

  async function onCancel() {
    if (!eventId) return;
    setCanceling(true);
    setError("");
    setStatusData((prev) => {
      const next = prev ? { ...prev, status: "CANCELLED" } : prev;
      statusRef.current = next;
      return next;
    });
    try {
      await cancelPhotographerEvent(eventId);
      await Promise.all([loadEventMeta(), refreshStatusAndPhotos()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel running job");
    } finally {
      setCanceling(false);
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading event...</p>;

  return (
    <main className="grid gap-4">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <section className="rounded-xl border border-line bg-white p-5">
        <h1 className="font-display text-2xl font-semibold text-slate-900">Event Details</h1>
        <div className="mt-3 grid gap-2 text-sm">
          <p>
            <strong>Name:</strong> {eventData?.name || "-"}
          </p>
          <p>
            <strong>Slug:</strong> {eventData?.slug || "-"}
          </p>
          <p>
            <strong>Drive Folder:</strong> {eventData?.drive_folder_id || "-"}
          </p>
          <p>
            <strong>Status:</strong> {eventData?.status || "-"}
          </p>
          {inviteUrl ? (
            <p>
              <strong>Guest Join URL:</strong>{" "}
              <a href={inviteUrl} target="_blank" rel="noreferrer" className="underline">
                {inviteUrl}
              </a>
            </p>
          ) : null}
          {publicSelfieUrl ? (
            <p>
              <strong>Public Selfie URL:</strong>{" "}
              <a href={publicSelfieUrl} target="_blank" rel="noreferrer" className="underline">
                {publicSelfieUrl}
              </a>
            </p>
          ) : null}
          <p className="text-xs text-muted">Guest Join URL auto-joins signed-in guest users directly to this event.</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={onSync} disabled={syncing}>
            {syncing ? "Starting..." : "Start Sync / Reprocess"}
          </button>
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={canceling || !isActiveStatus(statusData?.status)}
            type="button"
          >
            {canceling ? "Canceling..." : "Cancel Running Job"}
          </button>
        </div>
        {statusData ? (
          <div className="mt-3 rounded-lg border border-line p-3">
            <p className={`text-sm font-semibold ${statusTone(statusData.status)}`}>Job Status: {statusData.status}</p>
            <p className="mt-1 text-xs text-muted">
              Processed {statusData.processed_photos} / {statusData.total_photos} | Failed {statusData.failed_photos}
            </p>
            <div className="mt-2 h-2 w-full rounded-full bg-bg">
              <div className="h-2 rounded-full bg-accent transition-all duration-300" style={{ width: `${statusData.progress_percentage}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted">
              {statusData.progress_percentage.toFixed(1)}% | Updated {new Date(statusData.updated_at).toLocaleString()}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted">No processing job yet.</p>
        )}
      </section>

      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="font-display text-xl font-semibold text-slate-900">Guest List</h2>
        {guests?.guests?.length ? (
          <ul className="mt-3 grid gap-2 text-sm">
            {guests.guests.map((guest) => (
              <li key={guest.user_id} className="rounded-md border border-line px-3 py-2">
                {guest.email} - joined {new Date(guest.joined_at).toLocaleString()}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">No guests joined yet.</p>
        )}
      </section>

      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="font-display text-xl font-semibold text-slate-900">Photo Grid</h2>
        {photosLoading ? <p className="mt-3 text-sm text-muted">Refreshing photos...</p> : null}
        {!photos.length ? (
          <p className="mt-3 text-sm text-muted">No photos processed yet.</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {photos.map((photo) => (
              <article key={photo.photo_id} className="overflow-hidden rounded-lg border border-line">
                <img src={backendAssetUrl(photo.thumbnail_url)} alt={photo.file_name} className="h-36 w-full object-cover" />
                <div className="p-2">
                  <p className="line-clamp-1 text-xs font-medium">{photo.file_name}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
