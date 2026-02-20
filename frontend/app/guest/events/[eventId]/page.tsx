"use client";

import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import GuestMatchStatusCard from "@/components/guest-match-status";
import type { GuestEventSummary, GuestMatchResponse } from "@/lib/api";
import { isPollingStatus } from "@/lib/guest-match-state";
import { getGuestEvent, getGuestMatch, submitGuestSelfie } from "@/lib/rbac-api";

export default function GuestEventPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = useMemo(() => String(params?.eventId || ""), [params]);

  const [summary, setSummary] = useState<GuestEventSummary | null>(null);
  const [match, setMatch] = useState<GuestMatchResponse | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const pollingInFlightRef = useRef(false);

  const polling = isPollingStatus(match?.status);

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
    const queryId = match?.query_id;
    if (typeof queryId !== "string" || !queryId) return;
    const pollQueryId: string = queryId;
    if (!isPollingStatus(match?.status)) return;
    let canceled = false;

    async function tick() {
      if (pollingInFlightRef.current) return;
      pollingInFlightRef.current = true;
      try {
        const next = await getGuestMatch(pollQueryId);
        if (canceled) return;
        setMatch(next);
      } catch {
        // keep last known state and retry on next tick
      } finally {
        pollingInFlightRef.current = false;
      }
    }

    void tick();
    const interval = window.setInterval(() => {
      void tick();
    }, 2000);
    return () => {
      canceled = true;
      window.clearInterval(interval);
    };
  }, [match?.query_id, match?.status]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!eventId || !file || polling) return;
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
            key={fileInputKey}
            className="field"
            type="file"
            accept="image/*"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            required
          />
          <button className="btn btn-primary" type="submit" disabled={uploading || !file || polling}>
            {uploading ? "Uploading..." : "Upload Selfie"}
          </button>
        </form>
      </section>

      <GuestMatchStatusCard
        match={match}
        isPolling={polling}
        openHref={`/guest/my-photos/${eventId}`}
        openLabel="Open My Photos"
        onRetry={() => {
          setMatch(null);
          setFile(null);
          setFileInputKey((value) => value + 1);
        }}
      />
    </main>
  );
}
