"use client";

import { useEffect, useMemo, useState } from "react";

import Card from "@/components/card";
import StatusPill from "@/components/status-pill";
import { AdminEventOverview, AdminEventsResponse, getAdminEvents, JobResponse } from "@/lib/api";

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1").replace(/\/$/, "");
const backendBase = apiBase.replace(/\/api\/v1$/, "");
const ADMIN_KEY_STORAGE = "grabpic_admin_dashboard_key";

function statusTone(status: string): "neutral" | "success" | "warn" | "danger" {
  if (status === "completed" || status === "ready") return "success";
  if (status === "failed") return "danger";
  if (status === "queued" || status === "running" || status === "syncing" || status === "processing_clusters") {
    return "warn";
  }
  return "neutral";
}

function formatAt(value: string | null | undefined): string {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleString();
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function JobSummary({ job }: { job: JobResponse }) {
  return (
    <div className="rounded-md border border-line bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">
          {job.type} <span className="font-mono text-xs text-muted">{job.job_id}</span>
        </p>
        <StatusPill label={job.status} tone={statusTone(job.status)} />
      </div>
      <p className="mt-1 text-sm text-muted">{job.stage || "-"}</p>
      <div className="mt-2 h-2 w-full rounded-full bg-bg">
        <div className="h-2 rounded-full bg-accent transition-all duration-300" style={{ width: `${num(job.progress_percent)}%` }} />
      </div>
      {job.type === "sync_event" ? (
        <p className="mt-2 text-xs text-muted">
          Listed {num(job.payload?.total_listed)} | Completed {num(job.payload?.completed)} | Processed {num(job.payload?.processed)} |
          Faces {num(job.payload?.matched_faces)} | Errors {num(job.payload?.failures)}
        </p>
      ) : null}
      {job.type === "match_guest" ? (
        <p className="mt-2 text-xs text-muted">
          Match confidence: {num(job.payload?.confidence) > 0 ? `${(num(job.payload?.confidence) * 100).toFixed(1)}%` : "pending"} | Photos:{" "}
          {num(job.payload?.photos)}
        </p>
      ) : null}
      {job.error ? <p className="mt-2 text-xs text-red-700">{job.error}</p> : null}
    </div>
  );
}

function EventCard({ event }: { event: AdminEventOverview }) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-[var(--font-heading)] text-xl font-semibold tracking-tight">{event.name}</h2>
          <p className="mt-1 text-xs text-muted">
            <span className="font-mono">{event.event_id}</span> | slug: <code>{event.slug}</code>
          </p>
        </div>
        <StatusPill label={event.status} tone={statusTone(event.status)} />
      </div>

      <div className="mt-4 grid gap-2 text-sm">
        <p>
          <strong>Drive Folder:</strong> <code>{event.drive_folder_id}</code>
        </p>
        <p className="truncate">
          <strong>Drive Link:</strong>{" "}
          <a href={event.drive_link} className="underline" target="_blank" rel="noreferrer">
            {event.drive_link}
          </a>
        </p>
        <p>
          <strong>Created:</strong> {formatAt(event.created_at)} <strong className="ml-2">Updated:</strong> {formatAt(event.updated_at)}
        </p>
        {event.guest_ready ? (
          <p>
            <strong>Guest Link:</strong>{" "}
            <a href={event.guest_url} className="underline" target="_blank" rel="noreferrer">
              {event.guest_url}
            </a>
          </p>
        ) : (
          <p className="text-muted">Guest link will appear after processing is complete.</p>
        )}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border border-line bg-bg p-3 text-sm">Photos: {event.counters.photos}</div>
        <div className="rounded-md border border-line bg-bg p-3 text-sm">Faces: {event.counters.faces}</div>
        <div className="rounded-md border border-line bg-bg p-3 text-sm">Jobs: {event.counters.jobs}</div>
        <div className="rounded-md border border-line bg-bg p-3 text-sm">Running: {event.counters.running_jobs}</div>
        <div className="rounded-md border border-line bg-bg p-3 text-sm">Failed Jobs: {event.counters.failed_jobs}</div>
        <div className="rounded-md border border-line bg-bg p-3 text-sm">Guest Queries: {event.counters.guest_queries}</div>
        <div className="rounded-md border border-line bg-bg p-3 text-sm">Completed Queries: {event.counters.completed_queries}</div>
        <div className="rounded-md border border-line bg-bg p-3 text-sm">Matched Photos: {event.counters.matched_photos}</div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section>
          <h3 className="font-[var(--font-heading)] text-base font-semibold">Latest Jobs</h3>
          <div className="mt-2 grid gap-2">
            {event.latest_jobs.length ? (
              event.latest_jobs.map((job) => <JobSummary key={job.job_id} job={job} />)
            ) : (
              <p className="text-sm text-muted">No jobs yet.</p>
            )}
          </div>
        </section>

        <section>
          <h3 className="font-[var(--font-heading)] text-base font-semibold">Latest Guest Matches</h3>
          <div className="mt-2 grid gap-2">
            {event.latest_queries.length ? (
              event.latest_queries.map((query) => (
                <div key={query.query_id} className="rounded-md border border-line bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-xs">{query.query_id}</p>
                    <StatusPill label={query.status} tone={statusTone(query.status)} />
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    Confidence: {(query.confidence * 100).toFixed(1)}% | Matches: {query.match_count}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Created {formatAt(query.created_at)} | Completed {formatAt(query.completed_at)}
                  </p>
                  {query.message ? <p className="mt-2 text-xs text-muted">{query.message}</p> : null}
                  {query.links.length ? (
                    <div className="mt-3 grid gap-2">
                      {query.links.map((link) => (
                        <div key={link.photo_id} className="rounded-md border border-line bg-bg p-2">
                          <p className="line-clamp-1 text-xs font-medium">{link.file_name}</p>
                          <p className="mt-1 text-xs text-muted">Score {(link.score * 100).toFixed(1)}%</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <a href={link.web_view_link} className="btn btn-secondary !px-2 !py-1" target="_blank" rel="noreferrer">
                              Open
                            </a>
                            <a href={link.download_url} className="btn btn-secondary !px-2 !py-1" target="_blank" rel="noreferrer">
                              Download
                            </a>
                            <a
                              href={link.thumbnail_url.startsWith("http") ? link.thumbnail_url : `${backendBase}${link.thumbnail_url}`}
                              className="btn btn-secondary !px-2 !py-1"
                              target="_blank"
                              rel="noreferrer"
                            >
                              Thumb
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">No guest matches yet.</p>
            )}
          </div>
        </section>
      </div>
    </Card>
  );
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [limit, setLimit] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<AdminEventsResponse | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(ADMIN_KEY_STORAGE) || "";
    if (saved) {
      setAdminKey(saved);
    }
  }, []);

  async function loadOverview() {
    const key = adminKey.trim();
    if (!key) return;
    setLoading(true);
    setError("");
    try {
      const response = await getAdminEvents(key, limit);
      setData(response);
      setLastLoadedAt(new Date().toISOString());
      if (typeof window !== "undefined") {
        localStorage.setItem(ADMIN_KEY_STORAGE, key);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load admin dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!data || !adminKey.trim()) return;
    const timer = setInterval(() => {
      void loadOverview();
    }, 4000);
    return () => clearInterval(timer);
  }, [data, adminKey, limit]); // eslint-disable-line react-hooks/exhaustive-deps

  const eventCount = useMemo(() => data?.events.length || 0, [data]);

  return (
    <main className="grid gap-5">
      <Card title="System Admin Dashboard">
        <p className="text-sm text-muted">View all events, sync/match processing progress, guest links, and matched photo links in one place.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_120px_auto]">
          <label className="text-sm">
            ADMIN_DASHBOARD_KEY
            <input
              className="field mt-1 font-mono text-xs"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Paste backend admin dashboard key"
              type="password"
            />
          </label>
          <label className="text-sm">
            Limit
            <input
              className="field mt-1"
              value={limit}
              min={1}
              max={200}
              onChange={(e) => setLimit(Math.min(200, Math.max(1, Number(e.target.value || "1"))))}
              type="number"
            />
          </label>
          <div className="flex items-end">
            <button className="btn btn-primary w-full md:w-auto" onClick={loadOverview} disabled={loading || !adminKey.trim()} type="button">
              {loading ? "Loading..." : "Load Dashboard"}
            </button>
          </div>
        </div>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        {data ? (
          <p className="mt-3 text-sm text-muted">
            Showing {eventCount} of {data.total_events} events. Last refreshed: {formatAt(lastLoadedAt)}
          </p>
        ) : null}
      </Card>

      {data?.events?.length ? data.events.map((event) => <EventCard key={event.event_id} event={event} />) : null}
      {data && !data.events.length ? (
        <Card>
          <p className="text-sm text-muted">No events found.</p>
        </Card>
      ) : null}
    </main>
  );
}
