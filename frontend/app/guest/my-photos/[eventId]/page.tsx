"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { GuestMyPhotosResponse } from "@/lib/api";
import { backendAssetUrl } from "@/lib/asset-url";
import { getGuestMyPhotos } from "@/lib/rbac-api";

export default function GuestMyPhotosPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = useMemo(() => String(params?.eventId || ""), [params]);

  const [response, setResponse] = useState<GuestMyPhotosResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadPhotos() {
    if (!eventId) return;
    setLoading(true);
    setError("");
    try {
      setResponse(await getGuestMyPhotos(eventId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load photos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPhotos();
  }, [eventId]);

  useEffect(() => {
    if (!response) return;
    if (response.status !== "queued" && response.status !== "running") return;
    const interval = window.setInterval(() => {
      void loadPhotos();
    }, 1800);
    return () => window.clearInterval(interval);
  }, [response?.status, response?.query_id]);

  if (loading) return <p className="text-sm text-muted">Loading photos...</p>;

  return (
    <main className="grid gap-4">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <section className="rounded-xl border border-line bg-white p-5">
        <h1 className="font-display text-2xl font-semibold text-slate-900">My Photos</h1>
        <p className="mt-2 text-sm text-muted">{response?.message || "No photos yet."}</p>
        <div className="mt-4 flex gap-2">
          <Link className="btn btn-secondary text-xs" href={`/guest/events/${eventId}`}>
            Back to Event
          </Link>
          <button className="btn btn-secondary text-xs" type="button" onClick={() => void loadPhotos()}>
            Refresh
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white p-5">
        {!response?.photos?.length ? (
          <p className="text-sm text-muted">
            {response?.status === "queued" || response?.status === "running"
              ? "Selfie is still processing. This page auto-refreshes."
              : "No matched photos yet."}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {response.photos.map((photo) => (
              <article key={photo.photo_id} className="overflow-hidden rounded-lg border border-line bg-white">
                <img src={backendAssetUrl(photo.thumbnail_url)} alt={photo.photo_id} className="h-40 w-full object-cover" />
                <div className="p-2">
                  <a href={photo.download_url || "#"} className="btn btn-secondary text-xs" target="_blank" rel="noreferrer">
                    Open
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
