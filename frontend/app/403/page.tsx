import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="page-wrap">
      <section className="mx-auto max-w-xl rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-red-700">403</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-slate-900">Access denied</h1>
        <p className="mt-3 text-sm text-muted">You do not have permission to view this page with your current role.</p>
        <div className="mt-5 flex justify-center gap-2">
          <Link href="/login" className="btn btn-primary">
            Go to Login
          </Link>
          <Link href="/" className="btn btn-secondary">
            Home
          </Link>
        </div>
      </section>
    </main>
  );
}
