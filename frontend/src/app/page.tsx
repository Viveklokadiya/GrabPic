import type { ReactNode } from "react";

import ProductMock from "../components/product-mock";
import NavBar from "../components/nav-bar";
import SectionHeading from "../components/section-heading";
import WaitlistForm from "../components/waitlist-form";

type Step = {
  title: string;
  text: string;
  icon: ReactNode;
};

const steps: Step[] = [
  {
    title: "Photographer connects a Drive/OneDrive folder",
    text: "Keep your current workflow. Originals stay in your cloud folder where you already work.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path d="M7 18h10a4 4 0 0 0 .9-7.9A6 6 0 0 0 6.1 9.5 3.5 3.5 0 0 0 7 18Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    title: "GrabPic organizes photos by person",
    text: "We create lightweight vectors and fast indexes so each person’s moments are grouped automatically.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="16" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <rect x="5" y="14" width="14" height="5" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    title: "Guests upload a selfie and get My Photos",
    text: "No more scrolling endless folders. Guests join from a QR or link and instantly see their gallery.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
];

const benefits = [
  "Cost-effective storage with thumbnails + vectors",
  "Works with existing cloud folders",
  "Privacy controls per event",
  "Fast search powered by pgvector",
  "Resumable uploads (future)",
  "Auto-cleanup after event (future)",
];

const plans = [
  { name: "Free Beta", price: "$0", note: "Free during beta", featured: true },
  { name: "Pro Photographer", price: "$29/mo", note: "Per active event pack", featured: false },
  { name: "Enterprise Studio", price: "Custom", note: "Multi-team and SLAs", featured: false },
];

const faqItems = [
  {
    q: "Do I need to install anything?",
    a: "No install needed. GrabPic is web-based for both photographers and guests.",
  },
  {
    q: "Does it work with Google Drive links?",
    a: "Yes. You can start with public Drive links, then connect accounts for deeper automation.",
  },
  {
    q: "How accurate is matching?",
    a: "Matching is tuned for event photos and keeps a conservative threshold to avoid wrong results.",
  },
  {
    q: "Can guests see others’ photos?",
    a: "Guests only see photos matched to their selfie result set for the event.",
  },
  {
    q: "How long do you keep photos?",
    a: "Photographers keep control of originals in Drive/OneDrive. GrabPic stores only what is needed and supports cleanup rules.",
  },
  {
    q: "What about OneDrive?",
    a: "OneDrive support is part of the platform roadmap and included in current onboarding plans.",
  },
];

export default function HomePage() {
  const year = new Date().getFullYear();

  return (
    <>
      <NavBar />
      <main>
        <section className="relative overflow-hidden border-b border-slate-200/70 bg-hero-gradient py-16 md:py-24">
          <div className="mx-auto grid w-[min(1120px,92vw)] items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="animate-fade-up">
              <p className="mb-4 inline-flex rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-teal-700">
                Built for weddings and receptions
              </p>
              <h1 className="font-display text-4xl font-bold tracking-tight text-slate-950 md:text-6xl">
                Find your wedding photos instantly.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
                Photographers upload to Drive. Guests upload a selfie. GrabPic auto-groups your photos by you.
              </p>
              <p className="mt-4 max-w-2xl text-base text-slate-600">
                No more scrolling endless folders. Photographers keep control of originals in Drive/OneDrive.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#waitlist" className="btn btn-primary">
                  Join the waitlist
                </a>
                <a href="#how" className="btn btn-secondary">
                  See how it works
                </a>
              </div>
            </div>
            <ProductMock />
          </div>
        </section>

        <section className="border-b border-slate-200/70 bg-white">
          <div className="mx-auto flex w-[min(1120px,92vw)] flex-col gap-4 py-8 md:flex-row md:items-center md:justify-between">
            <p className="font-display text-lg font-semibold text-slate-900">Built for photographers</p>
            <ul className="grid gap-2 text-sm text-slate-600 md:grid-cols-3 md:gap-6">
              <li className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-teal-600" /> Fast setup in minutes
              </li>
              <li className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-teal-600" /> Privacy-first guest access
              </li>
              <li className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-teal-600" /> No extra uploads required
              </li>
            </ul>
          </div>
        </section>

        <section id="how" className="bg-app py-16 md:py-20">
          <div className="mx-auto w-[min(1120px,92vw)]">
            <SectionHeading
              eyebrow="How it works"
              title="Three steps to every guest’s My Photos"
              description="Simple for photographers. Instant for guests."
            />
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {steps.map((step, index) => (
                <article key={step.title} className="animate-fade-up rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" style={{ animationDelay: `${index * 90}ms` }}>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">{step.icon}</span>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="benefits" className="border-y border-slate-200/70 bg-white py-16 md:py-20">
          <div className="mx-auto w-[min(1120px,92vw)]">
            <SectionHeading
              eyebrow="Benefits"
              title="Built to keep photo delivery fast and practical"
              description="Use your existing cloud storage and still deliver personalized galleries quickly."
            />
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {benefits.map((benefit, index) => (
                <article key={benefit} className="animate-fade-up rounded-2xl border border-slate-200 bg-slate-50/70 p-5" style={{ animationDelay: `${index * 60}ms` }}>
                  <p className="text-base font-medium text-slate-800">{benefit}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-app py-16 md:py-20">
          <div className="mx-auto grid w-[min(1120px,92vw)] gap-8 rounded-3xl border border-slate-200 bg-white p-8 md:grid-cols-2 md:p-10">
            <SectionHeading
              eyebrow="Product details"
              title="Vector-based face grouping, explained simply"
              description="GrabPic turns each detected face into a compact math fingerprint, then groups similar ones together so each guest gets their own photo stream."
            />
            <div className="space-y-4 text-slate-600">
              <p>
                We keep this lightweight with fast vector search in pgvector, designed for event-scale galleries.
              </p>
              <p>
                Photographers keep control of originals in Drive/OneDrive, while GrabPic focuses on discovery and sharing speed.
              </p>
              <p className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 font-medium text-teal-800">We don&apos;t sell your data.</p>
            </div>
          </div>
        </section>

        <section id="pricing" className="border-y border-slate-200/70 bg-white py-16 md:py-20">
          <div className="mx-auto w-[min(1120px,92vw)]">
            <SectionHeading
              eyebrow="Pricing teaser"
              title="Start free, scale when your studio grows"
              description="GrabPic is currently free during beta."
            />
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {plans.map((plan) => (
                <article
                  key={plan.name}
                  className={`rounded-2xl border p-6 ${plan.featured ? "border-teal-300 bg-teal-50/80 shadow-md shadow-teal-100" : "border-slate-200 bg-white"}`}
                >
                  <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
                  <p className="mt-3 font-display text-4xl font-bold text-slate-950">{plan.price}</p>
                  <p className={`mt-3 text-sm ${plan.featured ? "text-teal-700" : "text-slate-600"}`}>{plan.note}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="bg-app py-16 md:py-20">
          <div className="mx-auto w-[min(900px,92vw)]">
            <SectionHeading eyebrow="FAQ" title="Answers before your next event" centered />
            <div className="mt-10 space-y-3">
              {faqItems.map((item) => (
                <details key={item.q} className="group rounded-2xl border border-slate-200 bg-white p-5">
                  <summary className="cursor-pointer list-none text-base font-semibold text-slate-900 marker:content-none">
                    {item.q}
                    <span className="float-right text-slate-400 transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="waitlist" className="border-y border-slate-200/70 bg-white py-16 md:py-20">
          <div className="mx-auto w-[min(760px,92vw)] rounded-3xl border border-slate-200 bg-slate-50 p-6 md:p-10">
            <SectionHeading
              eyebrow="Final CTA"
              title="Launch faster for your next wedding season"
              description="Join the waitlist and get early access. We&apos;ll help you set up your first event."
              centered
            />
            <div className="mx-auto mt-8 max-w-xl">
              <WaitlistForm />
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-950 py-8 text-slate-300">
        <div className="mx-auto flex w-[min(1120px,92vw)] flex-col items-start justify-between gap-4 text-sm md:flex-row md:items-center">
          <p>© {year} GrabPic</p>
          <div className="flex flex-wrap items-center gap-5">
            <a href="/privacy" className="transition hover:text-white">
              Privacy
            </a>
            <a href="/terms" className="transition hover:text-white">
              Terms
            </a>
            <a href="/contact" className="transition hover:text-white">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
