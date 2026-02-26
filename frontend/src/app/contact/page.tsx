"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import { submitSupportContact } from "@/lib/api";
import MarketingFooter from "../../components/marketing-footer";
import MarketingNav from "../../components/marketing-nav";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ticketId, setTicketId] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const subject = String(formData.get("subject") || "").trim() || "General Support";
    const message = String(formData.get("message") || "").trim();

    if (name.length < 2) {
      setError("Please enter your full name.");
      return;
    }
    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (message.length < 10) {
      setError("Please enter more details in your message.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await submitSupportContact({
        name,
        email,
        subject,
        message,
        page_url: typeof window !== "undefined" ? window.location.href : "/contact",
      });
      setTicketId(response.ticket_id);
      setSubmitted(true);
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <MarketingNav activePage="Contact" />
      <main className="flex min-h-[80vh] flex-grow items-center justify-center bg-slate-50 p-6 md:p-12">
        <div className="w-full max-w-6xl">
          <div className="mb-12 text-center md:text-left">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
              Contact Support
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-600">
              Have a question about our AI photo features? Our team is here to help you get the most out of GrabPic.
            </p>
          </div>

          <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-xl md:flex-row">
            <div className="flex-1 p-8 md:p-12 lg:p-16">
              {submitted ? (
                <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">
                    ✓
                  </div>
                  <h2 className="mb-3 text-2xl font-bold text-slate-900">Message Sent!</h2>
                  <p className="max-w-sm text-slate-600">
                    Thanks for reaching out. Our team will get back to you soon.
                  </p>
                  {ticketId ? (
                    <p className="mt-3 rounded-md bg-slate-100 px-3 py-1 text-xs font-mono text-slate-600">
                      Ticket ID: {ticketId}
                    </p>
                  ) : null}
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setError("");
                    }}
                    className="mt-8 text-sm font-semibold text-primary hover:underline"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form className="space-y-6" onSubmit={handleSubmit}>
                  {error ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-900" htmlFor="full-name">
                        Full Name
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          👤
                        </div>
                        <input
                          className="block w-full rounded-lg border border-slate-200 bg-slate-50 p-3 pl-10 text-slate-900 placeholder:text-slate-400 transition-all focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary sm:text-sm"
                          id="full-name"
                          name="name"
                          placeholder="Jane Doe"
                          type="text"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-900" htmlFor="email">
                        Work Email
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          ✉
                        </div>
                        <input
                          className="block w-full rounded-lg border border-slate-200 bg-slate-50 p-3 pl-10 text-slate-900 placeholder:text-slate-400 transition-all focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary sm:text-sm"
                          id="email"
                          name="email"
                          placeholder="jane@company.com"
                          type="email"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-900" htmlFor="subject">
                      Subject
                    </label>
                    <select
                      className="block w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-900 transition-all focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary sm:text-sm"
                      id="subject"
                      name="subject"
                    >
                      <option value="">General Support</option>
                      <option value="Technical Support">Technical Support</option>
                      <option value="Billing & Pricing">Billing &amp; Pricing</option>
                      <option value="Enterprise Sales">Enterprise Sales</option>
                      <option value="Feature Request">Feature Request</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-900" htmlFor="message">
                      Message
                    </label>
                    <textarea
                      className="block w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-900 placeholder:text-slate-400 transition-all focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary sm:text-sm"
                      id="message"
                      name="message"
                      placeholder="Tell us how we can help..."
                      rows={4}
                      required
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      className="group relative flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:translate-y-0 disabled:opacity-60 sm:w-auto"
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

            <div className="relative flex w-full flex-col justify-between overflow-hidden bg-slate-50 p-8 md:w-96 md:border-l md:border-slate-100">
              <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
              <div className="absolute bottom-0 left-0 -mb-16 -ml-16 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
              <div className="relative z-10 space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Contact Information</h3>
                  <p className="mt-2 text-sm text-slate-500">Prefer to reach out directly? Here are our details.</p>
                </div>
                <div className="space-y-6">
                  <div className="group flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-primary shadow-sm ring-1 ring-slate-200 transition-all group-hover:ring-primary/50">
                      ✉
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Email us</p>
                      <a className="mt-1 block font-medium text-slate-900 hover:text-primary" href="mailto:support@grabpic.ai">
                        support@grabpic.ai
                      </a>
                      <p className="mt-1 text-xs text-slate-500">Typical response time: &lt; 2 hrs</p>
                    </div>
                  </div>

                  <div className="group flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-primary shadow-sm ring-1 ring-slate-200 transition-all group-hover:ring-primary/50">
                      📍
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Visit us</p>
                      <p className="mt-1 font-medium text-slate-900">
                        123 AI Innovation Way
                        <br />
                        Tech City, CA 90210
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative z-10 mt-10">
                <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Follow our updates</h4>
                <div className="flex gap-4">
                  {[
                    { label: "Twitter", icon: "X" },
                    { label: "Instagram", icon: "IG" },
                    { label: "LinkedIn", icon: "in" },
                  ].map((social) => (
                    <a
                      key={social.label}
                      href="#"
                      aria-label={social.label}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-white font-bold text-slate-500 shadow-sm ring-1 ring-slate-200 transition-all hover:text-primary hover:ring-primary"
                    >
                      {social.icon}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-between text-sm text-slate-500 md:flex-row">
            <p>© {new Date().getFullYear()} GrabPic AI. All rights reserved.</p>
            <div className="mt-2 space-x-4 md:mt-0">
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
