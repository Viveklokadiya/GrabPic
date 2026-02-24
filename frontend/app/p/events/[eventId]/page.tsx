"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import Card from "@/components/card";
import StatusPill from "@/components/status-pill";
import { cancelJob, EventResponse, getEvent, resyncEvent } from "@/lib/api";
import { loadEventSecrets } from "@/lib/local";

function toneForStatus(status: string): "neutral" | "success" | "warn" | "danger" {
  if (status === "completed" || status === "ready") return "success";
  if (status === "failed") return "danger";
  if (status === "running" || status === "queued" || status === "cancel_requested" || status === "syncing" || status === "processing_clusters") return "warn";
  if (status === "canceled") return "neutral";
  return "neutral";
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isEventProcessingActive(eventData: EventResponse): boolean {
  if (eventData.status === "syncing" || eventData.status === "processing_clusters") {
    return true;
  }
  return eventData.jobs.some((job) => job.status === "queued" || job.status === "running" || job.status === "cancel_requested");
}

function canCancelJob(status: string): boolean {
  return status === "queued" || status === "running";
}

export default function EventDashboardPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = useMemo(() => String(params?.eventId || ""), [params]);
  const [adminToken, setAdminToken] = useState("");
  const [eventData, setEventData] = useState<EventResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [resyncing, setResyncing] = useState(false);
  const [cancelingJobId, setCancelingJobId] = useState("");
  const [error, setError] = useState("");
  const processingActive = eventData ? isEventProcessingActive(eventData) : false;

  useEffect(() => {
    if (!eventId) return;
    const saved = loadEventSecrets(eventId);
    if (saved?.adminToken) {
      setAdminToken(saved.adminToken);
    }
  }, [eventId]);

  async function loadEvent() {
    if (!eventId) return;
    setLoading(true);
    setError("");
    try {
      const response = await getEvent(eventId, adminToken.trim() || undefined);
      setEventData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load event");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!eventData) return;
    if (!isEventProcessingActive(eventData)) return;
    const timer = setInterval(() => {
      void loadEvent();
    }, 1000);
    return () => clearInterval(timer);
  }, [eventData]); // eslint-disable-line react-hooks/exhaustive-deps

  async function triggerResync() {
    if (!eventId) return;
    setResyncing(true);
    setError("");
    try {
      await resyncEvent(eventId, adminToken.trim() || undefined);
      await loadEvent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to queue resync");
    } finally {
      setResyncing(false);
    }
  }

  async function triggerCancelJob(jobId: string) {
    setCancelingJobId(jobId);
    setError("");
    try {
      await cancelJob(jobId, adminToken.trim() || undefined);
      await loadEvent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel job");
    } finally {
      setCancelingJobId("");
    }
  }

  const savedSecrets = loadEventSecrets(eventId);
  const slug = eventData?.slug || savedSecrets?.slug || "";
  const guestJoinPath = slug ? `/guest/join?slug=${encodeURIComponent(slug)}` : "";
  const guestPath = slug ? `/g/${slug}` : "";

  return (
    <main className="grid gap-5">
      <Card title="Photographer Dashboard">
        <p className="text-sm text-muted">Event ID: {eventId}</p>
        <div className="mt-4 grid gap-3">
          <label className="text-sm">
            Admin Token (optional for legacy events)
            <input
              className="field mt-1 font-mono text-xs"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              placeholder="Paste event admin token"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" type="button" onClick={loadEvent} disabled={loading}>
              {loading || processingActive ? "Loading..." : "Load Event"}
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
              {guestJoinPath ? (
                <p>
                  <strong>Guest Join URL:</strong>{" "}
                  <a href={guestJoinPath} target="_blank" rel="noreferrer" className="underline">
                    {guestJoinPath}
                  </a>
                </p>
              ) : null}
              {guestPath ? (
                <p>
                  <strong>Public Selfie URL:</strong>{" "}
                  <a href={guestPath} target="_blank" rel="noreferrer" className="underline">
                    {guestPath}
                  </a>
                </p>
              ) : null}
              <p className="text-xs text-muted">Guest Join URL auto-joins signed-in guest users directly to this event.</p>
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
                      <div className="flex items-center gap-2">
                        <StatusPill label={job.status} tone={toneForStatus(job.status)} />
                        {canCancelJob(job.status) ? (
                          <button
                            className="btn btn-secondary !px-2 !py-1 text-xs"
                            type="button"
                            onClick={() => triggerCancelJob(job.job_id)}
                            disabled={cancelingJobId === job.job_id}
                          >
                            {cancelingJobId === job.job_id ? "Canceling..." : "Cancel"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-muted">{job.stage}</p>
                    <div className="mt-2 h-2 w-full rounded-full bg-bg">
                      <div className="h-2 rounded-full bg-accent transition-all duration-300" style={{ width: `${job.progress_percent}%` }} />
                    </div>
                    {job.type === "sync_event" ? (
                      <>
                        <p className="mt-2 text-xs text-muted">
                          Listed {num(job.payload?.total_listed)} | Completed {num(job.payload?.completed)} | Processed{" "}
                          {num(job.payload?.processed)} | Faces {num(job.payload?.matched_faces)} | Errors {num(job.payload?.failures)}
                        </p>
                        {typeof job.payload?.current_file_name === "string" && job.payload.current_file_name ? (
                          <p className="mt-1 text-xs text-muted">Current file: {job.payload.current_file_name}</p>
                        ) : null}
                      </>
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
