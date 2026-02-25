export async function decodeQrCodeFromImage(file: File): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("QR scanning is only available in browser.");
  }

  const Detector = (window as unknown as { BarcodeDetector?: new (opts?: { formats?: string[] }) => { detect: (src: ImageBitmap | HTMLCanvasElement) => Promise<Array<{ rawValue?: string }>> } }).BarcodeDetector;
  if (!Detector) {
    throw new Error("QR image scan is not supported on this browser. Open the guest link directly.");
  }

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to process uploaded QR image.");
  }

  ctx.drawImage(bitmap, 0, 0);
  const detector = new Detector({ formats: ["qr_code"] });
  const rows = await detector.detect(canvas);
  const rawValue = String(rows[0]?.rawValue || "").trim();
  if (!rawValue) {
    throw new Error("No QR code found in uploaded image.");
  }
  return rawValue;
}

export function resolveGuestPathFromScan(rawValue: string): string {
  const text = String(rawValue || "").trim();
  if (!text) return "";

  if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text);
      if (url.pathname.startsWith("/g/")) return `${url.pathname}${url.search}`;
      if (url.pathname.startsWith("/guest/join")) return `${url.pathname}${url.search}`;
    } catch (_err) {
      // fall through
    }
  }

  if (text.startsWith("/g/") || text.startsWith("/guest/join")) {
    return text;
  }

  const normalized = text.replace(/\s+/g, "").toLowerCase();
  const fromGuestLink = normalized.match(/\/g\/([a-z0-9-]+)/i);
  if (fromGuestLink && fromGuestLink[1]) {
    return "/g/" + fromGuestLink[1].toLowerCase();
  }

  const slugOnly = normalized.replace(/[^a-z0-9-]/g, "");
  if (slugOnly.length >= 2) {
    return "/g/" + slugOnly;
  }

  return "";
}
