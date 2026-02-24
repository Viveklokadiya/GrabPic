import type { Metadata } from "next";
import Link from "next/link";
import MarketingNav from "../../components/marketing-nav";
import MarketingFooter from "../../components/marketing-footer";

export const metadata: Metadata = {
    title: "About GrabPic - Connecting Memories Instantly",
    description:
        "GrabPic connects guests to their event photos instantly using ethical AI. No more searching through thousands of photos — find yours in seconds.",
};

const steps = [
    {
        icon: "↑",
        title: "1. Upload",
        description: "Photographers upload the full event gallery securely.",
    },
    {
        icon: "⊙",
        title: "2. Vectorize",
        description: "AI converts faces into anonymous mathematical number strings.",
    },
    {
        icon: "✕",
        title: "3. Purge",
        description: "Original biometric data is permanently deleted after processing.",
    },
    {
        icon: "✓",
        title: "4. Match",
        description: "Guests snap a selfie to unlock only their specific photos.",
    },
];

const privacyPoints = [
    "No facial images stored permanently",
    "Guests control their own visibility",
    "Encrypted galleries & transmission",
    "Automatic data expiry options",
];

const securityBadges = [
    { icon: "🔒", name: "SOC2" },
    { icon: "✓", name: "GDPR" },
    { icon: "🔐", name: "SSL" },
    { icon: "☁", name: "AWS" },
];

export default function AboutPage() {
    return (
        <>
            <MarketingNav activePage="About" />
            <main>
                {/* Hero Section */}
                <section className="relative overflow-hidden py-20 md:py-32">
                    <div className="mx-auto max-w-7xl px-6 lg:px-8">
                        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-20">
                            <div className="flex-1 max-w-xl">
                                <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary ring-1 ring-inset ring-primary/10 mb-6">
                                    Who We Are
                                </div>
                                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl mb-6">
                                    Connecting You to Your Best Moments{" "}
                                    <span className="text-primary">Instantly.</span>
                                </h1>
                                <p className="text-lg leading-8 text-slate-600 mb-4">
                                    We believe every guest deserves their memories without the hunt. GrabPic makes photo
                                    sharing seamless, secure, and magical by using ethical AI to find you in the crowd.
                                </p>
                                <div className="flex items-center gap-x-6 mt-10">
                                    <Link
                                        href="/#waitlist"
                                        className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition-colors"
                                    >
                                        Learn More
                                    </Link>
                                    <Link href="/#how" className="text-sm font-semibold leading-6 text-slate-900 group flex items-center gap-1">
                                        Watch Demo{" "}
                                        <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
                                    </Link>
                                </div>
                            </div>
                            <div className="flex-1 w-full max-w-2xl">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-4">
                                        <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                                            <span className="text-slate-400 text-6xl">📸</span>
                                        </div>
                                        <div className="aspect-square rounded-2xl overflow-hidden shadow-lg bg-primary/5 p-6 flex flex-col justify-center items-center text-center">
                                            <p className="text-4xl font-bold text-primary mb-2">1M+</p>
                                            <p className="text-sm text-slate-600 font-medium">Memories Delivered</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4 pt-8">
                                        <div className="aspect-square rounded-2xl overflow-hidden shadow-lg bg-slate-900 flex items-center justify-center text-white p-6">
                                            <div className="text-center">
                                                <p className="text-3xl mb-2">❤️</p>
                                                <p className="font-bold">Loved by Guests</p>
                                            </div>
                                        </div>
                                        <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                            <span className="text-slate-600 text-6xl">🎉</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Vision / Mission Section */}
                <section className="bg-white py-24 sm:py-32">
                    <div className="mx-auto max-w-7xl px-6 lg:px-8">
                        <div className="grid grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:grid-cols-2 items-center">
                            <div>
                                <h2 className="text-base font-semibold leading-7 text-primary">Our Vision</h2>
                                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                                    Memories without the search
                                </p>
                                <p className="mt-6 text-lg leading-8 text-slate-600">
                                    Traditional event photography is broken. Guests wait weeks for links, then scroll through
                                    thousands of thumbnails just to find one blurry photo of themselves.
                                </p>
                                <p className="mt-4 text-lg leading-8 text-slate-600">
                                    We&apos;re building a future where technology bridges the gap between the moment and the
                                    memory. Our platform respects the art of photography while eliminating the logistical
                                    nightmare of distribution.
                                </p>
                                <dl className="mt-10 max-w-xl space-y-8 text-base leading-7 text-slate-600 lg:max-w-none">
                                    <div className="relative pl-9">
                                        <dt className="inline font-semibold text-slate-900">
                                            <span className="absolute left-0 top-1 w-6 text-primary">↗</span>
                                            Instant Delivery.{" "}
                                        </dt>
                                        <dd className="inline">Photos are delivered to guests&apos; phones while the event is still happening.</dd>
                                    </div>
                                    <div className="relative pl-9">
                                        <dt className="inline font-semibold text-slate-900">
                                            <span className="absolute left-0 top-1 w-6 text-primary">✓</span>
                                            Curated Galleries.{" "}
                                        </dt>
                                        <dd className="inline">Guests only see their own photos, keeping galleries personal and uncluttered.</dd>
                                    </div>
                                </dl>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                                    <span className="text-7xl">👥</span>
                                </div>
                                <div className="flex flex-col gap-4 pt-8">
                                    <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br from-primary/10 to-rose-100 flex items-center justify-center">
                                        <span className="text-5xl">😄</span>
                                    </div>
                                    <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary to-rose-500 p-6 flex flex-col justify-center items-center text-white text-center">
                                        <span className="text-4xl font-black mb-2">1M+</span>
                                        <span className="text-sm font-medium opacity-90">Memories Delivered</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* How It Works / AI Logic */}
                <section className="py-24 sm:py-32">
                    <div className="mx-auto max-w-7xl px-6 lg:px-8">
                        <div className="mx-auto max-w-2xl text-center">
                            <h2 className="text-base font-semibold leading-7 text-primary">The Technology</h2>
                            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                                Simple AI. Secure by Design.
                            </p>
                            <p className="mt-6 text-lg leading-8 text-slate-600">
                                We use facial vectorization to match photos. It sounds complex, but the privacy principle is
                                simple: we don&apos;t store your face, we store math.
                            </p>
                        </div>
                        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
                            <div className="grid grid-cols-1 gap-x-8 gap-y-10 lg:grid-cols-4 relative">
                                {/* Connecting Line */}
                                <div className="hidden lg:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-slate-200 -z-10" />
                                {steps.map((step) => (
                                    <div
                                        key={step.title}
                                        className="flex flex-col items-center text-center bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative z-10"
                                    >
                                        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 ring-8 ring-white">
                                            <span className="text-2xl text-primary font-bold">{step.icon}</span>
                                        </div>
                                        <dt className="text-base font-bold leading-7 text-slate-900">{step.title}</dt>
                                        <dd className="mt-1 text-base leading-7 text-slate-600">{step.description}</dd>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Privacy First Section */}
                <section className="py-12 bg-slate-50">
                    <div className="mx-auto max-w-7xl px-6 lg:px-8">
                        <div className="relative overflow-hidden bg-slate-900 px-6 py-24 shadow-2xl rounded-3xl sm:px-24">
                            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/20 to-transparent pointer-events-none" />
                            <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                                <div className="flex-1 text-center md:text-left">
                                    <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white mb-6 backdrop-blur-sm border border-white/10">
                                        🛡 Privacy First Architecture
                                    </div>
                                    <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                                        We don&apos;t sell data.<br />We preserve memories.
                                    </h2>
                                    <p className="mt-6 text-lg leading-8 text-slate-300">
                                        Our business model is simple: organizers pay for the service, so users don&apos;t pay with their
                                        privacy. We are fully GDPR compliant and designed from the ground up to minimize data retention.
                                    </p>
                                    <div className="mt-10">
                                        <Link
                                            href="/privacy"
                                            className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-100 transition-colors"
                                        >
                                            Read Privacy Policy
                                        </Link>
                                    </div>
                                </div>
                                <div className="flex-1 w-full max-w-md">
                                    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                                        <ul className="space-y-4">
                                            {privacyPoints.map((point) => (
                                                <li key={point} className="flex items-center gap-3 text-white">
                                                    <span className="text-green-400 font-bold">✓</span>
                                                    <span>{point}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Team / Trust Section */}
                <section className="py-24 sm:py-32 bg-white">
                    <div className="mx-auto max-w-7xl px-6 lg:px-8">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
                            <div>
                                <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                                    Built by experts in AI &amp; Photography
                                </h2>
                                <p className="mt-4 text-lg text-slate-600">
                                    Our team combines decades of experience in computer vision security and professional event
                                    photography.
                                </p>
                                <div className="mt-8 flex items-center gap-4">
                                    <div className="flex -space-x-4">
                                        {["👩‍💻", "👨‍🎨", "👨‍💼", "👩‍📸"].map((emoji, i) => (
                                            <div
                                                key={i}
                                                className="inline-flex h-12 w-12 rounded-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10 ring-2 ring-white text-xl"
                                            >
                                                {emoji}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="text-sm font-medium text-slate-600">+12 others</div>
                                </div>
                            </div>
                            <div className="lg:col-span-2 border-t lg:border-t-0 lg:border-l border-slate-200 lg:pl-12 pt-8 lg:pt-0">
                                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-6">
                                    Security Standards &amp; Partners
                                </p>
                                <div className="grid grid-cols-2 gap-8 md:grid-cols-4 opacity-70 grayscale">
                                    {securityBadges.map((badge) => (
                                        <div key={badge.name} className="flex items-center gap-2">
                                            <span className="text-3xl">{badge.icon}</span>
                                            <span className="font-bold text-lg">{badge.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-16 text-center bg-slate-50">
                    <div className="mx-auto max-w-3xl px-6">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                            Ready to modernize your event?
                        </h2>
                        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-600">
                            Join thousands of organizers who trust GrabPic for instant, secure photo delivery.
                        </p>
                        <div className="mt-10 flex items-center justify-center gap-x-6">
                            <Link
                                href="/#waitlist"
                                className="flex min-w-[140px] cursor-pointer items-center justify-center rounded-lg h-12 px-6 bg-primary text-white text-base font-bold shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all"
                            >
                                Get Started for Free
                            </Link>
                            <Link href="/contact" className="text-sm font-semibold leading-6 text-slate-900 hover:text-primary">
                                Contact Sales <span aria-hidden="true">→</span>
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
            <MarketingFooter />
        </>
    );
}
