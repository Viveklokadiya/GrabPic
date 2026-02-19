"use client";

import { FormEvent, useMemo, useState } from "react";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [showToast, setShowToast] = useState(false);

  const isValidEmail = useMemo(() => /\S+@\S+\.\S+/.test(email.trim()), [email]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValidEmail) {
      setMessage("Please enter a valid email address.");
      return;
    }
    setMessage("Thanks! We'll reach out soon.");
    setEmail("");
    setShowToast(true);
    window.setTimeout(() => setShowToast(false), 2600);
  }

  return (
    <>
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label htmlFor="waitlist-email" className="sr-only">
          Email address
        </label>
        <input
          id="waitlist-email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@studio.com"
          className="field"
          required
        />
        <button type="submit" className="btn btn-primary">
          Join the waitlist
        </button>
      </form>
      {message ? (
        <p className={`mt-3 text-sm ${message.startsWith("Thanks") ? "text-teal-700" : "text-rose-700"}`} role="status" aria-live="polite">
          {message}
        </p>
      ) : null}
      {showToast ? (
        <div
          className="fixed bottom-4 right-4 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800 shadow-lg"
          role="status"
          aria-live="polite"
        >
          Thanks! We'll reach out soon.
        </div>
      ) : null}
    </>
  );
}
