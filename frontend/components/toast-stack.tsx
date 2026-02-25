"use client";

import { useEffect } from "react";

export type ToastVariant = "success" | "error" | "info";

export type ToastMessage = {
  id: string;
  variant: ToastVariant;
  title: string;
  message: string;
  durationMs?: number;
};

type ToastStackProps = {
  toasts: ToastMessage[];
  onDismiss: (toastId: string) => void;
};

function toneFor(variant: ToastVariant) {
  switch (variant) {
    case "success":
      return {
        icon: "check_circle",
        iconClass: "text-emerald-600",
        borderClass: "border-emerald-200",
        barClass: "bg-emerald-500",
      };
    case "error":
      return {
        icon: "error",
        iconClass: "text-red-600",
        borderClass: "border-red-200",
        barClass: "bg-red-500",
      };
    default:
      return {
        icon: "info",
        iconClass: "text-blue-600",
        borderClass: "border-blue-200",
        barClass: "bg-blue-500",
      };
  }
}

function ToastCard({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (toastId: string) => void }) {
  useEffect(() => {
    const timeoutId = window.setTimeout(() => onDismiss(toast.id), toast.durationMs ?? 3600);
    return () => window.clearTimeout(timeoutId);
  }, [toast.durationMs, toast.id, onDismiss]);

  const tone = toneFor(toast.variant);

  return (
    <article className={`pointer-events-auto overflow-hidden rounded-xl border bg-white/95 shadow-lg ring-1 ring-black/5 backdrop-blur ${tone.borderClass}`}>
      <div className="flex items-start gap-3 px-4 py-3">
        <span className={`material-symbols-outlined mt-0.5 text-[20px] ${tone.iconClass}`}>{tone.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
          <p className="mt-0.5 text-xs text-slate-600">{toast.message}</p>
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="text-slate-400 transition-colors hover:text-slate-600"
          aria-label="Dismiss notification"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
      <div className={`h-1 w-full ${tone.barClass}`} />
    </article>
  );
}

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[80] flex w-[min(92vw,24rem)] flex-col gap-3 sm:right-6">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
