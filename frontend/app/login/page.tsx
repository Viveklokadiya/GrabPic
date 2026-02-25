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
  const googleInitializedRef = useRef(false);

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
    const mountNode = googleMountRef.current;
    if (!mountNode) return;
    const client = window.google?.accounts?.id;
    if (!client) return;

    if (!googleInitializedRef.current) {
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
      googleInitializedRef.current = true;
    }

    const renderGoogleButton = () => {
      if (!mountNode) return;
      const buttonWidth = Math.max(220, Math.floor(mountNode.clientWidth));
      mountNode.innerHTML = "";
      client.renderButton(mountNode, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        width: buttonWidth,
      });
    };

    renderGoogleButton();

    const observer = new ResizeObserver(() => renderGoogleButton());
    observer.observe(mountNode);
    return () => observer.disconnect();
  }, [googleClientId, googleScriptReady]);

  return (
    <main className="min-h-screen bg-[radial-gradient(1100px_480px_at_0%_0%,rgba(72,72,229,0.14),transparent_60%),radial-gradient(900px_420px_at_100%_0%,rgba(72,72,229,0.1),transparent_58%),#f8fafc]">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setGoogleScriptReady(true)}
        onError={() => setError("Failed to load Google sign-in script. Refresh and try again.")}
      />
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-12">
        <section className="relative hidden overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 p-10 text-white shadow-2xl lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_420px_at_20%_10%,rgba(99,102,241,0.45),transparent_62%),radial-gradient(700px_360px_at_90%_80%,rgba(72,72,229,0.22),transparent_60%)]" />
          <div className="relative">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-white/90">
              Secure Access
            </p>
            <h1 className="mt-5 font-display text-4xl font-bold tracking-tight">Welcome to GrabPic Admin</h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-200">
              Manage events, monitor processing, and control user access from one professional dashboard.
            </p>
          </div>
          <div className="relative grid gap-3 text-sm text-slate-100">
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">Fast event operations and monitoring</div>
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">Role-based access with secure sessions</div>
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">Google and local login support</div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <div className="mb-6">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-slate-900">Sign In</h2>
            <p className="mt-2 text-sm text-slate-500">Use your credentials or continue with Google.</p>
            {redirectPath ? <p className="mt-1 text-xs text-slate-500">After sign in, you will return to {redirectPath}</p> : null}
          </div>

          <form className="grid gap-4" onSubmit={onSubmit}>
            <label className="text-sm font-medium text-slate-700">
              Email
              <input
                className="field mt-1.5"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Password
              <input
                className="field mt-1.5"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <button className="btn btn-primary mt-1 h-11 w-full rounded-xl" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            Continue with
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Google Sign-In</p>
            {googleClientId ? (
              <div className="mt-3 w-full min-h-[44px]" ref={googleMountRef} />
            ) : (
              <p className="mt-2 text-xs text-amber-700">Set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to enable Google sign-in.</p>
            )}
            {googleLoading ? <p className="mt-2 text-xs text-slate-500">Verifying Google account...</p> : null}
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Quick Fill Users</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {DEMO_USERS.map((userEmail) => (
                <button
                  key={userEmail}
                  type="button"
                  onClick={() => setEmail(userEmail)}
                  className="truncate rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {userEmail}
                </button>
              ))}
            </div>
          </div>

          {error ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          {success ? <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

          <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Link href="/" className="btn btn-secondary !rounded-xl !justify-center">
              Back to Home
            </Link>
            <Link href="/photographer/events" className="btn btn-secondary !rounded-xl !justify-center">
              Photographer Area
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
