"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import type { PhotographerEventListItem } from "@/lib/api";
import { saveEventSecrets } from "@/lib/local";
import { createPhotographerEvent, getPhotographerEvents } from "@/lib/rbac-api";

export default function PhotographerEventsPage() {
  const [events, setEvents] = useState<PhotographerEventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [driveLink, setDriveLink] = useState("");
  const [slug, setSlug] = useState("");

  async function loadEvents() {
    setLoading(true);
    setError("");
    try {
      setEvents(await getPhotographerEvents());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEvents();
  }, []);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      setName("");
      setDriveLink("");
      setSlug("");
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="grid gap-4">
      <section className="rounded-xl border border-line bg-white p-5">
        <h1 className="font-display text-2xl font-semibold text-slate-900">My Events</h1>
        <p className="mt-2 text-sm text-muted">Create events and trigger sync processing with your connected folder.</p>

        <form className="mt-4 grid gap-3 md:grid-cols-3" onSubmit={onCreate}>
          <input className="field" placeholder="Event name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input
            className="field"
            placeholder="Google Drive folder link"
            value={driveLink}
            onChange={(e) => setDriveLink(e.target.value)}
            required
          />
          <input className="field" placeholder="Slug (optional)" value={slug} onChange={(e) => setSlug(e.target.value)} />
          <div className="md:col-span-3">
            <button className="btn btn-primary" type="submit" disabled={creating}>
              {creating ? "Creating..." : "Create Event"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="font-display text-xl font-semibold text-slate-900">Event List</h2>
        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        {loading ? <p className="mt-2 text-sm text-muted">Loading events...</p> : null}
        {!loading && !events.length ? <p className="mt-2 text-sm text-muted">No events yet. Create your first event above.</p> : null}
        <div className="mt-3 grid gap-3">
          {events.map((event) => (
            <article key={event.event_id} className="rounded-lg border border-line p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{event.name}</p>
                  <p className="text-xs text-muted">Status: {event.status}</p>
                </div>
                <Link href={`/photographer/events/${event.event_id}`} className="btn btn-secondary text-xs">
                  Open Event
                </Link>
              </div>
              <p className="mt-2 text-xs text-muted">
                Photos: {event.photo_count} | Guests: {event.guest_count} | Last sync:{" "}
                {event.last_sync_at ? new Date(event.last_sync_at).toLocaleString() : "Not started"}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
