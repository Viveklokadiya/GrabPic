"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import Card from "@/components/card";
import StatusPill from "@/components/status-pill";
import { EventResponse, getEvent, resyncEvent } from "@/lib/api";
import { loadEventSecrets } from "@/lib/local";

function toneForStatus(status: string): "neutral" | "success" | "warn" | "danger" {
  if (status === "completed" || status === "ready") return "success";
  if (status === "failed") return "danger";
  if (status === "running" || status === "syncing" || status === "processing_clusters") return "warn";
  return "neutral";
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function EventDashboardPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = useMemo(() => String(params?.eventId || ""), [params]);
  const [adminToken, setAdminToken] = useState("");
  const [eventData, setEventData] = useState<EventResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [resyncing, setResyncing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!eventId) return;
    const saved = loadEventSecrets(eventId);
    if (saved?.adminToken) {
      setAdminToken(saved.adminToken);
    }
  }, [eventId]);

  async function loadEvent() {
    if (!eventId || !adminToken.trim()) return;
    setLoading(true);
    setError("");
    try {
      const response = await getEvent(eventId, adminToken.trim());
      setEventData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load event");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!eventData || !adminToken.trim()) return;
    const timer = setInterval(() => {
      void loadEvent();
    }, 3000);
    return () => clearInterval(timer);
  }, [eventData, adminToken]); // eslint-disable-line react-hooks/exhaustive-deps

  async function triggerResync() {
    if (!eventId || !adminToken.trim()) return;
    setResyncing(true);
    setError("");
    try {
      await resyncEvent(eventId, adminToken.trim());
      await loadEvent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to queue resync");
    } finally {
      setResyncing(false);
    }
  }

  const savedSecrets = loadEventSecrets(eventId);
  const guestCode = savedSecrets?.guestCode || "";
  const slug = eventData?.slug || savedSecrets?.slug || "";
  const guestPath =
    eventData?.guest_ready && slug
      ? `/g/${slug}${guestCode ? `?code=${encodeURIComponent(guestCode)}` : ""}`
      : "";

  return (
    <main className="grid gap-5">
      <Card title="Photographer Dashboard">
        <p className="text-sm text-muted">Event ID: {eventId}</p>
        <div className="mt-4 grid gap-3">
          <label className="text-sm">
            Admin Token
            <input
              className="field mt-1 font-mono text-xs"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              placeholder="Paste event admin token"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" type="button" onClick={loadEvent} disabled={loading || !adminToken.trim()}>
              {loading ? "Loading..." : "Load Event"}
            </button>
            <button className="btn btn-secondary" type="button" onClick={triggerResync} disabled={resyncing || !eventData}>
              {resyncing ? "Queueing..." : "Queue Re-sync"}
            </button>
            <Link href="/p/new" className="btn btn-secondary">
              New Event
            </Link>
          </div>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </div>
      </Card>

      {eventData ? (
        <>
          <Card title="Event Details">
            <div className="grid gap-2 text-sm">
              <p>
                <strong>Name:</strong> {eventData.name}
              </p>
              <p>
                <strong>Slug:</strong> {eventData.slug}
              </p>
              <p>
                <strong>Drive Folder:</strong> {eventData.drive_folder_id}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <StatusPill label={eventData.status} tone={toneForStatus(eventData.status)} />
              </p>
              {guestCode ? (
                <p>
                  <strong>Guest Code:</strong> <code>{guestCode}</code>
                </p>
              ) : null}
              {eventData.guest_ready && guestPath ? (
                <p>
                  <strong>Guest Link:</strong>{" "}
                  <a href={guestPath} target="_blank" rel="noreferrer" className="underline">
                    {guestPath}
                  </a>
                </p>
              ) : (
                <p className="text-muted">Guest link will be enabled after all images are processed.</p>
              )}
            </div>
          </Card>

          <Card title="Jobs">
            <div className="grid gap-3">
              {eventData.jobs.length ? (
                eventData.jobs.map((job) => (
                  <div key={job.job_id} className="rounded-md border border-line p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">
                        {job.type} <span className="font-mono text-xs text-muted">{job.job_id}</span>
                      </p>
                      <StatusPill label={job.status} tone={toneForStatus(job.status)} />
                    </div>
                    <p className="mt-1 text-sm text-muted">{job.stage}</p>
                    <div className="mt-2 h-2 w-full rounded-full bg-bg">
                      <div className="h-2 rounded-full bg-accent transition-all duration-300" style={{ width: `${job.progress_percent}%` }} />
                    </div>
                    {job.type === "sync_event" ? (
                      <p className="mt-2 text-xs text-muted">
                        Listed {num(job.payload?.total_listed)} | Completed {num(job.payload?.completed)} | Processed{" "}
                        {num(job.payload?.processed)} | Faces {num(job.payload?.matched_faces)} | Errors {num(job.payload?.failures)}
                      </p>
                    ) : null}
                    {job.type === "match_guest" ? (
                      <p className="mt-2 text-xs text-muted">
                        Match confidence: {num(job.payload?.confidence) > 0 ? `${(num(job.payload?.confidence) * 100).toFixed(1)}%` : "pending"}
                        {" | "}Photos: {num(job.payload?.photos)}
                      </p>
                    ) : null}
                    {job.error ? <p className="mt-2 text-xs text-red-700">{job.error}</p> : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted">No jobs yet.</p>
              )}
            </div>
          </Card>
        </>
      ) : null}
    </main>
  );
}
