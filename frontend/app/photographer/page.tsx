import Link from "next/link";

export default function PhotographerHomePage() {
  return (
    <main className="grid gap-4">
      <section className="rounded-xl border border-line bg-white p-5">
        <h1 className="font-display text-2xl font-semibold text-slate-900">Photographer Dashboard</h1>
        <p className="mt-2 text-sm text-muted">Manage your events, run sync, and review guests with one workflow.</p>
        <div className="mt-4 flex gap-2">
          <Link href="/photographer/events" className="btn btn-primary">
            Open My Events
          </Link>
        </div>
      </section>
    </main>
  );
}
