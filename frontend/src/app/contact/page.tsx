"use client";

import { useState } from "react";
import Link from "next/link";
import MarketingNav from "../../components/marketing-nav";
import MarketingFooter from "../../components/marketing-footer";

export default function ContactPage() {
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        // Simulate request
        await new Promise((r) => setTimeout(r, 800));
        setLoading(false);
        setSubmitted(true);
    }

    return (
        <>
            <MarketingNav activePage="Contact" />
            <main className="flex-grow flex items-center justify-center p-6 md:p-12 bg-slate-50 min-h-[80vh]">
                <div className="w-full max-w-6xl">
                    {/* Page Header */}
                    <div className="mb-12 text-center md:text-left">
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
                            Contact Support
                        </h1>
                        <p className="mt-4 text-lg text-slate-600 max-w-2xl">
                            Have a question about our AI photo features? Our team is here to help you get the most out of
                            GrabPic.
                        </p>
                    </div>

                    {/* Content Card */}
                    <div className="overflow-hidden rounded-2xl bg-white shadow-xl flex flex-col md:flex-row">
                        {/* Left Column: Form */}
                        <div className="flex-1 p-8 md:p-12 lg:p-16">
                            {submitted ? (
                                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-3xl mb-6">
                                        ✓
                                    </div>
                                    <h2 className="text-2xl font-bold text-slate-900 mb-3">Message Sent!</h2>
                                    <p className="text-slate-600 max-w-sm">
                                        Thanks for reaching out. Our team will get back to you within 2 hours.
                                    </p>
                                    <button
                                        onClick={() => setSubmitted(false)}
                                        className="mt-8 text-sm font-semibold text-primary hover:underline"
                                    >
                                        Send another message
                                    </button>
                                </div>
                            ) : (
                                <form className="space-y-6" onSubmit={handleSubmit}>
                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                        {/* Name Input */}
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-slate-900" htmlFor="full-name">
                                                Full Name
                                            </label>
                                            <div className="relative">
                                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                                    👤
                                                </div>
                                                <input
                                                    className="block w-full rounded-lg border border-slate-200 bg-slate-50 p-3 pl-10 text-slate-900 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary sm:text-sm transition-all"
                                                    id="full-name"
                                                    name="name"
                                                    placeholder="Jane Doe"
                                                    type="text"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        {/* Email Input */}
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-slate-900" htmlFor="email">
                                                Work Email
                                            </label>
                                            <div className="relative">
                                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                                    ✉
                                                </div>
                                                <input
                                                    className="block w-full rounded-lg border border-slate-200 bg-slate-50 p-3 pl-10 text-slate-900 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary sm:text-sm transition-all"
                                                    id="email"
                                                    name="email"
                                                    placeholder="jane@company.com"
                                                    type="email"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Subject Select */}
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-900" htmlFor="subject">
                                            Subject
                                        </label>
                                        <select
                                            className="block w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-900 focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary sm:text-sm transition-all"
                                            id="subject"
                                            name="subject"
                                        >
                                            <option value="">Select a topic</option>
                                            <option value="technical">Technical Support</option>
                                            <option value="billing">Billing &amp; Pricing</option>
                                            <option value="enterprise">Enterprise Sales</option>
                                            <option value="feature">Feature Request</option>
                                        </select>
                                    </div>

                                    {/* Message Textarea */}
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-900" htmlFor="message">
                                            Message
                                        </label>
                                        <textarea
                                            className="block w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-900 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary sm:text-sm transition-all"
                                            id="message"
                                            name="message"
                                            placeholder="Tell us how we can help..."
                                            rows={4}
                                            required
                                        />
                                    </div>

                                    {/* Submit Button */}
                                    <div className="pt-2">
                                        <button
                                            className="group relative flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary/90 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 w-full sm:w-auto disabled:opacity-60 disabled:translate-y-0"
                                            type="submit"
                                            disabled={loading}
                                        >
                                            <span>{loading ? "Sending..." : "Send Message"}</span>
                                            <span className="transition-transform group-hover:translate-x-1">→</span>
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>

                        {/* Right Column: Info */}
                        <div className="relative w-full bg-slate-50 p-8 md:w-96 md:border-l md:border-slate-100 flex flex-col justify-between overflow-hidden">
                            <div className="absolute top-0 right-0 -mt-16 -mr-16 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
                            <div className="absolute bottom-0 left-0 -mb-16 -ml-16 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
                            <div className="relative z-10 space-y-8">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Contact Information</h3>
                                    <p className="mt-2 text-sm text-slate-500">Prefer to reach out directly? Here are our details.</p>
                                </div>
                                <div className="space-y-6">
                                    {/* Email */}
                                    <div className="flex items-start gap-4 group">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200 group-hover:ring-primary/50 transition-all">
                                            <span className="text-primary">✉</span>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Email us</p>
                                            <a
                                                className="mt-1 block font-medium text-slate-900 hover:text-primary"
                                                href="mailto:support@grabpic.ai"
                                            >
                                                support@grabpic.ai
                                            </a>
                                            <p className="text-xs text-slate-500 mt-1">Typical response time: &lt; 2 hrs</p>
                                        </div>
                                    </div>
                                    {/* Address */}
                                    <div className="flex items-start gap-4 group">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200 group-hover:ring-primary/50 transition-all">
                                            <span className="text-primary">📍</span>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Visit us</p>
                                            <p className="mt-1 font-medium text-slate-900">
                                                123 AI Innovation Way<br />
                                                Tech City, CA 90210
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="relative z-10 mt-10">
                                <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    Follow our updates
                                </h4>
                                <div className="flex gap-4">
                                    {[
                                        { label: "Twitter", icon: "𝕏" },
                                        { label: "Instagram", icon: "📸" },
                                        { label: "LinkedIn", icon: "in" },
                                    ].map((social) => (
                                        <a
                                            key={social.label}
                                            href="#"
                                            aria-label={social.label}
                                            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 hover:text-primary hover:ring-primary transition-all font-bold"
                                        >
                                            {social.icon}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Small */}
                    <div className="mt-8 flex flex-col md:flex-row items-center justify-between text-sm text-slate-500">
                        <p>© {new Date().getFullYear()} GrabPic AI. All rights reserved.</p>
                        <div className="mt-2 md:mt-0 space-x-4">
                            <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
                            <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
                        </div>
                    </div>
                </div>
            </main>
            <MarketingFooter />
        </>
    );
}
