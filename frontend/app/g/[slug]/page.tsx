"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import GuestMatchStatusCard from "@/components/guest-match-status";
import { getAuthSession } from "@/lib/auth-session";
import type { GuestMatchResponse } from "@/lib/api";
import { createGuestMatch, getGuestMatch, resolveGuestEvent } from "@/lib/api";
import { hasResults, isPollingStatus } from "@/lib/guest-match-state";

type PublicEventInfo = {
  eventId: string;
  slug: string;
  displayName: string;
  requiresAuth: boolean;
};

function formatSlugLabel(slug: string): string {
  const raw = String(slug || "").trim();
  if (!raw) return "Event";
  return raw
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1").replace(/\/$/, "");
const backendBase = apiBase.replace(/\/api\/v1$/, "");

function imageSrc(url: string): string {
  return url.startsWith("http") ? url : `${backendBase}${url}`;
}

export default function GuestUploadPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = useMemo(() => String(params?.slug || "").trim().toLowerCase(), [params]);
  const searchParams = useSearchParams();
  const [guestCode] = useState((searchParams.get("code") || "").trim().toUpperCase());

  const [eventInfo, setEventInfo] = useState<PublicEventInfo | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [resolveError, setResolveError] = useState("");
  const [resolveSeq, setResolveSeq] = useState(0);

  const [match, setMatch] = useState<GuestMatchResponse | null>(null);
  const [queryId, setQueryId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const pollingInFlightRef = useRef(false);
  const polling = isPollingStatus(match?.status);
  const showInlineResults = hasResults(match);
  const session = getAuthSession();

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  useEffect(() => {
    if (!slug) {
      setEventInfo(null);
      setLoadingEvent(false);
      setResolveError("Missing event link.");
      return;
    }

    let canceled = false;

    async function loadEventInfo() {
      setLoadingEvent(true);
      setResolveError("");
      try {
        const resolved = await resolveGuestEvent(slug, guestCode);
        if (canceled) return;
        setEventInfo({
          eventId: resolved.event_id,
          slug: resolved.slug,
          displayName: formatSlugLabel(resolved.slug),
          requiresAuth: resolved.requires_auth,
        });
      } catch (err) {
        if (canceled) return;
        setEventInfo(null);
        setResolveError(err instanceof Error ? err.message : "Could not open this event");
      } finally {
        if (!canceled) setLoadingEvent(false);
      }
    }

    void loadEventInfo();

    return () => {
      canceled = true;
    };
  }, [slug, guestCode, resolveSeq]);

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
        // retry on next tick
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

  function handleFile(nextFile: File | null) {
    setFile(nextFile);
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return nextFile ? URL.createObjectURL(nextFile) : null;
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!eventInfo) {
      setError("Event details are still loading. Please try again.");
      return;
    }

    if (!file || polling) {
      setError("Please upload a selfie.");
      return;
    }

    setError("");
    setUploading(true);

    try {
      if (eventInfo.requiresAuth && !session) {
        const nextPath = `/g/${eventInfo.slug}${guestCode ? `?code=${encodeURIComponent(guestCode)}` : ""}`;
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      const nextMatch = await createGuestMatch({
        slug: eventInfo.slug,
        guestCode: guestCode || undefined,
        selfieFile: file,
      });
      setQueryId(nextMatch.query_id);
      setMatch(nextMatch);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not submit selfie";
      if (/sign in|authentication required/i.test(message)) {
        const nextPath = `/g/${eventInfo.slug}${guestCode ? `?code=${encodeURIComponent(guestCode)}` : ""}`;
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }
      setError(message);
    } finally {
      setUploading(false);
    }
  }

  if (loadingEvent) {
    return (
      <div className="min-h-screen bg-[#f8f6f6] flex flex-col">
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="size-16 rounded-full border-4 border-blue-100 border-t-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-500">Loading event...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!eventInfo) {
    return (
      <div className="min-h-screen bg-[#f8f6f6] flex items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Could not open event</h1>
          <p className="text-sm text-red-700 mb-5">{resolveError || "This event link is invalid or not available yet."}</p>
          <button
            type="button"
            onClick={() => setResolveSeq((value) => value + 1)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f6f6] flex flex-col overflow-x-hidden">
      <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="size-8 text-blue-500 flex items-center justify-center">
            <span className="material-symbols-outlined" style={{ fontSize: 28 }}>camera</span>
          </div>
          <h2 className="text-slate-900 text-xl font-extrabold leading-tight tracking-tight">GrabPic</h2>
        </div>
        <div className="flex gap-2">
          <Link href="/contact" className="hidden sm:flex items-center justify-center rounded-xl h-10 px-4 bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 transition-colors">
            Help
          </Link>
          <Link
            href={session ? "/guest" : "/"}
            className="flex items-center justify-center rounded-xl h-10 px-4 bg-blue-500 hover:bg-blue-600 transition-colors text-white text-sm font-bold shadow-md shadow-blue-500/20"
          >
            {session ? "My Events" : "Home"}
          </Link>
        </div>
      </header>

      <div className="relative h-48 w-full bg-cover bg-center bg-slate-200 flex-shrink-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 p-8 w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold mb-3">
            <span className="material-symbols-outlined text-[14px]">calendar_month</span>
            <span>{eventInfo.slug}</span>
          </div>
          <h1 className="text-white text-3xl font-black leading-tight tracking-tight">{eventInfo.displayName}</h1>
        </div>
      </div>

      <main className="flex-grow flex flex-col items-center justify-start p-6 relative">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/10 rounded-full blur-[100px]" />
        </div>

        {resolveError && (
          <div className="w-full max-w-[600px] mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {resolveError}
          </div>
        )}

        {error && (
          <div className="w-full max-w-[600px] mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {match && (
          <>
            <div className="w-full max-w-[600px] mb-6">
              <GuestMatchStatusCard
                match={match}
                isPolling={polling}
                onRetry={() => {
                  setMatch(null);
                  setQueryId("");
                  setFile(null);
                  setFileInputKey((value) => value + 1);
                  setPreview((current) => {
                    if (current) URL.revokeObjectURL(current);
                    return null;
                  });
                }}
              />
            </div>

            {showInlineResults && (
              <section className="w-full max-w-[980px] mb-8">
                <h2 className="mb-3 text-xl font-bold text-slate-900">Your Matched Photos</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {match.photos.map((photo) => (
                    <article key={photo.photo_id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageSrc(photo.thumbnail_url)} alt={photo.file_name} className="h-48 w-full object-cover" />
                      <div className="p-3">
                        <p className="line-clamp-2 text-sm font-semibold text-slate-900">{photo.file_name}</p>
                        <p className="mt-1 text-xs text-slate-500">Score: {(photo.score * 100).toFixed(1)}%</p>
                        {(photo.web_view_link || photo.download_url) && (
                          <div className="mt-3 flex gap-2">
                            {photo.web_view_link ? (
                              <a href={photo.web_view_link} target="_blank" rel="noreferrer" className="btn btn-secondary text-xs">
                                Open in Drive
                              </a>
                            ) : null}
                            {photo.download_url ? (
                              <a href={photo.download_url} target="_blank" rel="noreferrer" className="btn btn-secondary text-xs">
                                Download
                              </a>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {!match && (
          <div className="w-full max-w-[600px] bg-white rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden">
            <div className="p-8 pb-0 text-center">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Find your memories</h2>
              <p className="text-slate-500 text-base">
                Upload a clear selfie to instantly find and collect all your photos from this event.
              </p>
            </div>

            <form onSubmit={onSubmit} className="p-8 flex flex-col gap-6">
              <label
                className={`group relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer transition-all ${dragging ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/30"}`}
                onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  handleFile(event.dataTransfer.files?.[0] || null);
                }}
              >
                <input
                  key={fileInputKey}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleFile(event.target.files?.[0] || null)}
                  required
                />
                {preview ? (
                  <div className="flex flex-col items-center gap-3 transition-transform duration-300">
                    <div className="size-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preview} alt="Selfie preview" className="w-full h-full object-cover" />
                    </div>
                    <p className="text-slate-800 font-bold">Looking good! 🎉</p>
                    <p className="text-slate-400 text-sm">Click to change photo</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 transition-transform duration-300 group-hover:scale-105">
                    <div className="size-16 rounded-full bg-white shadow-sm flex items-center justify-center text-blue-500">
                      <span className="material-symbols-outlined text-[32px]">add_a_photo</span>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-900 font-bold text-lg mb-1">Click to upload selfie</p>
                      <p className="text-slate-400 text-sm">or drag and drop here</p>
                    </div>
                  </div>
                )}
              </label>

              <div className="flex items-center justify-center gap-2 text-slate-400 text-xs text-center">
                <span className="material-symbols-outlined text-[16px]">lock</span>
                <p>Your selfie is used only for search and is not stored permanently.</p>
              </div>

              <button
                type="submit"
                disabled={uploading || !file || polling}
                className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-lg shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all"
              >
                {uploading ? (
                  <>
                    <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Finding your photos...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">face</span>
                    Find My Photos
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {!match && (
          <div className="mt-12 w-full max-w-[800px] grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: "face", title: "Upload Selfie", desc: "Take a quick selfie or upload one from your gallery." },
              { icon: "auto_awesome", title: "AI Scan", desc: "Our smart AI scans event photos for your face." },
              { icon: "collections_bookmark", title: "Get Your Album", desc: "Open your personalized gallery instantly." },
            ].map((step) => (
              <div key={step.title} className="flex flex-col items-center text-center gap-3 p-4">
                <div className="size-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mb-2">
                  <span className="material-symbols-outlined">{step.icon}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{step.title}</h3>
                <p className="text-sm text-slate-500">{step.desc}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="w-full py-6 text-center border-t border-slate-200 mt-auto">
        <p className="text-slate-400 text-sm">Powered by <span className="font-bold text-blue-500">GrabPic</span></p>
      </footer>
    </div>
  );
}
