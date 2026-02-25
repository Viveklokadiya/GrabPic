"use client";

export default function GlobalLoadingState() {
    return (
        <div className="bg-[#f8f6f6] font-sans antialiased fixed inset-0 z-[9999] flex flex-col items-center justify-center p-6 bg-opacity-95 backdrop-blur-sm">
            <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-150%); }
          100% { transform: translateX(150%); }
        }
        @keyframes indeterminate {
          0% { transform: translateX(-100%); width: 50%; }
          50% { transform: translateX(0%); width: 50%; }
          100% { transform: translateX(100%); width: 50%; }
        }
      `}</style>

            {/* Decorative subtle background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] bg-[#4848e5]/10 rounded-full blur-[120px] opacity-60"></div>
                <div className="absolute top-[40%] -right-[10%] w-[40vw] h-[40vw] bg-primary/10 rounded-full blur-[100px] opacity-40"></div>
            </div>

            <div className="relative z-10 flex flex-col items-center max-w-md w-full gap-12">
                {/* Logo Section */}
                <div className="relative group">
                    <div className="flex items-center gap-3">
                        {/* Icon Mark */}
                        <div className="relative w-16 h-16 flex items-center justify-center bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <span className="material-symbols-outlined text-4xl text-[#4848e5]/80">photo_camera_back</span>
                            {/* Scanning Light Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent -translate-x-full" style={{ animation: "shimmer 2s infinite linear" }}></div>
                        </div>

                        {/* Text Wordmark */}
                        <div className="relative">
                            <h1 className="text-4xl font-bold tracking-tight text-slate-900">GrabPic</h1>
                            {/* Subtle shimmer on text */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full mix-blend-overlay" style={{ animation: "shimmer 2.5s infinite linear 0.5s" }}></div>
                        </div>
                    </div>
                </div>

                {/* Progress Indicator Section */}
                <div className="w-full max-w-[280px] flex flex-col gap-4 items-center">
                    {/* Indeterminate Progress Bar */}
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden relative">
                        <div className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-[#4848e5]/40 via-[#4848e5] to-[#4848e5]/40 w-full rounded-full origin-left" style={{ animation: "indeterminate 2s infinite ease-in-out" }}></div>
                    </div>

                    {/* Status Text */}
                    <div className="flex flex-col items-center gap-1" style={{ animation: "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}>
                        <p className="text-sm font-medium tracking-[0.2em] text-slate-500 uppercase">
                            Curating Gallery
                        </p>
                        <p className="text-xs text-slate-400 font-light">
                            Please wait while we enhance your experience
                        </p>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-10 left-0 right-0 flex justify-center opacity-40">
                <span className="material-symbols-outlined text-slate-400 text-lg animate-spin" style={{ animationDuration: "4s" }}>auto_mode</span>
            </div>
        </div>
    );
}
