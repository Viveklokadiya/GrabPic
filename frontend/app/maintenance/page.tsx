import Link from "next/link";

export const metadata = {
    title: "System Maintenance | GrabPic",
};

export default function MaintenancePage() {
    const estimatedTime = "Today, 2:00 PM EST"; // In a real app this could be fetched from edge config

    return (
        <div className="bg-[#f6f6f8] font-sans antialiased min-h-screen flex flex-col">
            {/* Header */}
            <header className="w-full border-b border-gray-200 bg-white px-6 py-4 lg:px-10">
                <div className="mx-auto flex max-w-[1280px] items-center justify-between">
                    <div className="flex items-center gap-3 text-[#111117]">
                        <div className="text-[#4848e5]">
                            <span className="material-symbols-outlined text-3xl">photo_library</span>
                        </div>
                        <h2 className="text-xl font-bold leading-tight tracking-tight">GrabPic</h2>
                    </div>
                    <div className="hidden sm:flex gap-4">
                        <Link
                            className="flex items-center justify-center rounded-lg h-9 px-4 text-sm font-semibold text-[#646487] hover:text-[#4848e5] transition-colors"
                            href="/contact"
                        >
                            Help Center
                        </Link>
                        <Link
                            className="flex items-center justify-center rounded-lg h-9 px-4 bg-[#4848e5]/10 text-[#4848e5] text-sm font-bold hover:bg-[#4848e5]/20 transition-colors"
                            href="/"
                        >
                            Check Status
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow flex items-center justify-center p-4 sm:p-8">
                <div className="w-full max-w-[640px] bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Hero Illustration Area */}
                    <div className="w-full h-48 bg-[#4848e5]/5 flex items-center justify-center relative overflow-hidden">
                        <div
                            className="absolute inset-0 opacity-10"
                            style={{ backgroundImage: "radial-gradient(#4848e5 1px, transparent 1px)", backgroundSize: "20px 20px" }}
                        />
                        <div className="relative z-10 p-6 bg-white rounded-full shadow-lg">
                            <span className="material-symbols-outlined text-6xl text-[#4848e5]">engineering</span>
                        </div>
                    </div>

                    <div className="p-8 sm:p-12 flex flex-col items-center text-center">
                        <h1 className="text-2xl sm:text-3xl font-bold text-[#111117] mb-4">
                            System Maintenance in Progress
                        </h1>
                        <p className="text-[#646487] text-base leading-relaxed max-w-[480px] mb-8">
                            GrabPic is currently getting a tune-up to improve your experience. We are updating our servers to ensure faster photo processing. We apologize for the inconvenience and will be back shortly.
                        </p>

                        {/* Status Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-8">
                            <div className="flex flex-col p-4 bg-[#f6f6f8] rounded-lg border border-gray-100">
                                <div className="flex items-center gap-2 mb-2 text-[#646487]">
                                    <span className="material-symbols-outlined text-sm">schedule</span>
                                    <span className="text-xs font-semibold uppercase tracking-wider">Maintenance Started</span>
                                </div>
                                <p className="text-[#111117] font-medium">Recently</p>
                            </div>
                            <div className="flex flex-col p-4 bg-[#4848e5]/5 rounded-lg border border-[#4848e5]/20">
                                <div className="flex items-center gap-2 mb-2 text-[#4848e5]">
                                    <span className="material-symbols-outlined text-sm">timelapse</span>
                                    <span className="text-xs font-semibold uppercase tracking-wider">Estimated Back Online</span>
                                </div>
                                <p className="text-[#4848e5] font-bold text-lg">{estimatedTime}</p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <Link
                                href="/"
                                className="flex items-center justify-center gap-2 rounded-lg h-11 px-8 bg-[#4848e5] text-white text-sm font-bold hover:bg-[#4848e5]/90 transition-colors shadow-sm shadow-[#4848e5]/30 w-full sm:w-auto"
                            >
                                <span className="material-symbols-outlined text-[20px]">monitor_heart</span>
                                Check Live Status
                            </Link>
                            <Link
                                href="/"
                                className="flex items-center justify-center gap-2 rounded-lg h-11 px-8 bg-[#f6f6f8] text-[#111117] text-sm font-bold hover:bg-gray-200 transition-colors w-full sm:w-auto"
                            >
                                <span className="material-symbols-outlined text-[20px]">refresh</span>
                                Refresh Page
                            </Link>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-100 w-full">
                            <p className="text-[#646487] text-sm">
                                Need urgent help with an ongoing event?{" "}
                                <Link className="text-[#4848e5] font-medium hover:underline" href="/contact">Contact Support</Link>
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="w-full py-6 text-center border-t border-gray-200 bg-white">
                <p className="text-[#646487] text-sm">
                    © 2024 GrabPic Platform. All rights reserved.
                </p>
            </footer>
        </div>
    );
}
