"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { loginLocal } from "@/lib/api";
import { setAuthSession } from "@/lib/auth-session";

const DEMO_USERS = [
  "superadmin@grabpic.com",
  "studio1@grabpic.com",
  "studio2@grabpic.com",
  "guest1@grabpic.com",
  "guest2@grabpic.com",
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("studio1@grabpic.com");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const result = await loginLocal({ email: email.trim(), password });
      setAuthSession({
        token: result.access_token,
        role: result.role,
        email: result.email,
        userId: result.user_id,
      });
      setSuccess(`Logged in as ${result.role}. Redirecting to dashboard...`);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-wrap">
      <section className="mx-auto max-w-xl rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">Login</h1>
        <p className="mt-2 text-sm text-muted">Use local dev credentials (`password123`) to access role-based routes.</p>

        <form className="mt-6 grid gap-3" onSubmit={onSubmit}>
          <label className="text-sm text-slate-700">
            Email
            <input className="field mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="text-sm text-slate-700">
            Password
            <input className="field mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <button className="btn btn-primary mt-2" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Quick fill users</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {DEMO_USERS.map((userEmail) => (
              <button key={userEmail} type="button" onClick={() => setEmail(userEmail)} className="btn btn-secondary !px-3 !py-1.5 text-xs">
                {userEmail}
              </button>
            ))}
          </div>
        </div>

        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        {success ? <p className="mt-3 text-sm text-teal-700">{success}</p> : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/" className="btn btn-secondary">
            Back to Home
          </Link>
          <Link href="/p/new" className="btn btn-secondary">
            Photographer Area
          </Link>
        </div>
      </section>
    </main>
  );
}
