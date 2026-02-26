import type { NextRequest } from "next/server";

const DEFAULT_SIZE = 320;
const MAX_SIZE = 1024;

function parseSize(value: string | null): number {
  const size = Number.parseInt(String(value || DEFAULT_SIZE), 10);
  if (!Number.isFinite(size) || size <= 0) return DEFAULT_SIZE;
  return Math.min(MAX_SIZE, size);
}

export async function GET(request: NextRequest) {
  const data = String(request.nextUrl.searchParams.get("data") || "").trim();
  if (!data) {
    return new Response("Missing data", { status: 400 });
  }

  const size = parseSize(request.nextUrl.searchParams.get("size"));
  const upstreamUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&format=png&data=${encodeURIComponent(data)}`;

  const upstreamResponse = await fetch(upstreamUrl, { cache: "no-store" });
  if (!upstreamResponse.ok) {
    return new Response("Failed to generate QR", { status: 502 });
  }

  const image = await upstreamResponse.arrayBuffer();

  return new Response(image, {
    headers: {
      "Content-Type": upstreamResponse.headers.get("content-type") || "image/png",
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": "inline; filename=\"grabpic-qr.png\"",
    },
  });
}
