"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";

import type { AuthLoginResponse, Role } from "@/lib/api";
import { loginGoogle, loginLocal } from "@/lib/api";
import { roleHomePath, setAuthSession } from "@/lib/auth-session";

const DEMO_USERS = [
  "superadmin@grabpic.com",
  "admin1@grabpic.com",
  "studio1@grabpic.com",
  "studio2@grabpic.com",
  "guest1@grabpic.com",
  "guest2@grabpic.com",
];

type GoogleCredentialResponse = { credential?: string };

type GoogleIdClient = {
  initialize: (input: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
  renderButton: (
    parent: HTMLElement,
    options: { theme?: string; size?: string; text?: string; shape?: string; width?: string | number }
  ) => void;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleIdClient;
      };
    };
  }
}

function safeRedirectPath(value: string | null): string {
  const raw = String(value || "").trim();
  if (!raw.startsWith("/")) return "";
  if (raw.startsWith("//")) return "";
  return raw;
}

export default function LoginPage() {
  const router = useRouter();
  const [redirectPath, setRedirectPath] = useState("");
  const googleClientId = String(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "").trim();
  const googleMountRef = useRef<HTMLDivElement | null>(null);
  const googleRenderedRef = useRef(false);

  const [email, setEmail] = useState("studio1@grabpic.com");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleScriptReady, setGoogleScriptReady] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRedirectPath(safeRedirectPath(params.get("next")));
  }, []);

  function completeLogin(result: AuthLoginResponse) {
    const role = result.role as Role;
    setAuthSession({
      token: result.access_token,
      role,
      email: result.email,
      userId: result.user_id,
      name: result.name || result.email,
    });
    const urlParams = new URLSearchParams(window.location.search);
    const directNext = safeRedirectPath(urlParams.get("next"));
    const fallback = roleHomePath(role);
    router.replace(directNext || redirectPath || fallback);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const result = await loginLocal({ email: email.trim(), password });
      completeLogin(result);
      setSuccess(`Logged in as ${result.role}. Redirecting...`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!googleScriptReady || !googleClientId) return;
    if (!googleMountRef.current || googleRenderedRef.current) return;
    const client = window.google?.accounts?.id;
    if (!client) return;
    client.initialize({
      client_id: googleClientId,
      callback: (response: GoogleCredentialResponse) => {
        const credential = String(response?.credential || "").trim();
        if (!credential) {
          setError("Google sign-in response is empty. Please try again.");
          return;
        }
        setGoogleLoading(true);
        setError("");
        setSuccess("");
        loginGoogle({ id_token: credential })
          .then((result) => {
            completeLogin(result);
            setSuccess(`Logged in as ${result.role}. Redirecting...`);
          })
          .catch((err) => {
            setError(err instanceof Error ? err.message : "Google sign-in failed");
          })
          .finally(() => {
            setGoogleLoading(false);
          });
      },
    });
    client.renderButton(googleMountRef.current, {
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "pill",
      width: 320,
    });
    googleRenderedRef.current = true;
  }, [googleClientId, googleScriptReady, redirectPath, router]);

  return (
    <main className="page-wrap">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setGoogleScriptReady(true)}
        onError={() => setError("Failed to load Google sign-in script. Refresh and try again.")}
      />
      <section className="mx-auto max-w-xl rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">Login</h1>
        <p className="mt-2 text-sm text-muted">Use local credentials (`password123`) or continue with Google.</p>
        {redirectPath ? <p className="mt-1 text-xs text-muted">After sign in, you will return to {redirectPath}</p> : null}

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
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Google Sign-In</p>
          {googleClientId ? (
            <div className="mt-3 min-h-11" ref={googleMountRef} />
          ) : (
            <p className="mt-2 text-xs text-amber-700">Set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to enable Google sign-in.</p>
          )}
          {googleLoading ? <p className="mt-2 text-xs text-muted">Verifying Google account...</p> : null}
        </div>

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
          <Link href="/photographer/events" className="btn btn-secondary">
            Photographer Area
          </Link>
        </div>
      </section>
    </main>
  );
}
