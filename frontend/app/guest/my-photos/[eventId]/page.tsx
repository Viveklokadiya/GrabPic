"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { GuestMyPhotosResponse } from "@/lib/api";
import { backendAssetUrl } from "@/lib/asset-url";
import { getGuestMyPhotos } from "@/lib/rbac-api";

type Photo = GuestMyPhotosResponse["photos"][number];

function LightboxViewer({
  photos,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  photos: Photo[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const photo = photos[index];
  if (!photo) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="text-white/90 text-sm font-medium tracking-wide">
          <span className="text-blue-400 font-bold">{index + 1}</span>
          <span className="text-white/50"> / </span>
          {photos.length}
        </div>
        <div className="flex items-center gap-3">
          <a
            href={photo.download_url || "#"}
            target="_blank"
            rel="noreferrer"
            className="group flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-blue-600 transition-colors backdrop-blur-md"
          >
            <span className="material-symbols-outlined text-white text-[20px]">download</span>
          </a>
          <button
            onClick={onClose}
            className="group flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-blue-600 transition-colors backdrop-blur-md"
          >
            <span className="material-symbols-outlined text-white text-[24px] group-hover:rotate-90 transition-transform duration-300">close</span>
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="relative flex-1 flex items-center justify-center w-full h-full overflow-hidden p-4 md:p-16">
        <button
          onClick={onPrev}
          className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-black/40 hover:bg-blue-600/90 text-white backdrop-blur-md transition-all"
        >
          <span className="material-symbols-outlined text-[40px]">chevron_left</span>
        </button>

        <div className="relative max-h-full flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={backendAssetUrl(photo.thumbnail_url)}
            alt={photo.photo_id}
            className="object-contain max-h-[80vh] w-auto max-w-full rounded-lg shadow-2xl ring-1 ring-white/10 select-none"
          />
        </div>

        <button
          onClick={onNext}
          className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-black/40 hover:bg-blue-600/90 text-white backdrop-blur-md transition-all"
        >
          <span className="material-symbols-outlined text-[40px]">chevron_right</span>
        </button>
      </main>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-12 pb-6 px-6 flex flex-col md:flex-row justify-between items-end md:items-center gap-4 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-slate-700 overflow-hidden ring-2 ring-white/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-slate-400">person</span>
          </div>
          <div className="flex flex-col">
            <span className="text-white font-medium text-sm leading-tight">Your Photo</span>
            <span className="text-slate-400 text-xs flex items-center gap-1 mt-0.5">
              <span className="material-symbols-outlined text-[14px]">schedule</span>
              Just matched
            </span>
          </div>
        </div>
        <div className="pointer-events-auto flex gap-2 opacity-60 hover:opacity-100 transition-opacity">
          <a
            href={photo.download_url || "#"}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">download</span>
            Download
          </a>
        </div>
      </footer>
    </div>
  );
}

export default function GuestMyPhotosPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = useMemo(() => String(params?.eventId || ""), [params]);

  const [response, setResponse] = useState<GuestMyPhotosResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  async function loadPhotos() {
    if (!eventId) return;
    setLoading(true);
    setError("");
    try {
      setResponse(await getGuestMyPhotos(eventId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load photos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadPhotos(); }, [eventId]);
  useEffect(() => {
    if (!response) return;
    if (response.status !== "queued" && response.status !== "running") return;
    const interval = window.setInterval(() => void loadPhotos(), 1800);
    return () => window.clearInterval(interval);
  }, [response?.status, response?.query_id]);

  const photos = response?.photos ?? [];
  const isProcessing = response?.status === "queued" || response?.status === "running";
  const isComplete = response?.status === "completed";

  return (
    <>
      <div className="min-h-screen bg-[#f6f6f8] flex flex-col antialiased">
        {/* Header */}
        <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 text-blue-500">
                  <span className="material-symbols-outlined text-xl">favorite</span>
                </div>
                <h1 className="text-lg font-medium tracking-tight text-slate-900">Your Event Photos</h1>
              </div>
              <div className="flex items-center gap-4">
                <Link href={`/guest/events/${eventId}`} className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-blue-500 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                  Back
                </Link>
                <Link href="/guest" className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 transition-all">
                  <span className="material-symbols-outlined text-slate-400 text-[20px]">person</span>
                </Link>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Status Banner */}
          {(isComplete || isProcessing) && (
            <div className="mb-10 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="flex flex-col md:flex-row items-center justify-between p-6 gap-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full shrink-0 ${isComplete ? "bg-green-50" : "bg-orange-50"}`}>
                    <span className={`material-symbols-outlined ${isComplete ? "text-green-600" : "text-orange-500"}`}>
                      {isComplete ? "check_circle" : "hourglass_empty"}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 mb-1">
                      {isComplete ? "Matching Complete" : "Processing…"}
                    </h2>
                    <p className="text-slate-500">
                      {isComplete
                        ? <>We found <span className="font-semibold text-blue-500">{photos.length} photos</span> of you from the event.</>
                        : <>{response?.message || "Your selfie is being processed. This page refreshes automatically."}</>}
                    </p>
                  </div>
                </div>
                {isComplete && (
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                      onClick={loadPhotos}
                      className="flex-1 md:flex-none flex justify-center items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-all"
                    >
                      <span className="material-symbols-outlined text-[20px]">autorenew</span>
                      Refresh
                    </button>
                    {photos.length > 0 && (
                      <button className="flex-1 md:flex-none flex justify-center items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all shadow-sm shadow-blue-500/30">
                        <span className="material-symbols-outlined text-[20px]">download</span>
                        Download All
                      </button>
                    )}
                  </div>
                )}
              </div>
              {isProcessing && (
                <div className="h-1 w-full bg-slate-100">
                  <div className="h-full bg-orange-400 animate-pulse w-2/3 rounded-r-full" />
                </div>
              )}
              {isComplete && (
                <div className="h-1 w-full bg-slate-100">
                  <div className="h-full bg-green-500 w-full rounded-r-full" />
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {/* View Toggle + Section Header */}
          {photos.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-slate-900">Your Moments</h3>
                <div className="flex gap-2">
                  <button className="p-2 text-blue-500" title="Grid View">
                    <span className="material-symbols-outlined">grid_view</span>
                  </button>
                </div>
              </div>

              {/* Masonry Grid */}
              <div
                className="gap-6"
                style={{ columns: "1", columnGap: "1.5rem" }}
              >
                <style>{`@media(min-width:640px){.masonry{column-count:2}}@media(min-width:1024px){.masonry{column-count:3}}`}</style>
                <div className="masonry" style={{ columnCount: 1, columnGap: "1.5rem" }}>
                  {photos.map((photo, i) => (
                    <div
                      key={photo.photo_id}
                      className="group relative overflow-hidden rounded-xl bg-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer"
                      style={{ breakInside: "avoid", marginBottom: "1.5rem" }}
                      onClick={() => setLightboxIndex(i)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={backendAssetUrl(photo.thumbnail_url)}
                        alt={photo.photo_id}
                        className="w-full h-auto object-cover block"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300">
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={(e) => { e.stopPropagation(); }}
                            className="p-2 bg-white/90 hover:bg-white text-slate-700 hover:text-blue-500 rounded-full shadow-sm backdrop-blur-sm transition-all transform hover:scale-105"
                            title="Download Photo"
                          >
                            <span className="material-symbols-outlined text-[20px] leading-none">download</span>
                          </button>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-black/60 to-transparent">
                          <span className="text-white/90 text-xs font-medium">#{i + 1}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-12 flex justify-center pb-8">
                <button
                  onClick={loadPhotos}
                  className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 hover:border-blue-400 text-slate-600 hover:text-blue-500 rounded-full font-medium transition-all shadow-sm"
                >
                  <span>Refresh Photos</span>
                  <span className="material-symbols-outlined text-[20px]">autorenew</span>
                </button>
              </div>
            </>
          )}

          {/* Empty State */}
          {!loading && !isProcessing && photos.length === 0 && (
            <div className="text-center py-20 rounded-2xl bg-white border border-slate-100">
              <span className="material-symbols-outlined text-6xl text-slate-200 block mb-4">photo_library</span>
              <p className="text-slate-500 font-semibold text-lg mb-2">No photos found yet</p>
              <p className="text-slate-400 text-sm max-w-sm mx-auto mb-6">{response?.message || "Upload your selfie from the event page to start matching."}</p>
              <Link href={`/guest/events/${eventId}`} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20">
                <span className="material-symbols-outlined text-[18px]">add_a_photo</span>
                Upload Selfie
              </Link>
            </div>
          )}
        </main>

        <footer className="border-t border-slate-200 py-8 mt-auto bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-500">© 2024 GrabPic Inc. All memories preserved securely.</p>
            <div className="flex gap-6 text-sm">
              <Link href="/privacy" className="text-slate-500 hover:text-blue-500 transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="text-slate-500 hover:text-blue-500 transition-colors">Terms of Service</Link>
            </div>
          </div>
        </footer>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && photos.length > 0 && (
        <LightboxViewer
          photos={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex((i) => (i! > 0 ? i! - 1 : photos.length - 1))}
          onNext={() => setLightboxIndex((i) => (i! < photos.length - 1 ? i! + 1 : 0))}
        />
      )}
    </>
  );
}
