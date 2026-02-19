"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import Card from "@/components/card";
import { createEvent, EventCreateResponse } from "@/lib/api";
import { saveEventSecrets } from "@/lib/local";

export default function NewEventPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [driveLink, setDriveLink] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<EventCreateResponse | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await createEvent({
        name: name.trim(),
        drive_link: driveLink.trim(),
        slug: slug.trim() || undefined
      });
      saveEventSecrets({
        eventId: response.event_id,
        slug: response.slug,
        adminToken: response.admin_token,
        guestCode: response.guest_code
      });
      setCreated(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create event");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid gap-5">
      <Card title="Create Photographer Event">
        <p className="mb-4 text-sm text-muted">Creates event, returns guest code and one-time admin token, and queues initial Drive sync.</p>
        <form className="grid gap-3" onSubmit={onSubmit}>
          <label className="text-sm">
            Event Name
            <input className="field mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="text-sm">
            Public Google Drive Folder Link
            <input className="field mt-1" value={driveLink} onChange={(e) => setDriveLink(e.target.value)} required />
          </label>
          <label className="text-sm">
            Slug (optional)
            <input className="field mt-1" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="wedding-delhi-2026" />
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Event"}
            </button>
            <Link href="/" className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </Card>

      {created ? (
        <Card title="Event Created">
          <div className="grid gap-2 text-sm">
            <p>
              <strong>Event ID:</strong> {created.event_id}
            </p>
            <p>
              <strong>Slug:</strong> {created.slug}
            </p>
            <p>
              <strong>Guest Code:</strong> <code>{created.guest_code}</code>
            </p>
            <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
              <strong>Admin Token (shown once):</strong> <code className="break-all">{created.admin_token}</code>
            </p>
            {created.guest_url ? (
              <p>
                <strong>Guest URL:</strong>{" "}
                <a className="underline" href={created.guest_url} target="_blank" rel="noreferrer">
                  {created.guest_url}
                </a>
              </p>
            ) : (
              <p className="text-muted">
                Guest link is generated after image processing completes. Open event dashboard for live progress.
              </p>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="btn btn-primary"
              onClick={() => router.push(`/p/events/${created.event_id}`)}
              type="button"
            >
              Open Event Dashboard
            </button>
          </div>
        </Card>
      ) : null}
    </main>
  );
}
