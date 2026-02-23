"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import GuestMatchStatusCard from "@/components/guest-match-status";
import type { GuestEventSummary, GuestMatchResponse } from "@/lib/api";
import { isPollingStatus } from "@/lib/guest-match-state";
import { getGuestEvent, getGuestMatch, submitGuestSelfie } from "@/lib/rbac-api";

function GuestHeader({ eventName }: { eventName?: string }) {
  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 bg-white px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="size-8 text-rose-500 flex items-center justify-center">
          <span className="material-symbols-outlined" style={{ fontSize: 28 }}>camera</span>
        </div>
        <h2 className="text-slate-900 text-xl font-extrabold leading-tight tracking-tight">GrabPic</h2>
      </div>
      <div className="flex gap-2">
        <button className="hidden sm:flex items-center justify-center rounded-xl h-10 px-4 bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 transition-colors">
          Help
        </button>
        <Link href="/guest" className="flex items-center justify-center rounded-xl h-10 px-4 bg-rose-500 hover:bg-rose-600 transition-colors text-white text-sm font-bold shadow-md shadow-rose-500/20">
          My Events
        </Link>
      </div>
    </header>
  );
}

export default function GuestEventPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = useMemo(() => String(params?.eventId || ""), [params]);

  const [summary, setSummary] = useState<GuestEventSummary | null>(null);
  const [match, setMatch] = useState<GuestMatchResponse | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
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

  useEffect(() => { void loadEvent(); }, [eventId]);

  useEffect(() => {
    const queryId = match?.query_id;
    if (typeof queryId !== "string" || !queryId) return;
    if (!isPollingStatus(match?.status)) return;
    let canceled = false;
    async function tick() {
      if (pollingInFlightRef.current) return;
      pollingInFlightRef.current = true;
      try {
        const next = await getGuestMatch(queryId!);
        if (canceled) return;
        setMatch(next);
      } catch { /* retry on next tick */ }
      finally { pollingInFlightRef.current = false; }
    }
    void tick();
    const interval = window.setInterval(() => void tick(), 2000);
    return () => { canceled = true; window.clearInterval(interval); };
  }, [match?.query_id, match?.status]);

  function handleFile(f: File | null) {
    setFile(f);
    if (f) setPreview(URL.createObjectURL(f));
    else setPreview(null);
  }

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f6f6] flex flex-col">
        <GuestHeader />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="size-16 rounded-full border-4 border-rose-100 border-t-rose-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-500">Loading event...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f6f6] flex flex-col overflow-x-hidden">
      <GuestHeader eventName={summary?.name} />

      {/* Event Hero Banner */}
      <div className="relative h-48 w-full bg-cover bg-center bg-slate-200 flex-shrink-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 p-8 w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold mb-3">
            <span className="material-symbols-outlined text-[14px]">calendar_month</span>
            <span>{summary?.slug || "Event"}</span>
          </div>
          <h1 className="text-white text-3xl font-black leading-tight tracking-tight">{summary?.name || "Event"}</h1>
        </div>
      </div>

      <main className="flex-grow flex flex-col items-center justify-start p-6 relative">
        {/* Decorative blobs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-rose-500/5 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-200/10 rounded-full blur-[100px]" />
        </div>

        {error && (
          <div className="w-full max-w-[600px] mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Match Status (when submitted) */}
        {match && (
          <div className="w-full max-w-[600px] mb-6">
            <GuestMatchStatusCard
              match={match}
              isPolling={polling}
              openHref={`/guest/my-photos/${eventId}`}
              openLabel="View My Photos"
              onRetry={() => { setMatch(null); setFile(null); setFileInputKey((v) => v + 1); setPreview(null); }}
            />
          </div>
        )}

        {/* Card: Upload Selfie */}
        {!match && (
          <div className="w-full max-w-[600px] bg-white rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden">
            {/* Welcome text */}
            <div className="p-8 pb-0 text-center">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Find your memories</h2>
              <p className="text-slate-500 text-base">
                Upload a clear selfie to instantly find and collect all your photos from the night.
              </p>
            </div>

            <form onSubmit={onSubmit} className="p-8 flex flex-col gap-6">
              {/* Drag & Drop Upload Area */}
              <label
                className={`group relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer transition-all
                  ${dragging ? "border-rose-400 bg-rose-50" : "border-slate-200 bg-slate-50 hover:border-rose-300 hover:bg-rose-50/30"}`}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files?.[0] || null); }}
              >
                <input
                  key={fileInputKey}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFile(e.target.files?.[0] || null)}
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
                    <div className="size-16 rounded-full bg-white shadow-sm flex items-center justify-center text-rose-500">
                      <span className="material-symbols-outlined text-[32px]">add_a_photo</span>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-900 font-bold text-lg mb-1">Click to upload selfie</p>
                      <p className="text-slate-400 text-sm">or drag and drop here</p>
                    </div>
                  </div>
                )}
              </label>

              {/* Privacy Note */}
              <div className="flex items-center justify-center gap-2 text-slate-400 text-xs text-center">
                <span className="material-symbols-outlined text-[16px]">lock</span>
                <p>Your selfie is used only for search and is not stored permanently.</p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={uploading || !file || polling}
                className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-lg shadow-lg shadow-rose-500/20 disabled:opacity-50 transition-all"
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

            {/* Processing state preview strip */}
            {uploading && (
              <div className="border-t border-slate-100 bg-slate-50 p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full overflow-hidden border-2 border-white shadow-sm bg-slate-200 flex items-center justify-center">
                      {preview && <img src={preview} alt="Selfie" className="w-full h-full object-cover" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Processing...</p>
                      <p className="text-xs text-rose-500 font-medium">Scanning for your smile</p>
                    </div>
                  </div>
                  <span className="text-rose-500 font-bold text-sm">45%</span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-rose-500 to-rose-300 w-[45%] rounded-full animate-pulse" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* How It Works */}
        {!match && (
          <div className="mt-12 w-full max-w-[800px] grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: "face", title: "Upload Selfie", desc: "Take a quick selfie or upload one from your gallery." },
              { icon: "auto_awesome", title: "AI Scan", desc: "Our smart AI scans thousands of event photos for your face." },
              { icon: "collections_bookmark", title: "Get Your Album", desc: "Receive a private, personalized gallery of just you." },
            ].map((step) => (
              <div key={step.title} className="flex flex-col items-center text-center gap-3 p-4">
                <div className="size-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-2">
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
        <p className="text-slate-400 text-sm">Powered by <span className="font-bold text-rose-500">GrabPic</span></p>
      </footer>
    </div>
  );
}
