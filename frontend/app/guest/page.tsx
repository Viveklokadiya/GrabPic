"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import type { GuestEventListItem } from "@/lib/api";
import { getGuestEvents, joinGuestEvent } from "@/lib/rbac-api";

export default function GuestHomePage() {
  const [eventId, setEventId] = useState("");
  const [events, setEvents] = useState<GuestEventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  async function loadEvents() {
    setLoading(true);
    setError("");
    try {
      setEvents(await getGuestEvents());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load joined events");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEvents();
  }, []);

  async function onJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setJoining(true);
    setError("");
    try {
      await joinGuestEvent(eventId.trim());
      setEventId("");
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join event");
    } finally {
      setJoining(false);
    }
  }

  return (
    <main className="grid gap-4">
      <section className="rounded-xl border border-line bg-white p-5">
        <h1 className="font-display text-2xl font-semibold text-slate-900">Join Event</h1>
        <p className="mt-2 text-sm text-muted">Enter event id from your photographer link to access your photos.</p>
        <form className="mt-4 flex flex-wrap gap-2" onSubmit={onJoin}>
          <input
            className="field !w-[min(420px,100%)]"
            placeholder="Event ID"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            required
          />
          <button className="btn btn-primary" type="submit" disabled={joining}>
            {joining ? "Joining..." : "Join Event"}
          </button>
        </form>
        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      </section>

      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="font-display text-xl font-semibold text-slate-900">Joined Events</h2>
        {loading ? <p className="mt-2 text-sm text-muted">Loading events...</p> : null}
        {!loading && !events.length ? <p className="mt-2 text-sm text-muted">No events joined yet.</p> : null}
        <div className="mt-3 grid gap-3">
          {events.map((item) => (
            <article key={item.event_id} className="rounded-lg border border-line p-4">
              <p className="font-semibold text-slate-900">{item.name}</p>
              <p className="mt-1 text-xs text-muted">
                Joined {new Date(item.joined_at).toLocaleString()} | Status: {item.status}
              </p>
              <div className="mt-3 flex gap-2">
                <Link className="btn btn-secondary text-xs" href={`/guest/events/${item.event_id}`}>
                  Open Event
                </Link>
                <Link className="btn btn-secondary text-xs" href={`/guest/my-photos/${item.event_id}`}>
                  My Photos
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
