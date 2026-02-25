"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";

export default function GuestMatchingProgressPage() {
    const params = useParams<{ eventId: string }>();
    const eventId = useMemo(() => String(params?.eventId || ""), [params]);

    return (
        <div className="min-h-screen bg-[#f8f6f6] flex flex-col overflow-x-hidden font-sans">
            <style>{`
        .scan-line { animation: scan 3s linear infinite; }
        @keyframes scan { 0%{top:0;opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{top:100%;opacity:0} }
        .pulse-ring { animation: pulse-ring 2s cubic-bezier(0.215,0.61,0.355,1) infinite; }
        @keyframes pulse-ring { 0%{transform:scale(0.8);opacity:0.5} 100%{transform:scale(1.2);opacity:0} }
      `}</style>

            {/* Navbar */}
            <header className="flex items-center justify-between border-b border-slate-200 px-10 py-4 bg-white z-10 relative">
                <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center size-10 rounded-full bg-primary/10 text-primary">
                        <span className="material-symbols-outlined" style={{ fontSize: 24 }}>photo_camera_front</span>
                    </div>
                    <h2 className="text-slate-900 text-xl font-bold leading-tight tracking-tight">GrabPic</h2>
                </div>
                <Link href={`/guest/events/${eventId}`} className="flex items-center justify-center overflow-hidden rounded-full h-10 w-10 bg-slate-100 text-slate-900 transition hover:bg-slate-200">
                    <span className="material-symbols-outlined" style={{ fontSize: 24 }}>close</span>
                </Link>
            </header>

            {/* Main */}
            <main className="flex-1 flex flex-col items-center justify-center p-6 relative">
                {/* Decorative blobs */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-20 left-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
                    <div className="absolute bottom-10 right-10 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
                </div>

                {/* Card */}
                <div className="w-full max-w-[560px] bg-white rounded-xl border border-slate-100 shadow-xl p-8 md:p-12 z-0 flex flex-col items-center">
                    {/* Scan Animation */}
                    <div className="relative mb-10 size-48 flex items-center justify-center">
                        <div className="absolute inset-0 border-2 border-primary/20 rounded-full pulse-ring" />
                        <div className="absolute inset-4 border border-primary/10 rounded-full pulse-ring" style={{ animationDelay: "0.5s" }} />
                        <div className="relative z-10 flex items-center justify-center size-32 bg-primary/5 rounded-full overflow-hidden border border-primary/10">
                            <span className="material-symbols-outlined text-primary/40" style={{ fontSize: 80 }}>face</span>
                            <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent scan-line shadow-[0_0_15px_rgba(72,72,229,0.6)]" />
                        </div>
                        <div className="absolute top-0 right-10 text-primary animate-bounce" style={{ animationDuration: "3s" }}>
                            <span className="material-symbols-outlined text-xs">auto_awesome</span>
                        </div>
                        <div className="absolute bottom-4 left-4 text-primary animate-bounce" style={{ animationDuration: "4s" }}>
                            <span className="material-symbols-outlined text-xs">star</span>
                        </div>
                    </div>

                    <h1 className="text-3xl font-bold text-center text-slate-900 mb-3 tracking-tight">Finding your photos...</h1>

                    <div className="h-6 mb-8 overflow-hidden relative w-full flex justify-center">
                        <p className="text-primary text-base font-medium animate-pulse">Matching your smile...</p>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full flex flex-col gap-3 mb-8">
                        <div className="flex justify-between items-end px-1">
                            <p className="text-slate-500 text-sm font-medium">Scanning photos</p>
                            <p className="text-slate-900 text-sm font-bold">72%</p>
                        </div>
                        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full relative" style={{ width: "72%" }}>
                                <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent)]" />
                            </div>
                        </div>
                        <p className="text-center text-xs text-slate-400 mt-2">Using GrabPic AI Technology</p>
                    </div>

                    <Link
                        href={`/guest/events/${eventId}`}
                        className="text-slate-500 text-sm font-semibold hover:text-slate-800 transition-colors py-2 px-4 rounded-lg hover:bg-slate-50"
                    >
                        Cancel Search
                    </Link>
                </div>
            </main>

            <footer className="py-6 text-center text-slate-400 text-xs">
                <p>© 2024 GrabPic. All rights reserved.</p>
            </footer>
        </div>
    );
}
