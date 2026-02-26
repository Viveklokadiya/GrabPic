"use client";

export default function GlobalLoadingState() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[10020]">
      <div className="h-[3px] w-full bg-transparent">
        <div className="h-full w-1/3 animate-pulse rounded-r-full bg-gradient-to-r from-primary/70 via-primary to-primary-dark shadow-[0_0_14px_rgba(72,72,229,0.45)]" />
      </div>
    </div>
  );
}
