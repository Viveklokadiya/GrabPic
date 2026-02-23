import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="bg-[#f6f6f8] text-slate-900 font-sans min-h-screen flex flex-col overflow-hidden">
      {/* Top Navigation */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 px-10 py-4 bg-white">
        <div className="flex items-center gap-4 text-slate-900">
          <div className="size-8 text-[#4848e5] flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl">photo_camera</span>
          </div>
          <h2 className="text-xl font-bold leading-tight tracking-[-0.015em]">GrabPic</h2>
        </div>
        <div className="flex items-center gap-8">
          <div className="hidden md:flex items-center gap-9">
            <Link className="text-slate-600 hover:text-[#4848e5] transition-colors text-sm font-medium leading-normal" href="/">Home</Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative w-full">
        {/* Background decorative elements */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(#4848e5 1px, transparent 1px)", backgroundSize: "32px 32px" }}
        />
        <div className="relative z-10 max-w-lg w-full flex flex-col items-center text-center">
          {/* Illustration Container */}
          <div className="mb-8 relative group">
            {/* Abstract "403" text in background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[180px] font-bold text-slate-200 select-none pointer-events-none z-0 tracking-tighter">
              403
            </div>
            {/* Main Illustration Image */}
            <div className="relative z-10 w-64 h-64 mx-auto rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 shadow-sm overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Locked gate illustration abstract"
                className="w-full h-full object-cover opacity-90 mix-blend-overlay"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCO7ad5CQX5QBje7LdROr8FrZQjlL_NFHhTfdTnaaU3_IR5qjC7ntoUciLsJaaBtIcw1Mk22wzK9lUeFAEtKZ1WN-dPv3GD0hTHcFzA8g5xDr6Ue72bJ6tQrlNXgI2epp7MvcypAT_Wtfks4kslIRaG7tDArkQd3goxj0uF2puoyxJpXNHRivUHMgec2V-gTaQma_2ZEB6mLbvHnof6d6COI8XwpWZyaEX5tXE44_0iOlLx6oEEQ1idbzOVsuDrCcb-JQo6QEeRdOw"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#4848e5] text-8xl drop-shadow-lg">lock</span>
              </div>
            </div>
          </div>
          {/* Text Content */}
          <div className="space-y-4 mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
              Access Denied
            </h1>
            <p className="text-slate-500 text-base md:text-lg max-w-sm mx-auto leading-relaxed">
              You do not have permission to view this page. If you believe this is an error, please contact your administrator.
            </p>
          </div>
          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
            <Link href="/" className="w-full sm:w-auto min-w-[160px] h-11 px-6 bg-[#4848e5] hover:bg-[#4848e5]/90 text-white rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group">
              <span className="material-symbols-outlined text-xl transition-transform group-hover:-translate-x-1">arrow_back</span>
              Return to Dashboard
            </Link>
            <Link href="/contact" className="w-full sm:w-auto min-w-[160px] h-11 px-6 bg-white border border-slate-200 hover:border-[#4848e5]/50 text-slate-700 hover:text-[#4848e5] rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-xl">support_agent</span>
              Contact Support
            </Link>
          </div>
          {/* Helper Link */}
          <div className="mt-12 pt-8 border-t border-slate-100 w-full max-w-xs">
            <p className="text-xs text-slate-400">
              Error Code: <span className="font-mono text-slate-500">HTTP_403_FORBIDDEN</span>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex flex-col gap-6 px-5 py-6 text-center border-t border-slate-100 bg-white relative z-20">
        <p className="text-slate-400 text-sm font-normal leading-normal">© 2024 GrabPic. All rights reserved.</p>
      </footer>
    </div>
  );
}
