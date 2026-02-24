import Link from "next/link";

export default function NotFoundPage() {
    return (
        <div className="bg-[#f6f6f8] font-sans text-slate-900 antialiased relative flex min-h-screen w-full flex-col overflow-x-hidden">
            {/* Navbar */}
            <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 py-4 lg:px-10">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center text-[#4848e5]">
                        <span className="material-symbols-outlined text-3xl">photo_camera</span>
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900">GrabPic</h2>
                </div>
                <nav className="hidden md:flex flex-1 justify-center items-center gap-8">
                    <Link className="text-sm font-medium text-slate-600 hover:text-[#4848e5] transition-colors" href="/guest">Events</Link>
                    <Link className="text-sm font-medium text-slate-600 hover:text-[#4848e5] transition-colors" href="/">About</Link>
                </nav>
                <div className="flex items-center gap-4">
                    <Link href="/login" className="hidden sm:flex items-center justify-center rounded-lg bg-[#4848e5] px-5 py-2.5 text-sm font-bold text-white transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#4848e5] focus:ring-offset-2">
                        Sign In
                    </Link>
                    <button className="sm:hidden text-slate-900">
                        <span className="material-symbols-outlined">menu</span>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
                <div className="flex w-full max-w-2xl flex-col items-center gap-8 text-center">
                    {/* Illustration Area */}
                    <div className="relative flex items-center justify-center w-full max-w-md aspect-[4/3] rounded-2xl bg-white shadow-sm border border-slate-100 p-8 overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#4848e5]/5 to-transparent"></div>
                        {/* Abstract Image Placeholder */}
                        <div
                            className="relative w-48 h-48 bg-slate-100 rounded-xl flex items-center justify-center shadow-inner rotate-3 transition-transform duration-500 group-hover:rotate-6 opacity-50 bg-cover"
                            style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuB3_h5MGZGubu-2onl_Wyq8lezYQ6ePAMSBWKzT9QItiIgH4YGsHCg11n_tmqWIOCx_4qAWzS4HR9vs2swQS-M0obXNO84741AJbwQ0pyV7KB_NnqsTNB4kEYAaxGPa5gs9E0FZ2-017WaQkXe35RJdYwFovSoLGkTfjCiA2cUcF0sawptE4yEuzbOQSYng4vOI2l0Kzi6R7VpIedmOQsj_hZtQBa9Pqeb5yHf94fwcyhRcPekUZDdQDRcDlPB4AyW_ftEo4kkMZRg')" }}
                        >
                            <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px]"></div>
                            <span className="material-symbols-outlined text-6xl text-slate-400">broken_image</span>
                        </div>
                        {/* Decorative elements */}
                        <div className="absolute top-10 right-10 w-12 h-12 bg-[#4848e5]/10 rounded-full blur-xl"></div>
                        <div className="absolute bottom-10 left-10 w-20 h-20 bg-purple-500/10 rounded-full blur-xl"></div>
                    </div>

                    {/* Text Content */}
                    <div className="flex flex-col items-center gap-3 max-w-lg">
                        <h1 className="text-7xl font-extrabold tracking-tighter text-slate-900">404</h1>
                        <h2 className="text-2xl font-bold text-slate-900">Page Not Found</h2>
                        <p className="text-base text-[#646487]">
                            It seems this memory doesn&apos;t exist. The album you are looking for might have been moved or deleted.
                        </p>
                    </div>

                    {/* Primary Action */}
                    <div className="mt-4">
                        <Link className="inline-flex items-center justify-center rounded-lg bg-[#4848e5] px-8 py-3 text-sm font-bold text-white shadow-lg shadow-[#4848e5]/25 transition-all hover:bg-blue-600 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4848e5]" href="/">
                            Back to Home
                        </Link>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-200 bg-white py-8">
                <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
                    <p className="text-sm text-[#646487]">© 2024 GrabPic. All rights reserved.</p>
                    <div className="flex gap-6">
                        <Link className="text-sm text-[#646487] hover:text-[#4848e5] transition-colors" href="/contact">Help Center</Link>
                        <Link className="text-sm text-[#646487] hover:text-[#4848e5] transition-colors" href="/privacy">Privacy Policy</Link>
                        <Link className="text-sm text-[#646487] hover:text-[#4848e5] transition-colors" href="/terms">Terms of Service</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
