import type { Metadata } from "next";
import Link from "next/link";
import MarketingNav from "../../components/marketing-nav";
import MarketingFooter from "../../components/marketing-footer";

export const metadata: Metadata = {
    title: "GrabPic Terms and Conditions",
    description: "Read the terms and conditions for using GrabPic's AI-powered event photo platform.",
};

const tocItems = [
    { id: "introduction", label: "Introduction" },
    { id: "service-usage", label: "1. Service Usage" },
    { id: "photographer-responsibilities", label: "2. Photographer Responsibilities" },
    { id: "intellectual-property", label: "3. Intellectual Property" },
    { id: "liability", label: "4. Limitation of Liability" },
    { id: "termination", label: "5. Termination" },
];

export default function TermsPage() {
    return (
        <>
            <MarketingNav />
            <main className="flex-grow flex flex-col relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
                {/* Hero Header */}
                <div className="max-w-4xl mx-auto text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wide mb-6">
                        ⚖ Legal Documentation
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-6">
                        Terms and Conditions
                    </h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                        Please read these terms carefully before using our platform. They outline the rules and
                        regulations for the use of GrabPic&apos;s Website and Services.
                    </p>
                    <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-500">
                        <span>🕐</span>
                        <span>Last updated: October 24, 2023</span>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-12 relative">
                    {/* Sidebar */}
                    <aside className="hidden lg:block w-64 flex-shrink-0">
                        <div className="sticky top-24">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 px-3">
                                Contents
                            </h3>
                            <nav className="space-y-1">
                                {tocItems.map((item, i) => (
                                    <a
                                        key={item.id}
                                        href={`#${item.id}`}
                                        className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${i === 1
                                                ? "bg-primary/10 text-primary"
                                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                            }`}
                                    >
                                        {item.label}
                                    </a>
                                ))}
                            </nav>
                            <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-xs font-medium text-slate-500 mb-3">Need clarification on something?</p>
                                <Link href="/contact" className="inline-flex items-center text-xs font-bold text-primary hover:underline">
                                    Contact Support <span className="ml-1">↗</span>
                                </Link>
                            </div>
                        </div>
                    </aside>

                    {/* Main Document Content */}
                    <div className="flex-1">
                        <div className="space-y-0">
                            {/* Introduction */}
                            <section className="mb-12 scroll-mt-32" id="introduction">
                                <p className="text-lg leading-relaxed text-slate-600">
                                    By accessing or using the GrabPic platform, you agree to be bound by these Terms. If you
                                    disagree with any part of the terms, then you may not access the Service. These Terms apply
                                    to all visitors, users, and others who access or use the Service.
                                </p>
                            </section>

                            {/* Section 1 */}
                            <section className="mb-12 scroll-mt-32 border-b border-slate-100 pb-12" id="service-usage">
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-sm">1</span>
                                    <h2 className="text-2xl font-bold text-slate-900">Service Usage</h2>
                                </div>
                                <p className="text-slate-600 mb-4">
                                    GrabPic provides an AI-powered event photo distribution platform. You agree to use the
                                    Service only for lawful purposes and in accordance with these Terms. You are responsible for
                                    maintaining the confidentiality of your account and password.
                                </p>
                                <ul className="space-y-3 mt-4 text-slate-600 list-none pl-0">
                                    {[
                                        "You must provide accurate and complete information when creating an account.",
                                        "You may not use the service to distribute illegal, offensive, or harmful content.",
                                        "You agree not to access the Service by any means other than through the interface provided by GrabPic.",
                                    ].map((item) => (
                                        <li key={item} className="flex items-start gap-3">
                                            <span className="text-primary mt-1 font-bold">✓</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>

                            {/* Section 2 */}
                            <section className="mb-12 scroll-mt-32 border-b border-slate-100 pb-12" id="photographer-responsibilities">
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-sm">2</span>
                                    <h2 className="text-2xl font-bold text-slate-900">Photographer Responsibilities</h2>
                                </div>
                                <p className="text-slate-600 mb-6">
                                    As a photographer or event organizer uploading content to GrabPic, you warrant that you
                                    possess all necessary rights, consents, and permissions to distribute the photographs.
                                </p>
                                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                                    <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                        <span className="text-amber-500">⚠</span> Important Notice on Consent
                                    </h3>
                                    <p className="text-sm text-slate-600 leading-relaxed">
                                        You are solely responsible for obtaining explicit consent from subjects in your photos,
                                        especially in jurisdictions where biometric data laws (such as BIPA or GDPR) apply. GrabPic
                                        acts solely as a processor of this data on your behalf.
                                    </p>
                                </div>
                            </section>

                            {/* Section 3 */}
                            <section className="mb-12 scroll-mt-32 border-b border-slate-100 pb-12" id="intellectual-property">
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-sm">3</span>
                                    <h2 className="text-2xl font-bold text-slate-900">Intellectual Property</h2>
                                </div>
                                <p className="text-slate-600 mb-4">
                                    The Service and its original content, features, and functionality are and will remain the
                                    exclusive property of GrabPic and its licensors.
                                </p>
                                <p className="text-slate-600 mb-4">
                                    <strong>Your Content:</strong> You retain all rights to any photographs or data you upload to
                                    the Service. By uploading, you grant GrabPic a license to host, display, and process these
                                    materials solely for the purpose of providing the Service to you and your end-users.
                                </p>
                            </section>

                            {/* Section 4 */}
                            <section className="mb-12 scroll-mt-32 border-b border-slate-100 pb-12" id="liability">
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-sm">4</span>
                                    <h2 className="text-2xl font-bold text-slate-900">Limitation of Liability</h2>
                                </div>
                                <p className="text-slate-600 mb-4">
                                    In no event shall GrabPic, nor its directors, employees, partners, agents, suppliers, or
                                    affiliates, be liable for any indirect, incidental, special, consequential, or punitive
                                    damages, including without limitation, loss of profits, data, use, goodwill, or other
                                    intangible losses, resulting from:
                                </p>
                                <ol className="list-decimal pl-5 space-y-2 text-slate-600 marker:text-primary marker:font-bold">
                                    <li>Your access to or use of or inability to access or use the Service;</li>
                                    <li>Any conduct or content of any third party on the Service;</li>
                                    <li>Any content obtained from the Service; and</li>
                                    <li>Unauthorized access, use, or alteration of your transmissions or content.</li>
                                </ol>
                            </section>

                            {/* Section 5 */}
                            <section className="mb-12 scroll-mt-32" id="termination">
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-sm">5</span>
                                    <h2 className="text-2xl font-bold text-slate-900">Termination</h2>
                                </div>
                                <p className="text-slate-600 mb-4">
                                    We may terminate or suspend your account immediately, without prior notice or liability, for
                                    any reason whatsoever, including without limitation if you breach the Terms. Upon
                                    termination, your right to use the Service will immediately cease.
                                </p>
                                <div className="flex items-start gap-4 mt-8 p-4 bg-primary/5 rounded-xl border border-primary/10">
                                    <div className="p-2 bg-white rounded-lg shadow-sm text-primary">
                                        ✉
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">Questions regarding these terms?</h4>
                                        <p className="text-sm text-slate-600 mt-1">
                                            If you have any questions about these Terms, please contact us at{" "}
                                            <a className="text-primary hover:underline font-medium" href="mailto:legal@grabpic.com">
                                                legal@grabpic.com
                                            </a>
                                            .
                                        </p>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </main>
            <MarketingFooter />
        </>
    );
}
