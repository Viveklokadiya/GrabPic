"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

import Card from "@/components/card";
import { createGuestMatch, getGuestMatch, GuestMatchResponse, resolveGuestEvent } from "@/lib/api";

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1").replace(/\/$/, "");
const backendBase = apiBase.replace(/\/api\/v1$/, "");

function toPercent(value: number): string {
  const safe = Math.max(0, Math.min(1, Number(value || 0)));
  return `${(safe * 100).toFixed(1)}%`;
}

export default function GuestUploadPage() {
  const params = useParams<{ slug: string }>();
  const slug = useMemo(() => String(params?.slug || ""), [params]);
  const searchParams = useSearchParams();

  const [guestCode, setGuestCode] = useState(searchParams.get("code") || "");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [queryId, setQueryId] = useState("");
  const [match, setMatch] = useState<GuestMatchResponse | null>(null);

  useEffect(() => {
    if (!queryId) return;
    let canceled = false;

    async function poll() {
      try {
        const response = await getGuestMatch(queryId);
        if (canceled) return;
        setMatch(response);
        if (response.status === "queued" || response.status === "running") {
          setTimeout(poll, 1800);
        }
      } catch (_err) {
        if (canceled) return;
        setTimeout(poll, 2800);
      }
    }

    void poll();
    return () => {
      canceled = true;
    };
  }, [queryId]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      setError("Please upload a selfie.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await resolveGuestEvent(slug, guestCode.trim().toUpperCase());
      const match = await createGuestMatch({
        slug,
        guestCode: guestCode.trim().toUpperCase(),
        selfieFile: file
      });
      setQueryId(match.query_id);
      setMatch(match);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit selfie");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid gap-5">
      <Card title="Find Your Photos">
        <p className="mb-4 text-sm text-muted">
          Event: <strong>{slug}</strong>
        </p>
        <form className="grid gap-3" onSubmit={onSubmit}>
          <label className="text-sm">
            Guest Code
            <input
              className="field mt-1 uppercase"
              value={guestCode}
              onChange={(e) => setGuestCode(e.target.value.toUpperCase())}
              required
            />
          </label>
          <label className="text-sm">
            Selfie
            <input
              className="field mt-1"
              type="file"
              accept="image/*"
              required
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <button className="btn btn-primary mt-2" type="submit" disabled={loading}>
            {loading ? "Uploading..." : "Match My Photos"}
          </button>
        </form>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </Card>

      {match ? (
        <Card title="Matching Progress">
          <p className="text-sm text-muted">Query ID: {queryId}</p>
          <p className="mt-2 text-sm">{match.message || "Processing..."}</p>
          <div className="mt-3 h-2 w-full rounded-full bg-bg">
            <div
              className="h-2 rounded-full bg-accent transition-all duration-500"
              style={{
                width:
                  match.status === "completed"
                    ? "100%"
                    : match.status === "running"
                      ? "70%"
                      : "35%"
              }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            Confidence: {toPercent(match.confidence)} | Status: {match.status}
          </p>
          <div className="mt-3">
            <Link href={`/g/${slug}/result/${queryId}`} className="text-xs underline text-muted">
              Open dedicated result page
            </Link>
          </div>
        </Card>
      ) : null}

      {match?.status === "completed" && match.photos.length > 0 ? (
        <Card title="Your Photos">
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {match.photos.map((photo) => (
              <article key={photo.photo_id} className="overflow-hidden rounded-md border border-line bg-surface">
                <img
                  src={photo.thumbnail_url.startsWith("http") ? photo.thumbnail_url : `${backendBase}${photo.thumbnail_url}`}
                  alt={photo.file_name}
                  className="h-48 w-full object-cover"
                />
                <div className="grid gap-2 p-3 text-sm">
                  <p className="line-clamp-2 font-medium">{photo.file_name}</p>
                  <p className="text-muted">Score: {(photo.score * 100).toFixed(1)}%</p>
                  <div className="flex gap-2">
                    <a href={photo.web_view_link} target="_blank" rel="noreferrer" className="btn btn-secondary text-xs">
                      Open in Drive
                    </a>
                    <a href={photo.download_url} target="_blank" rel="noreferrer" className="btn btn-secondary text-xs">
                      Download
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </section>
        </Card>
      ) : null}
    </main>
  );
}
