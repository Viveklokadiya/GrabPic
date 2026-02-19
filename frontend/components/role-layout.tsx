"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { clearAuthSession } from "@/lib/auth-session";
import { useAuth } from "@/lib/use-auth";

type NavItem = { href: string; label: string };

export function RoleLayoutShell({
  title,
  navItems,
  children,
  compactTopNav = false,
}: {
  title: string;
  navItems: NavItem[];
  children: React.ReactNode;
  compactTopNav?: boolean;
}) {
  const router = useRouter();
  const auth = useAuth();

  function logout() {
    clearAuthSession();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-[min(1200px,94vw)] items-center justify-between gap-3 py-3">
          <div>
            <p className="font-display text-lg font-semibold text-slate-900">{title}</p>
            <p className="text-xs text-muted">{auth.user?.email || "Signed in"}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="btn btn-secondary text-xs">
              Home
            </Link>
            <button className="btn btn-secondary text-xs" onClick={logout} type="button">
              Logout
            </button>
          </div>
        </div>
      </header>

      {compactTopNav ? (
        <nav className="border-b border-line bg-white">
          <div className="mx-auto flex w-[min(1200px,94vw)] flex-wrap gap-2 py-3">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="btn btn-secondary text-xs">
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}

      <div
        className={`mx-auto w-[min(1200px,94vw)] gap-4 py-6 ${compactTopNav ? "grid grid-cols-1" : "grid md:grid-cols-[220px_1fr]"}`}
      >
        {!compactTopNav ? (
          <aside className="rounded-xl border border-line bg-white p-3">
            <nav className="grid gap-2">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="btn btn-secondary justify-start text-xs">
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
        ) : null}
        <section>{children}</section>
      </div>
    </div>
  );
}
