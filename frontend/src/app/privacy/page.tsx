import type { Metadata } from "next";
import Link from "next/link";
import MarketingNav from "../../components/marketing-nav";
import MarketingFooter from "../../components/marketing-footer";

export const metadata: Metadata = {
    title: "GrabPic Privacy Policy",
    description: "Learn how GrabPic collects, uses, and protects your personal and biometric data.",
};

const tocItems = [
    { id: "introduction", label: "Introduction" },
    { id: "data-collection", label: "Data Collection" },
    { id: "ai-processing", label: "AI Processing" },
    { id: "data-storage", label: "Data Storage" },
    { id: "third-party", label: "Third-Party Sharing" },
    { id: "user-rights", label: "User Rights" },
    { id: "contact", label: "Contact Us" },
];

export default function PrivacyPage() {
    return (
        <>
            <MarketingNav />
            <div className="w-full max-w-7xl mx-auto px-6 py-12 md:px-10 flex flex-col md:flex-row gap-12">
                {/* Sidebar */}
                <aside className="hidden md:block w-64 shrink-0">
                    <div className="sticky top-24 flex flex-col gap-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 px-3">Contents</h3>
                        <nav className="flex flex-col space-y-1">
                            {tocItems.map((item, i) => (
                                <a
                                    key={item.id}
                                    href={`#${item.id}`}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${i === 0
                                            ? "bg-primary/10 text-primary font-semibold"
                                            : "text-slate-600 hover:bg-slate-100 hover:text-primary"
                                        }`}
                                >
                                    {item.label}
                                </a>
                            ))}
                        </nav>
                        <div className="bg-slate-100 p-4 rounded-xl">
                            <p className="text-sm font-semibold mb-1">Need help?</p>
                            <p className="text-xs text-slate-500 mb-3">Our support team is available 24/7.</p>
                            <Link href="/contact" className="text-xs font-bold text-primary hover:underline">
                                Contact Support →
                            </Link>
                        </div>
                    </div>
                </aside>

                {/* Content */}
                <main className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-12">
                    <div className="border-b border-slate-100 pb-10 mb-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium mb-6">
                            Last updated: October 24, 2023
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-6">Privacy Policy</h1>
                        <p className="text-lg leading-relaxed text-slate-600 max-w-2xl">
                            At GrabPic, we take your privacy seriously. This policy outlines how we collect, use, and protect
                            your personal data, specifically focusing on the biometric data processed by our AI during events.
                        </p>
                    </div>

                    <div className="space-y-14">
                        <section id="introduction" className="scroll-mt-28">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">1</span>
                                Introduction
                            </h2>
                            <div className="text-slate-600 leading-8 space-y-4">
                                <p>GrabPic provides an AI-powered platform designed to identify and distribute event photos efficiently. This policy applies to information we collect on this Website, through our mobile applications, and in electronic communications between you and GrabPic.</p>
                                <ul className="list-disc pl-5 space-y-2 marker:text-primary">
                                    <li>On this Website and through our mobile applications.</li>
                                    <li>In email, text, and other electronic messages between you and this Website.</li>
                                    <li>Through mobile and desktop applications you download from this Website.</li>
                                </ul>
                            </div>
                        </section>

                        <section id="data-collection" className="scroll-mt-28">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">2</span>
                                Data Collection
                            </h2>
                            <p className="text-slate-600 leading-8 mb-6">We collect types of information including personally identifiable information (name, email, address, phone number).</p>
                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                                <h3 className="text-lg font-bold text-slate-900 mb-4">Key Data Points We Collect</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        { title: "Account Information", desc: "Name, email, and password used to create your account." },
                                        { title: "User Content", desc: "Photos uploaded to the platform, including metadata." },
                                        { title: "Device Information", desc: "IP address, browser type, and operating system." },
                                        { title: "Reference Photos", desc: "Selfies uploaded for facial recognition matching." },
                                    ].map((item) => (
                                        <div key={item.title} className="flex items-start gap-3">
                                            <span className="text-primary mt-1 text-xl">●</span>
                                            <div>
                                                <p className="font-semibold text-slate-900">{item.title}</p>
                                                <p className="text-sm text-slate-600">{item.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        <section id="ai-processing" className="scroll-mt-28">
                            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 md:p-8">
                                <h2 className="text-2xl font-bold text-primary mb-4">3. AI &amp; Biometric Processing</h2>
                                <p className="text-slate-700 leading-8 mb-4 font-medium">This section details how our AI processes visual data. Transparency in AI is our core value.</p>
                                <p className="text-slate-700 leading-8">When you upload a reference selfie, GrabPic:</p>
                                <ol className="list-decimal pl-5 space-y-3 mt-4 mb-6 text-slate-700 marker:text-primary marker:font-bold">
                                    <li><strong>Detects Faces:</strong> Our system scans uploaded images to identify human faces.</li>
                                    <li><strong>Creates Face Embeddings:</strong> Faces are converted to numerical vector representations — mathematical maps, not image files.</li>
                                    <li><strong>Matches Embeddings:</strong> Vectors are compared to find matches between your selfie and event gallery photos.</li>
                                </ol>
                                <p className="text-sm text-slate-500 italic bg-white p-4 rounded-lg border border-primary/10">
                                    <strong>Note:</strong> We do not use this data for surveillance or marketing profiling. Biometric data is used solely to deliver your photos to you.
                                </p>
                            </div>
                        </section>

                        <section id="data-storage" className="scroll-mt-28">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">4</span>
                                Data Storage &amp; Security
                            </h2>
                            <div className="text-slate-600 leading-8 space-y-4">
                                <p>All data is encrypted in transit using TLS 1.2+ and at rest using AES-256 encryption. We use enterprise-grade cloud storage in the United States and European Union, depending on your region.</p>
                                <p>Biometric data (face embeddings) is stored separately from PII for maximum security. We retain this data only as long as necessary — typically 30 days after an event concludes — then permanently delete it.</p>
                            </div>
                        </section>

                        <section id="third-party" className="scroll-mt-28">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">5</span>
                                Third-Party Sharing
                            </h2>
                            <p className="text-slate-600 leading-8">We do not sell your personal data. We may share your data with trusted third-party service providers who assist in operating our website or serving our users, so long as those parties agree to keep this information confidential.</p>
                        </section>

                        <section id="user-rights" className="scroll-mt-28">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">6</span>
                                User Rights
                            </h2>
                            <p className="text-slate-600 leading-8 mb-6">Depending on your location, you may have rights under GDPR or CCPA, including:</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { title: "Right to Access", desc: "Request copies of your personal data." },
                                    { title: "Right to Rectification", desc: "Request correction of inaccurate information." },
                                    { title: "Right to Erasure", desc: "Request deletion of your personal data." },
                                    { title: "Right to Object", desc: "Object to processing of your personal data." },
                                ].map((right) => (
                                    <div key={right.title} className="p-4 rounded-lg border border-slate-200">
                                        <h4 className="font-bold text-slate-900 mb-1">{right.title}</h4>
                                        <p className="text-sm text-slate-600">{right.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section id="contact" className="scroll-mt-28">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">7</span>
                                Contact Us
                            </h2>
                            <div className="bg-slate-50 p-8 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-200">
                                <div className="flex-1">
                                    <p className="text-slate-600 mb-4">If you have questions about this Privacy Policy, please contact us.</p>
                                    <a href="mailto:privacy@grabpic.com" className="flex items-center gap-2 text-primary font-bold hover:underline mb-2">
                                        ✉ privacy@grabpic.com
                                    </a>
                                    <p className="text-sm text-slate-600">📍 123 AI Boulevard, Tech City, CA 94000</p>
                                </div>
                                <Link href="/contact" className="px-6 py-3 bg-white border border-slate-200 rounded-lg font-medium text-slate-900 shadow-sm hover:shadow-md transition-all shrink-0">
                                    Open Support Ticket
                                </Link>
                            </div>
                        </section>
                    </div>
                </main>
            </div>
            <MarketingFooter />
        </>
    );
}
