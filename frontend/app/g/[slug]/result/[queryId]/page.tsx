"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import Card from "@/components/card";
import StatusPill from "@/components/status-pill";
import { getGuestMatch, GuestMatchResponse } from "@/lib/api";

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1").replace(/\/$/, "");
const backendBase = apiBase.replace(/\/api\/v1$/, "");

function statusTone(status: string): "neutral" | "success" | "warn" | "danger" {
  if (status === "completed") return "success";
  if (status === "failed") return "danger";
  if (status === "running") return "warn";
  return "neutral";
}

export default function GuestResultPage() {
  const router = useRouter();
  const params = useParams<{ slug: string; queryId: string }>();
  const slug = useMemo(() => String(params?.slug || ""), [params]);
  const queryId = useMemo(() => String(params?.queryId || ""), [params]);

  const [data, setData] = useState<GuestMatchResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!queryId) return;
    let cancelled = false;

    async function poll() {
      try {
        const response = await getGuestMatch(queryId);
        if (cancelled) return;
        setData(response);
        setError("");
        if (response.status === "queued" || response.status === "running") {
          setTimeout(poll, 2000);
        }
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Could not fetch results";
        setError(message);
        if (/sign in|authentication required/i.test(message)) {
          const nextPath = `/g/${slug}/result/${queryId}`;
          router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
          return;
        }
        setTimeout(poll, 3000);
      }
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, [queryId, router, slug]);

  return (
    <main className="grid gap-5">
      <Card title="Your Match Result">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted">Query: {queryId}</p>
          {data ? <StatusPill label={data.status} tone={statusTone(data.status)} /> : null}
        </div>
        <p className="mt-2 text-sm text-muted">{data?.message || "Processing..."}</p>
        {typeof data?.confidence === "number" ? (
          <p className="mt-1 text-sm text-muted">Confidence: {(data.confidence * 100).toFixed(1)}%</p>
        ) : null}
        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/g/${slug}`} className="btn btn-secondary">
            Try Another Selfie
          </Link>
        </div>
      </Card>

      {data?.status === "completed" && data.photos.length > 0 ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.photos.map((photo) => (
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
      ) : null}
    </main>
  );
}
