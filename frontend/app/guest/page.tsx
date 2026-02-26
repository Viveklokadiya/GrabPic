"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

import type { GuestEventListItem } from "@/lib/api";
import { becomePhotographer } from "@/lib/api";
import { getAuthSession, setAuthSession } from "@/lib/auth-session";
import { decodeQrCodeFromImage, resolveGuestPathFromScan } from "@/lib/qr-scan";
import { getGuestEvents, joinGuestEvent } from "@/lib/rbac-api";
import { useAuth } from "@/lib/use-auth";

function eventStatusBadge(status: string) {
  if (status === "COMPLETED") return "bg-green-50 text-green-600 border-green-100";
  if (status === "RUNNING") return "bg-orange-50 text-orange-600 border-orange-100";
  return "bg-slate-50 text-slate-500 border-slate-100";
}
function eventStatusDot(status: string) {
  if (status === "COMPLETED") return "bg-green-500";
  if (status === "RUNNING") return "bg-orange-500 animate-pulse";
  return "bg-slate-400";
}
function eventStatusLabel(status: string) {
  if (status === "COMPLETED") return "Photos Ready";
  if (status === "RUNNING") return "Processing";
  return "Pending";
}

export default function GuestHomePage() {
  const router = useRouter();
  const auth = useAuth();

  const qrInputRef = useRef<HTMLInputElement | null>(null);
  const [eventCode, setEventCode] = useState("");
  const [events, setEvents] = useState<GuestEventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [scanningQr, setScanningQr] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const isPhotographer = auth.user?.role === "PHOTOGRAPHER";

  async function loadEvents() {
    setLoading(true);
    setError("");
    try {
      setEvents(await getGuestEvents());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEvents();
  }, []);

  async function onJoin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setJoining(true);
    setError("");
    try {
      const membership = await joinGuestEvent(eventCode.trim());
      setEventCode("");
      router.push("/guest/events/" + membership.event_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join event");
    } finally {
      setJoining(false);
    }
  }

  async function onBecomePhotographer() {
    const session = getAuthSession();
    if (!session?.token) {
      router.replace("/login?next=%2Fphotographer%2Fevents%2Fnew");
      return;
    }

    setPromoting(true);
    setError("");
    try {
      const me = await becomePhotographer(session.token);
      setAuthSession({
        token: session.token,
        role: me.role,
        email: me.email,
        userId: me.user_id,
        name: me.name || me.email,
      });
      router.replace("/photographer/events/new");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enable photographer access");
    } finally {
      setPromoting(false);
    }
  }

  async function onUploadQrImage(file: File | null) {
    if (!file) return;
    setScanningQr(true);
    setError("");
    try {
      const rawValue = await decodeQrCodeFromImage(file);
      const path = resolveGuestPathFromScan(rawValue);
      if (!path) {
        throw new Error("QR code does not contain a valid guest link.");
      }
      router.push(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to scan QR image");
    } finally {
      setScanningQr(false);
      if (qrInputRef.current) qrInputRef.current.value = "";
    }
  }

  const filtered = events.filter((e) => {
    const needle = search.toLowerCase();
    return (
      e.name.toLowerCase().includes(needle) ||
      e.slug.toLowerCase().includes(needle) ||
      e.event_code.toLowerCase().includes(needle)
    );
  });

  return (
    <div className="min-h-screen bg-[#f8f9fc] flex flex-col">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="size-8 text-primary flex items-center justify-center">
              <svg className="w-full h-full fill-current" viewBox="0 0 48 48"><path d="M8.57829 8.57829C5.52816 11.6284 3.451 15.5145 2.60947 19.7452C1.76794 23.9758 2.19984 28.361 3.85056 32.3462C5.50128 36.3314 8.29667 39.7376 11.8832 42.134C15.4698 44.5305 19.6865 45.8096 24 45.8096C28.3135 45.8096 32.5302 44.5305 36.1168 42.134C39.7033 39.7375 42.4987 36.3314 44.1494 32.3462C45.8002 28.361 46.2321 23.9758 45.3905 19.7452C44.549 15.5145 42.4718 11.6284 39.4217 8.57829L24 24L8.57829 8.57829Z" /></svg>
            </div>
            <h2 className="font-bold text-slate-900 text-lg tracking-tight">Guest Portal</h2>
          </div>
          <div className="flex items-center gap-2">
            {isPhotographer ? (
              <Link href="/photographer" className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15 transition-colors">
                Switch to Photographer
              </Link>
            ) : null}
            <Link href="/guest/history" className="h-9 w-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
              <span className="material-symbols-outlined text-[20px]">account_circle</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-6xl mx-auto w-full px-4 py-10 flex flex-col gap-10">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Hello, {isPhotographer ? "Creator" : "Guest"} 👋</h1>
          <p className="text-slate-500 text-lg">Join events, scan QR links, and open face-match directly.</p>
        </div>

        {!isPhotographer ? (
          <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary">Are you a photographer?</p>
              <p className="text-xs text-slate-600 mt-1">Enable photographer mode and create your own events in one click.</p>
            </div>
            <button
              type="button"
              onClick={() => void onBecomePhotographer()}
              disabled={promoting}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[18px]">add_photo_alternate</span>
              {promoting ? "Enabling..." : "I am Photographer - Create Event"}
            </button>
          </section>
        ) : null}

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <div className="h-full bg-white rounded-3xl p-8 shadow-sm border border-slate-100 relative overflow-hidden group hover:border-primary/40 transition-all duration-300">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <span className="material-symbols-outlined text-[180px] text-primary rotate-12">qr_code_scanner</span>
              </div>
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-primary-light text-primary flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-2xl">photo_camera</span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Scan Event QR Code</h2>
                  <p className="text-slate-500 max-w-sm mb-8">
                    Scan from camera or upload scanner image. Valid guest scanner opens face match page directly.
                  </p>
                </div>
                <input
                  ref={qrInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void onUploadQrImage(e.target.files?.[0] || null)}
                />
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/guest/join" className="flex-1 flex items-center justify-center gap-3 bg-primary hover:bg-primary/90 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all">
                    <span className="material-symbols-outlined">qr_code_scanner</span>
                    Scan QR Code
                  </Link>
                  <button
                    type="button"
                    onClick={() => qrInputRef.current?.click()}
                    disabled={scanningQr}
                    className="flex-1 flex items-center justify-center gap-3 bg-white border-2 border-slate-200 hover:border-primary/60 hover:bg-primary-light/30 text-slate-700 py-4 px-6 rounded-xl font-semibold text-lg transition-all disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined">upload_file</span>
                    {scanningQr ? "Scanning..." : "Upload Scanner"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="h-full bg-slate-900 text-white rounded-3xl p-8 shadow-sm relative overflow-hidden flex flex-col justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950" />
              <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6 opacity-90">
                  <span className="material-symbols-outlined text-primary/80">keyboard</span>
                  <span className="text-sm font-semibold uppercase tracking-wider text-slate-300">Enter Manually</span>
                </div>
                <h3 className="text-xl font-bold mb-6">Have an event ID?</h3>
                <form onSubmit={onJoin} className="space-y-4">
                  <div>
                    <input
                      className="w-full bg-slate-800/50 border border-slate-700 focus:border-primary/80 focus:ring-1 focus:ring-primary/80 rounded-xl px-5 py-4 text-lg text-white placeholder:text-slate-500 font-mono tracking-wide transition-all focus:outline-none"
                      placeholder="Paste 4-digit Event ID"
                      value={eventCode}
                      onChange={(e) => setEventCode(e.target.value)}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={joining}
                    className="w-full bg-white hover:bg-slate-100 text-slate-900 py-4 px-6 rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {joining ? "Joining..." : <>Join Event <span className="material-symbols-outlined text-lg">arrow_forward</span></>}
                  </button>
                </form>
                <p className="text-slate-400 text-xs mt-4 text-center">Ask photographer for Event ID or scanner link.</p>
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <section>
          <div className="flex items-end justify-between mb-6 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">history</span>
                My Recent Events
              </h2>
              <p className="text-slate-500 text-sm mt-1">Pick up where you left off</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                  <span className="material-symbols-outlined text-[18px]">search</span>
                </span>
                <input
                  className="pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                  placeholder="Search events..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Link href="/guest/history" className="text-primary hover:text-primary/90 text-sm font-semibold flex items-center gap-1 transition-colors">
                View all <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-2xl border border-slate-100 bg-white p-5 animate-pulse">
                  <div className="h-20 bg-slate-100 rounded-xl mb-4" />
                  <div className="h-4 bg-slate-100 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-slate-50 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 rounded-2xl bg-white border border-slate-100">
              <span className="material-symbols-outlined text-5xl text-slate-300 block mb-3">event_note</span>
              <p className="text-slate-500 font-medium">No events joined yet.</p>
              <p className="text-slate-400 text-sm mt-1">Use event ID or scanner above to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((item) => (
                <Link
                  key={item.event_id}
                  href={`/guest/events/${item.event_id}`}
                  className="group bg-white rounded-2xl border border-slate-200 hover:border-primary/40 hover:shadow-md transition-all p-5 flex items-center gap-5"
                >
                  <div className="w-20 h-20 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                    <span className="material-symbols-outlined text-3xl text-slate-300">event</span>
                  </div>
                  <div className="flex flex-col min-w-0 flex-grow">
                    <h4 className="text-slate-900 font-bold text-base truncate group-hover:text-primary transition-colors">{item.name}</h4>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                      <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                      <span>{new Date(item.joined_at).toLocaleDateString()}</span>
                    </div>
                    <div className="mt-1 text-[10px] text-slate-400 font-mono">Event ID: {item.event_code}</div>
                    <div className="flex items-center gap-2 mt-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${eventStatusBadge(item.status)}`}>
                        <span className={`size-1.5 rounded-full mr-1 ${eventStatusDot(item.status)}`} />
                        {eventStatusLabel(item.status)}
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-slate-300 group-hover:text-primary/80 transition-colors">
                    <span className="material-symbols-outlined">chevron_right</span>
                  </div>
                </Link>
              ))}

              <Link
                href="/guest/join"
                className="group bg-white rounded-2xl border-2 border-dashed border-slate-200 hover:border-primary/60 hover:bg-primary-light/30 transition-all p-5 flex flex-col items-center justify-center min-h-[120px] gap-3"
              >
                <div className="h-12 w-12 rounded-full bg-white shadow-sm flex items-center justify-center text-primary/80 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-2xl">add_a_photo</span>
                </div>
                <div className="text-center">
                  <p className="font-bold text-slate-900 text-sm">Join a new event</p>
                  <p className="text-xs text-slate-500">Have a code or QR?</p>
                </div>
              </Link>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center">
        <p className="text-slate-400 text-sm">Powered by <span className="font-bold text-primary">GrabPic</span></p>
      </footer>
    </div>
  );
}
