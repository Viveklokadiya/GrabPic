import type { Metadata } from "next";
import Link from "next/link";
import MarketingNav from "../../components/marketing-nav";
import MarketingFooter from "../../components/marketing-footer";

export const metadata: Metadata = {
    title: "GrabPic Pricing - Simple Plans for Every Studio",
    description:
        "Transparent pricing for GrabPic. Start free during beta, scale to Pro when your studio grows. No hidden fees.",
};

const plans = [
    {
        name: "Free Beta",
        price: "$0",
        period: "/month",
        description: "Perfect for trying out our platform.",
        cta: "Start Free",
        ctaStyle: "outline",
        featured: false,
        features: [
            "1 Active Event",
            "500 Photo Limit",
            "Standard Quality Exports",
            "Email Support",
        ],
    },
    {
        name: "Pro Photographer",
        price: "$29",
        period: "/month",
        description: "For serious photographers growing their business.",
        cta: "Get Pro",
        ctaStyle: "primary",
        featured: true,
        features: [
            "Unlimited Events",
            "AI Face Matching",
            "Custom Branding & Domain",
            "High-Res Downloads",
            "Priority Chat Support",
        ],
    },
    {
        name: "Enterprise",
        price: "Custom",
        period: "",
        description: "Custom solutions for agencies and large teams.",
        cta: "Contact Sales",
        ctaStyle: "dark",
        featured: false,
        features: [
            "API Access",
            "Dedicated Support Manager",
            "SLA Guarantee",
            "SSO Integration",
            "Custom Contracts",
        ],
    },
];

const comparisonRows = [
    { feature: "AI Photo Matching", free: "Standard", pro: "Advanced", enterprise: "Advanced + Custom Models" },
    { feature: "Event Limit", free: "1 / month", pro: "Unlimited", enterprise: "Unlimited" },
    { feature: "Cloud Storage", free: "5GB", pro: "1TB", enterprise: "Unlimited" },
    { feature: "Custom Branding", free: false, pro: true, enterprise: true },
    { feature: "API Access", free: false, pro: false, enterprise: true },
    { feature: "Support Level", free: "Email (48h)", pro: "Priority Chat", enterprise: "Dedicated Manager + Phone" },
    { feature: "Analytics", free: "Basic", pro: "Advanced", enterprise: "Custom Reports" },
];

const faqs = [
    {
        q: "Can I upgrade my plan later?",
        a: "Yes, absolutely. You can upgrade from Free Beta to Pro at any time, and the prorated amount will be calculated automatically.",
    },
    {
        q: "How accurate is the AI face matching?",
        a: "Our AI has a 99.8% accuracy rate on high-quality photos. For Pro and Enterprise plans, you can also manually tag photos if the AI misses something.",
    },
    {
        q: "Do you offer discounts for non-profits?",
        a: "Yes, we offer a 20% discount for registered non-profit organizations. Please contact our support team with your documentation to apply.",
    },
];

function CheckIcon() {
    return <span className="text-primary font-bold text-lg">✓</span>;
}

function CrossIcon() {
    return <span className="text-slate-400 font-bold text-lg">✕</span>;
}

export default function PricingPage() {
    return (
        <>
            <MarketingNav activePage="Pricing" />
            <main>
                {/* Hero Section */}
                <section className="relative overflow-hidden bg-slate-900 py-20 lg:py-28">
                    <div
                        className="absolute inset-0 z-0 opacity-20"
                        style={{
                            background: "radial-gradient(ellipse at center, #4848e5 0%, transparent 70%)",
                        }}
                    />
                    <div className="container relative z-10 mx-auto px-4 text-center">
                        <h1 className="mx-auto max-w-4xl text-4xl font-black text-white md:text-5xl lg:text-6xl tracking-tight mb-6">
                            Simple pricing for events of any size
                        </h1>
                        <p className="mx-auto max-w-2xl text-lg text-slate-300 mb-10">
                            Choose the perfect plan for your photography business, from beta testing to enterprise scale.
                            No hidden fees.
                        </p>
                        {/* Billing Toggle (visual only) */}
                        <div className="inline-flex items-center rounded-full bg-white/10 p-1 backdrop-blur-sm ring-1 ring-white/20">
                            <button className="rounded-full bg-primary px-6 py-2 text-sm font-bold text-white shadow-lg transition-all">
                                Monthly billing
                            </button>
                            <button className="rounded-full px-6 py-2 text-sm font-bold text-white hover:bg-white/10 transition-all flex items-center gap-2">
                                Yearly billing{" "}
                                <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">Save 20%</span>
                            </button>
                        </div>
                    </div>
                </section>

                {/* Pricing Cards */}
                <section className="container mx-auto px-4 -mt-16 relative z-20 pb-20">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
                        {plans.map((plan) => (
                            <div
                                key={plan.name}
                                className={`flex flex-col rounded-2xl bg-white p-8 shadow-xl ${plan.featured
                                        ? "border-2 border-primary relative transform md:-translate-y-4"
                                        : "border border-slate-200 hover:border-primary/30 transition-all duration-300"
                                    }`}
                            >
                                {plan.featured && (
                                    <div className="absolute top-0 right-0 left-0 flex justify-center -mt-3">
                                        <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide shadow-md">
                                            Most Popular
                                        </span>
                                    </div>
                                )}
                                <div className={`mb-6 ${plan.featured ? "pt-2" : ""}`}>
                                    <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                                    <p className="mt-2 text-sm text-slate-500">{plan.description}</p>
                                    <div className="mt-4 flex items-baseline">
                                        <span className={`font-black text-slate-900 ${plan.price === "Custom" ? "text-4xl" : "text-5xl"}`}>
                                            {plan.price}
                                        </span>
                                        {plan.period && (
                                            <span className="ml-1 text-base font-medium text-slate-500">{plan.period}</span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    className={`w-full rounded-lg py-3 text-sm font-bold transition-all mb-8 ${plan.ctaStyle === "primary"
                                            ? "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/30"
                                            : plan.ctaStyle === "dark"
                                                ? "bg-slate-900 text-white hover:bg-slate-800"
                                                : "border-2 border-slate-200 text-slate-900 hover:border-primary hover:text-primary"
                                        }`}
                                >
                                    {plan.cta}
                                </button>
                                <div className="flex flex-col gap-4 flex-1">
                                    {plan.features.map((feature) => (
                                        <div key={feature} className="flex items-start gap-3 text-sm text-slate-700">
                                            <CheckIcon />
                                            <span className={plan.featured ? "font-medium" : ""}>{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Trust Section */}
                <section className="py-12 bg-white border-y border-slate-100">
                    <div className="container mx-auto px-4 text-center">
                        <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-8">
                            Trusted by event photographers worldwide
                        </p>
                        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 hover:opacity-70 transition-opacity duration-500">
                            {[
                                { icon: "📸", name: "SnapEvent" },
                                { icon: "🖼", name: "GalleryPro" },
                                { icon: "📷", name: "FocusFlow" },
                                { icon: "✨", name: "MagicShot" },
                            ].map((brand) => (
                                <div key={brand.name} className="flex items-center gap-2 text-slate-800 font-bold text-xl">
                                    <span>{brand.icon}</span> {brand.name}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Comparison Table */}
                <section className="py-20 bg-slate-50">
                    <div className="container mx-auto px-4 max-w-6xl">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold text-slate-900">Compare features</h2>
                            <p className="mt-4 text-slate-600">Dig into the details of what each plan offers.</p>
                        </div>
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[700px]">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 w-1/4">Feature</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 w-1/4">Free Beta</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-primary w-1/4">Pro Photographer</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 w-1/4">Enterprise</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {comparisonRows.map((row) => (
                                            <tr key={row.feature} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-5 text-sm font-medium text-slate-900">{row.feature}</td>
                                                <td className="px-6 py-5 text-sm text-slate-600">
                                                    {typeof row.free === "boolean" ? (row.free ? <CheckIcon /> : <CrossIcon />) : row.free}
                                                </td>
                                                <td className="px-6 py-5 text-sm font-semibold text-slate-900">
                                                    {typeof row.pro === "boolean" ? (row.pro ? <CheckIcon /> : <CrossIcon />) : row.pro}
                                                </td>
                                                <td className="px-6 py-5 text-sm text-slate-600">
                                                    {typeof row.enterprise === "boolean" ? (row.enterprise ? <CheckIcon /> : <CrossIcon />) : row.enterprise}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FAQ Section */}
                <section className="py-20 bg-white border-t border-slate-100">
                    <div className="container mx-auto px-4 max-w-3xl">
                        <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
                            Frequently Asked Questions
                        </h2>
                        <div className="space-y-4">
                            {faqs.map((faq) => (
                                <details
                                    key={faq.q}
                                    className="group rounded-xl bg-slate-50 p-6"
                                >
                                    <summary className="flex cursor-pointer items-center justify-between gap-1.5 text-slate-900 list-none">
                                        <h3 className="font-bold">{faq.q}</h3>
                                        <span className="text-slate-500 transition-transform duration-300 group-open:-rotate-180 text-xl">
                                            ∨
                                        </span>
                                    </summary>
                                    <p className="mt-4 leading-relaxed text-slate-600">{faq.a}</p>
                                </details>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="bg-primary py-16">
                    <div className="container mx-auto px-4 text-center">
                        <h2 className="text-3xl font-bold text-white mb-6">
                            Ready to transform your event photography?
                        </h2>
                        <p className="text-indigo-100 max-w-xl mx-auto mb-10 text-lg">
                            Join thousands of photographers delivering photos instantly with GrabPic.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                href="/#waitlist"
                                className="bg-white text-primary px-8 py-3 rounded-lg font-bold hover:bg-slate-100 transition-colors shadow-lg"
                            >
                                Get Started for Free
                            </Link>
                            <Link
                                href="/contact"
                                className="bg-primary/60 text-white border border-white/20 px-8 py-3 rounded-lg font-bold hover:bg-primary/40 transition-colors"
                            >
                                Contact Sales
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
            <MarketingFooter />
        </>
    );
}
