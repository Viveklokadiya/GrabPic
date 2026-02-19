"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { GuestEventListItem } from "@/lib/api";
import { getGuestEvents } from "@/lib/rbac-api";

export default function GuestMyPhotosIndexPage() {
  const [events, setEvents] = useState<GuestEventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        setEvents(await getGuestEvents());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load events");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <main className="rounded-xl border border-line bg-white p-5">
      <h1 className="font-display text-2xl font-semibold text-slate-900">My Photos</h1>
      <p className="mt-2 text-sm text-muted">Choose an event to view your matched gallery.</p>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      {loading ? <p className="mt-3 text-sm text-muted">Loading events...</p> : null}
      {!loading && !events.length ? <p className="mt-3 text-sm text-muted">No joined events yet.</p> : null}
      <div className="mt-4 grid gap-3">
        {events.map((event) => (
          <article key={event.event_id} className="rounded-lg border border-line p-4">
            <p className="font-semibold text-slate-900">{event.name}</p>
            <p className="mt-1 text-xs text-muted">Joined {new Date(event.joined_at).toLocaleString()}</p>
            <div className="mt-3">
              <Link href={`/guest/my-photos/${event.event_id}`} className="btn btn-secondary text-xs">
                Open Photos
              </Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
