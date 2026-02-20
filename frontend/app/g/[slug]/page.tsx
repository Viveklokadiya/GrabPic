"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import Card from "@/components/card";
import GuestMatchStatusCard from "@/components/guest-match-status";
import { createGuestMatch, getGuestMatch, GuestMatchResponse, resolveGuestEvent } from "@/lib/api";
import { getAuthSession } from "@/lib/auth-session";
import { hasResults, isPollingStatus } from "@/lib/guest-match-state";

export default function GuestUploadPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = useMemo(() => String(params?.slug || ""), [params]);
  const searchParams = useSearchParams();
  const [guestCode] = useState(searchParams.get("code") || "");
  const [redirectingToGuestPortal, setRedirectingToGuestPortal] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [queryId, setQueryId] = useState("");
  const [match, setMatch] = useState<GuestMatchResponse | null>(null);
  const pollingInFlightRef = useRef(false);

  const polling = isPollingStatus(match?.status);

  useEffect(() => {
    if (!slug) return;
    const session = getAuthSession();
    if (!session) return;
    if (session.role !== "GUEST" && session.role !== "SUPER_ADMIN") return;
    setRedirectingToGuestPortal(true);
    router.replace(`/guest/join?slug=${encodeURIComponent(slug)}`);
  }, [router, slug]);

  useEffect(() => {
    if (!queryId) return;
    if (!isPollingStatus(match?.status)) return;
    let canceled = false;

    async function tick() {
      if (pollingInFlightRef.current) return;
      pollingInFlightRef.current = true;
      try {
        const response = await getGuestMatch(queryId);
        if (canceled) return;
        setMatch(response);
      } catch (_err) {
        // keep state; retry on next tick
      } finally {
        pollingInFlightRef.current = false;
      }
    }

    void tick();
    const timer = window.setInterval(() => {
      void tick();
    }, 2000);
    return () => {
      canceled = true;
      window.clearInterval(timer);
    };
  }, [queryId, match?.status]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file || polling) {
      setError("Please upload a selfie.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await resolveGuestEvent(slug, guestCode.trim().toUpperCase());
      const nextMatch = await createGuestMatch({
        slug,
        guestCode: guestCode.trim().toUpperCase() || undefined,
        selfieFile: file
      });
      setQueryId(nextMatch.query_id);
      setMatch(nextMatch);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit selfie");
    } finally {
      setLoading(false);
    }
  }

  if (redirectingToGuestPortal) {
    return (
      <main className="grid gap-5">
        <Card title="Redirecting">
          <p className="text-sm text-muted">Signed in guest detected. Redirecting you to your guest portal event page...</p>
        </Card>
      </main>
    );
  }

  return (
    <main className="grid gap-5">
      <Card title="Find Your Photos">
        <p className="mb-4 text-sm text-muted">
          Event: <strong>{slug}</strong>
        </p>
        <p className="mb-4 text-xs text-muted">Open link and upload selfie. Guest code is no longer required.</p>
        <form className="grid gap-3" onSubmit={onSubmit}>
          <label className="text-sm">
            Selfie
            <input
              key={fileInputKey}
              className="field mt-1"
              type="file"
              accept="image/*"
              required
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <button className="btn btn-primary mt-2" type="submit" disabled={loading || polling}>
            {loading ? "Uploading..." : "Match My Photos"}
          </button>
        </form>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </Card>

      {match ? (
        <GuestMatchStatusCard
          match={match}
          isPolling={polling}
          openHref={hasResults(match) && queryId ? `/g/${slug}/result/${queryId}` : undefined}
          openLabel="Open Photos"
          onRetry={() => {
            setMatch(null);
            setQueryId("");
            setFile(null);
            setFileInputKey((value) => value + 1);
          }}
        />
      ) : null}
    </main>
  );
}
