"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import type { GuestEventSummary, GuestMatchResponse } from "@/lib/api";
import { getGuestEvent, getGuestMatch, submitGuestSelfie } from "@/lib/rbac-api";

function statusText(match: GuestMatchResponse | null): string {
  if (!match) return "No selfie submitted yet.";
  if (match.status === "queued" || match.status === "running") return match.message || "Processing selfie...";
  if (match.status === "completed") return `Match complete. Confidence ${(match.confidence * 100).toFixed(1)}%.`;
  return match.message || "No confident match yet.";
}

export default function GuestEventPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = useMemo(() => String(params?.eventId || ""), [params]);

  const [summary, setSummary] = useState<GuestEventSummary | null>(null);
  const [match, setMatch] = useState<GuestMatchResponse | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function loadEvent() {
    if (!eventId) return;
    setLoading(true);
    setError("");
    try {
      setSummary(await getGuestEvent(eventId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load event");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEvent();
  }, [eventId]);

  useEffect(() => {
    if (!match?.query_id) return;
    if (match.status !== "queued" && match.status !== "running") return;

    const interval = window.setInterval(async () => {
      try {
        const next = await getGuestMatch(match.query_id);
        setMatch(next);
      } catch {
        // keep last known state and retry on next tick
      }
    }, 1800);
    return () => window.clearInterval(interval);
  }, [match?.query_id, match?.status]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!eventId || !file) return;
    setUploading(true);
    setError("");
    try {
      const result = await submitGuestSelfie(eventId, file);
      setMatch(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload selfie");
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading event...</p>;

  return (
    <main className="grid gap-4">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <section className="rounded-xl border border-line bg-white p-5">
        <h1 className="font-display text-2xl font-semibold text-slate-900">{summary?.name || "Event"}</h1>
        <p className="mt-2 text-sm text-muted">
          Status: {summary?.status} | Slug: {summary?.slug}
        </p>
      </section>

      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="font-display text-xl font-semibold text-slate-900">Upload Selfie</h2>
        <p className="mt-2 text-sm text-muted">Upload a clear face selfie to generate your My Photos set.</p>
        <form className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={onSubmit}>
          <input
            className="field"
            type="file"
            accept="image/*"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            required
          />
          <button className="btn btn-primary" type="submit" disabled={uploading || !file}>
            {uploading ? "Uploading..." : "Upload Selfie"}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="font-display text-xl font-semibold text-slate-900">Match Status</h2>
        <p className="mt-2 text-sm text-muted">{statusText(match)}</p>
        {match?.query_id ? <p className="mt-1 text-xs text-muted">Query: {match.query_id}</p> : null}
        <div className="mt-4 flex gap-2">
          <Link className="btn btn-secondary text-xs" href={`/guest/my-photos/${eventId}`}>
            Open My Photos
          </Link>
        </div>
      </section>
    </main>
  );
}
