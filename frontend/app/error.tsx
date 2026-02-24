"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalErrorState({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Global Error Caught:", error);
    }, [error]);

    return (
        <div className="bg-[#f6f6f8] text-slate-900 font-sans antialiased min-h-screen flex flex-col">
            {/* Top Navigation */}
            <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 bg-white px-10 py-4 sticky top-0 z-50">
                <div className="flex items-center gap-4 text-slate-900">
                    <div className="flex items-center justify-center text-[#4848e5]">
                        <span className="material-symbols-outlined text-[32px]">photo_camera</span>
                    </div>
                    <h2 className="text-xl font-bold leading-tight tracking-tight">GrabPic</h2>
                </div>
                <div className="hidden sm:flex gap-3">
                    <Link href="/" className="flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-5 bg-slate-100 hover:bg-slate-200 text-slate-900 text-sm font-semibold transition-colors duration-200">
                        <span className="truncate">Home</span>
                    </Link>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-grow flex items-center justify-center px-4 py-12 md:py-20 relative overflow-hidden">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                    <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-[#4848e5]/5 rounded-full blur-[100px]"></div>
                    <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[30%] bg-[#4848e5]/10 rounded-full blur-[100px]"></div>
                </div>

                <div className="flex flex-col items-center max-w-2xl w-full text-center space-y-8">
                    {/* Illustration Area */}
                    <div className="relative w-full max-w-[320px] aspect-square flex items-center justify-center mb-4">
                        <div className="relative w-64 h-64 bg-slate-100 rounded-full flex items-center justify-center shadow-inner">
                            <span className="material-symbols-outlined text-[120px] text-[#4848e5]/40 transform -rotate-12">
                                cloud_off
                            </span>
                            {/* Floating Badge */}
                            <div className="absolute -bottom-2 -right-2 bg-white p-3 rounded-xl shadow-lg border border-slate-100 flex items-center gap-2">
                                <span className="material-symbols-outlined text-red-500">error</span>
                                <span className="text-xs font-semibold text-slate-600">Connection Failed</span>
                            </div>
                        </div>
                    </div>

                    {/* Text Content */}
                    <div className="space-y-4 max-w-[520px]">
                        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
                            Oops! Something went wrong.
                        </h1>
                        <p className="text-lg text-slate-600 leading-relaxed">
                            We&apos;re having trouble loading this page right now. This is likely a temporary issue on our end, so please give it a moment.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-4 w-full justify-center pt-2">
                        <button
                            onClick={() => reset()}
                            className="inline-flex items-center justify-center h-12 px-8 rounded-lg bg-[#4848e5] hover:bg-[#4848e5]/90 text-white font-semibold transition-all duration-200 shadow-lg shadow-[#4848e5]/25 gap-2"
                        >
                            <span className="material-symbols-outlined text-[20px]">refresh</span>
                            Try Again
                        </button>
                        <Link
                            href="/contact"
                            className="inline-flex items-center justify-center h-12 px-8 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors duration-200"
                        >
                            Contact Support
                        </Link>
                    </div>

                    {/* Technical Details */}
                    <div className="pt-12 flex flex-col items-center gap-2 opacity-80">
                        <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-md border border-slate-200">
                            <span className="text-xs font-mono text-slate-500 select-all cursor-text">
                                Error Digest: {error.digest || "HTTP-500"} | Msg: {error.message || "Unknown"}
                            </span>
                            <button
                                onClick={() => navigator.clipboard.writeText(`Digest: ${error.digest} - Msg: ${error.message}`)}
                                className="text-slate-400 hover:text-[#4848e5] transition-colors"
                                title="Copy to clipboard"
                            >
                                <span className="material-symbols-outlined text-[16px]">content_copy</span>
                            </button>
                        </div>
                        <p className="text-xs text-slate-400">
                            Please provide this code if you contact support.
                        </p>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-200 bg-white py-8">
                <div className="max-w-[960px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-slate-500">
                    <p>© 2024 GrabPic. All rights reserved.</p>
                    <div className="flex gap-6">
                        <Link href="/privacy" className="hover:text-[#4848e5] transition-colors">Privacy Policy</Link>
                        <Link href="/terms" className="hover:text-[#4848e5] transition-colors">Terms of Service</Link>
                        <Link href="/contact" className="hover:text-[#4848e5] transition-colors">Help Center</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
