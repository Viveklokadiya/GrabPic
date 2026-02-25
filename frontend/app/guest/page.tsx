"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import type { GuestEventListItem } from "@/lib/api";
import { getGuestEvents, joinGuestEvent } from "@/lib/rbac-api";

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
  const [eventCode, setEventCode] = useState("");
  const [events, setEvents] = useState<GuestEventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

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

  useEffect(() => { void loadEvents(); }, []);

  async function onJoin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setJoining(true);
    setError("");
    try {
      await joinGuestEvent(eventCode.trim());
      setEventCode("");
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join event");
    } finally {
      setJoining(false);
    }
  }

  const filtered = events.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f8f9fc] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="size-8 text-blue-500 flex items-center justify-center">
              <svg className="w-full h-full fill-current" viewBox="0 0 48 48"><path d="M8.57829 8.57829C5.52816 11.6284 3.451 15.5145 2.60947 19.7452C1.76794 23.9758 2.19984 28.361 3.85056 32.3462C5.50128 36.3314 8.29667 39.7376 11.8832 42.134C15.4698 44.5305 19.6865 45.8096 24 45.8096C28.3135 45.8096 32.5302 44.5305 36.1168 42.134C39.7033 39.7375 42.4987 36.3314 44.1494 32.3462C45.8002 28.361 46.2321 23.9758 45.3905 19.7452C44.549 15.5145 42.4718 11.6284 39.4217 8.57829L24 24L8.57829 8.57829Z" /></svg>
            </div>
            <h2 className="font-bold text-slate-900 text-lg tracking-tight">Guest Portal</h2>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-9 w-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
              <span className="material-symbols-outlined text-[20px]">notifications</span>
            </button>
            <Link href="/guest/history" className="h-9 w-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
              <span className="material-symbols-outlined text-[20px]">account_circle</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-6xl mx-auto w-full px-4 py-10 flex flex-col gap-10">
        {/* Greeting */}
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Hello, Guest 👋</h1>
          <p className="text-slate-500 text-lg">Ready to find your photos? Join an event or check your history.</p>
        </div>

        {/* Join Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* QR Scanner / Scan Card */}
          <div className="lg:col-span-7">
            <div className="h-full bg-white rounded-3xl p-8 shadow-sm border border-slate-100 relative overflow-hidden group hover:border-blue-200 transition-all duration-300">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <span className="material-symbols-outlined text-[180px] text-blue-500 rotate-12">qr_code_scanner</span>
              </div>
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-2xl">photo_camera</span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Scan Event QR Code</h2>
                  <p className="text-slate-500 max-w-sm mb-8">
                    Use your device&apos;s camera to instantly join an event and start finding your photos with AI.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/guest/join" className="flex-1 flex items-center justify-center gap-3 bg-blue-500 hover:bg-blue-600 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg shadow-blue-500/20 hover:-translate-y-0.5 transition-all">
                    <span className="material-symbols-outlined">qr_code_scanner</span>
                    Scan QR Code
                  </Link>
                  <Link href="/guest/join" className="flex-1 flex items-center justify-center gap-3 bg-white border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 text-slate-700 py-4 px-6 rounded-xl font-semibold text-lg transition-all">
                    <span className="material-symbols-outlined">upload_file</span>
                    Upload Image
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Manual Code Entry */}
          <div className="lg:col-span-5">
            <div className="h-full bg-slate-900 text-white rounded-3xl p-8 shadow-sm relative overflow-hidden flex flex-col justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950" />
              <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6 opacity-90">
                  <span className="material-symbols-outlined text-blue-400">keyboard</span>
                  <span className="text-sm font-semibold uppercase tracking-wider text-slate-300">Enter Manually</span>
                </div>
                <h3 className="text-xl font-bold mb-6">Have an event code?</h3>
                <form onSubmit={onJoin} className="space-y-4">
                  <div>
                    <input
                      className="w-full bg-slate-800/50 border border-slate-700 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 rounded-xl px-5 py-4 text-lg text-white placeholder:text-slate-500 font-mono tracking-widest transition-all focus:outline-none"
                      placeholder="ABC-123"
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
                {error && <p className="text-blue-300 text-sm mt-3">{error}</p>}
                <p className="text-slate-400 text-xs mt-4 text-center">Codes are usually 6 characters long.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Recent Events */}
        <section>
          <div className="flex items-end justify-between mb-6 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-500">history</span>
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
                  className="pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  placeholder="Search events..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Link href="/guest/history" className="text-blue-500 hover:text-blue-600 text-sm font-semibold flex items-center gap-1 transition-colors">
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
              <p className="text-slate-400 text-sm mt-1">Use the join form above to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((item) => (
                <Link
                  key={item.event_id}
                  href={`/guest/events/${item.event_id}`}
                  className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-200 hover:shadow-md transition-all p-5 flex items-center gap-5"
                >
                  <div className="w-20 h-20 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                    <span className="material-symbols-outlined text-3xl text-slate-300">event</span>
                  </div>
                  <div className="flex flex-col min-w-0 flex-grow">
                    <h4 className="text-slate-900 font-bold text-base truncate group-hover:text-blue-500 transition-colors">{item.name}</h4>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                      <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                      <span>{new Date(item.joined_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${eventStatusBadge(item.status)}`}>
                        <span className={`size-1.5 rounded-full mr-1 ${eventStatusDot(item.status)}`} />
                        {eventStatusLabel(item.status)}
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-slate-300 group-hover:text-blue-400 transition-colors">
                    <span className="material-symbols-outlined">chevron_right</span>
                  </div>
                </Link>
              ))}

              {/* Add Event Card */}
              <Link
                href="/guest/join"
                className="group bg-white rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all p-5 flex flex-col items-center justify-center min-h-[120px] gap-3"
              >
                <div className="h-12 w-12 rounded-full bg-white shadow-sm flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
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
        <p className="text-slate-400 text-sm">Powered by <span className="font-bold text-blue-500">GrabPic</span></p>
      </footer>
    </div>
  );
}
