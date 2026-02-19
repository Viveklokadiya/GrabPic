"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { joinGuestEventFromSlug } from "@/lib/rbac-api";

export default function GuestJoinFromLinkPage() {
  const router = useRouter();
  const params = useSearchParams();
  const slug = useMemo(() => String(params.get("slug") || "").trim().toLowerCase(), [params]);
  const [error, setError] = useState("");

  useEffect(() => {
    let canceled = false;

    async function run() {
      if (!slug) {
        setError("Missing event slug in invite link.");
        return;
      }
      try {
        const membership = await joinGuestEventFromSlug(slug);
        if (canceled) return;
        router.replace(`/guest/events/${membership.event_id}`);
      } catch (err) {
        if (canceled) return;
        setError(err instanceof Error ? err.message : "Could not join event from invite link");
      }
    }

    void run();
    return () => {
      canceled = true;
    };
  }, [router, slug]);

  return (
    <main className="rounded-xl border border-line bg-white p-5">
      <h1 className="font-display text-2xl font-semibold text-slate-900">Joining Event</h1>
      {!error ? <p className="mt-2 text-sm text-muted">Please wait, we are connecting this invite to your guest account...</p> : null}
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
    </main>
  );
}
