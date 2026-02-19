import Link from "next/link";

import Card from "@/components/card";

export default function HomePage() {
  return (
    <main className="grid gap-5">
      <Card>
        <h1 className="font-[var(--font-heading)] text-4xl font-semibold tracking-tight">Face-match event photos in a local-first stack.</h1>
        <p className="mt-3 max-w-3xl text-muted">
          GrabPic ingests a public Google Drive folder, clusters faces, and lets guests upload a selfie to find their photos.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/p/new" className="btn btn-primary">
            Create Event
          </Link>
        </div>
      </Card>
      <div className="grid gap-5 md:grid-cols-2">
        <Card title="Photographer Flow">
          <ol className="list-decimal space-y-2 pl-4 text-sm text-muted">
            <li>Create event with a public Drive link.</li>
            <li>Share event slug and guest code.</li>
            <li>Monitor sync and clustering jobs.</li>
          </ol>
        </Card>
        <Card title="Guest Flow">
          <ol className="list-decimal space-y-2 pl-4 text-sm text-muted">
            <li>Open event guest page.</li>
            <li>Enter guest code and upload selfie.</li>
            <li>View matched photos with confidence-safe filtering.</li>
          </ol>
        </Card>
      </div>
    </main>
  );
}

