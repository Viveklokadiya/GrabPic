"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, FormEvent } from "react";
import { joinGuestEventFromSlug } from "@/lib/rbac-api";

export default function GuestJoinFromLinkPage() {
  const router = useRouter();
  const params = useSearchParams();
  const slug = useMemo(() => String(params.get("slug") || "").trim().toLowerCase(), [params]);
  const [error, setError] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let canceled = false;
    async function run() {
      try {
        const membership = await joinGuestEventFromSlug(slug);
        if (canceled) return;
        router.replace(`/guest/events/${membership.event_id}`);
      } catch (err) {
        if (canceled) return;
        setError(err instanceof Error ? err.message : "Could not join event from invite link");
      }
    }
    void run();
    return () => { canceled = true; };
  }, [router, slug]);

  async function onManualJoin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setJoining(true);
    setError("");
    const code = manualCode.trim();
    try {
      // Try joining via slug (works for both event IDs and slugs)
      const membership = await joinGuestEventFromSlug(code);
      router.replace(`/guest/events/${membership.event_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join event. Please check the code and try again.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f6f8] antialiased flex flex-col">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 lg:px-10">
        <div className="flex items-center gap-4 text-slate-900">
          <div className="size-8 text-rose-500">
            <svg className="w-full h-full" fill="none" viewBox="0 0 48 48">
              <path d="M8.57829 8.57829C5.52816 11.6284 3.451 15.5145 2.60947 19.7452C1.76794 23.9758 2.19984 28.361 3.85056 32.3462C5.50128 36.3314 8.29667 39.7376 11.8832 42.134C15.4698 44.5305 19.6865 45.8096 24 45.8096C28.3135 45.8096 32.5302 44.5305 36.1168 42.134C39.7033 39.7375 42.4987 36.3314 44.1494 32.3462C45.8002 28.361 46.2321 23.9758 45.3905 19.7452C44.549 15.5145 42.4718 11.6284 39.4217 8.57829L24 24L8.57829 8.57829Z" fill="currentColor" />
            </svg>
          </div>
          <h2 className="text-slate-900 text-xl font-bold leading-tight tracking-tight">Guest Portal</h2>
        </div>
        <Link href="/guest" className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
          <span className="material-symbols-outlined text-[20px]">account_circle</span>
        </Link>
      </header>

      <main className="flex-grow flex justify-center px-4 py-8 lg:px-40 lg:py-12">
        <div className="w-full max-w-6xl flex flex-col gap-12">

          {/* Auto-redirecting */}
          {slug && !error && (
            <section className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="flex flex-col items-center justify-center p-16 gap-6">
                <div className="size-16 border-4 border-rose-100 border-t-rose-500 rounded-full animate-spin" />
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Joining Event…</h2>
                  <p className="text-slate-500">We&apos;re connecting this invite to your account. Just a moment!</p>
                </div>
              </div>
            </section>
          )}

          {/* Main QR + Code Panel */}
          {(!slug || error) && (
            <section className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="flex flex-col lg:flex-row min-h-[500px]">
                {/* QR Panel */}
                <div className="relative lg:w-1/2 bg-slate-900 p-8 flex flex-col justify-between items-center text-center overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-transparent to-slate-900/80" />
                  <div className="relative z-10 w-full flex justify-between items-start text-white/80">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-xs font-medium">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      Live Scanner
                    </div>
                    <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
                      <span className="material-symbols-outlined">cameraswitch</span>
                    </button>
                  </div>
                  {/* QR Viewfinder */}
                  <div className="relative z-10 w-64 h-64 border-2 border-white/30 rounded-3xl flex items-center justify-center">
                    <div className="absolute inset-0 border-[3px] border-rose-400 rounded-3xl scale-105 opacity-80 animate-pulse" />
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white -mt-1 -ml-1 rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white -mt-1 -mr-1 rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white -mb-1 -ml-1 rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white -mb-1 -mr-1 rounded-br-lg" />
                    <span className="text-white/70 text-sm font-medium bg-black/50 px-3 py-1 rounded-md backdrop-blur-md">Align QR code here</span>
                  </div>
                  <div className="relative z-10 space-y-4 max-w-xs mx-auto">
                    <h3 className="text-white font-bold text-2xl">Scan Event Pass</h3>
                    <p className="text-slate-300 text-sm">Point your camera at the QR code at the event entrance.</p>
                    <button className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm transition-all backdrop-blur-md flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[20px]">upload_file</span>
                      Upload QR Image
                    </button>
                  </div>
                </div>

                {/* Manual Code */}
                <div className="lg:w-1/2 p-8 lg:p-16 flex flex-col justify-center bg-white">
                  <div className="max-w-sm mx-auto w-full space-y-8">
                    <div className="space-y-2 text-center lg:text-left">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-500 text-xs font-bold uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[14px]">lock_open</span>
                        Manual Entry
                      </span>
                      <h1 className="text-slate-900 text-3xl lg:text-4xl font-black tracking-tight">Enter Event Code</h1>
                      <p className="text-slate-500 text-base">Type the code provided by your event host to access your photos.</p>
                    </div>
                    <form className="space-y-6" onSubmit={onManualJoin}>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Code</label>
                        <div className="relative">
                          <input
                            className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 pl-12 text-lg text-slate-900 placeholder:text-slate-400 focus:border-rose-400 focus:bg-white focus:ring-1 focus:ring-rose-400 focus:outline-none transition-all font-mono tracking-widest"
                            maxLength={8}
                            placeholder="ABC-123"
                            value={manualCode}
                            onChange={(e) => setManualCode(e.target.value)}
                            required
                          />
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <span className="material-symbols-outlined text-slate-400">dialpad</span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={joining}
                        className="group w-full py-4 px-6 bg-rose-500 hover:bg-rose-600 text-white text-lg font-bold rounded-xl shadow-lg shadow-rose-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {joining ? (
                          <><div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Joining…</>
                        ) : (
                          <>Join Event <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span></>
                        )}
                      </button>
                    </form>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <div className="pt-6 border-t border-slate-100 text-center">
                      <p className="text-slate-400 text-sm">
                        Having trouble? <Link href="/" className="text-rose-500 hover:underline font-semibold">Get help</Link>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
