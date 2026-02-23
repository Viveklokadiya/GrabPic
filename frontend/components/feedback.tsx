"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// Demo Toast Component matching success_and_toast_feedback design
export function Toast({
    type = "success",
    title,
    message,
    onClose,
}: {
    type?: "success" | "warning" | "error";
    title: string;
    message: string;
    onClose: () => void;
}) {
    const styles = {
        success: { border: "border-[#0bda73]", text: "text-[#0bda73]", icon: "check_circle" },
        warning: { border: "border-amber-500", text: "text-amber-500", icon: "warning" },
        error: { border: "border-red-500", text: "text-red-500", icon: "error" },
    }[type];

    return (
        <div className={`pointer-events-auto flex w-full items-start gap-3 rounded-lg bg-white p-4 shadow-lg border-l-4 ${styles.border} ring-1 ring-black/5 transform transition-all hover:-translate-x-1 cursor-pointer`}>
            <div className={`${styles.text} mt-0.5`}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{styles.icon}</span>
            </div>
            <div className="flex-1">
                <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
                <p className="mt-1 text-sm text-slate-500">{message}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-500">
                <span className="material-symbols-outlined text-sm">close</span>
            </button>
        </div>
    );
}

// Demo Success Modal Component
export function SuccessModal({
    isOpen,
    onClose,
    title = "Event Published!",
    description,
    primaryActionLabel = "Go to Dashboard",
    primaryActionHref = "/photographer/events",
    secondaryActionLabel = "Create Another Event",
    secondaryActionHref = "/photographer/events",
}: {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: React.ReactNode;
    primaryActionLabel?: string;
    primaryActionHref?: string;
    secondaryActionLabel?: string;
    secondaryActionHref?: string;
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col items-center text-center relative animate-fade-in-up">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
                >
                    <span className="material-symbols-outlined">close</span>
                </button>

                {/* Illustration Area */}
                <div className="w-full bg-gradient-to-b from-[#0bda73]/10 to-transparent pt-12 pb-6 flex justify-center">
                    <div className="relative">
                        <div className="absolute inset-0 bg-[#0bda73]/20 rounded-full blur-xl scale-150"></div>
                        <div className="relative bg-white p-4 rounded-full shadow-lg ring-4 ring-[#0bda73]/10">
                            <span className="material-symbols-outlined text-[#0bda73] text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="px-8 pb-8 pt-2">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">{title}</h2>
                    <div className="text-slate-500 mb-8 leading-relaxed">
                        {description || "Action completed successfully."}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3 w-full">
                        <Link
                            href={primaryActionHref}
                            className="w-full bg-[#0bda73] hover:bg-[#09b05d] text-white font-medium py-3 px-4 rounded-lg transition-colors shadow-md shadow-[#0bda73]/20 flex items-center justify-center gap-2"
                        >
                            <span>{primaryActionLabel}</span>
                            <span className="material-symbols-outlined text-lg">arrow_forward</span>
                        </Link>
                        <Link
                            href={secondaryActionHref}
                            className="w-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium py-3 px-4 rounded-lg transition-colors"
                        >
                            {secondaryActionLabel}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Toast Provider outline (for real implementation, one would use context)
export function ToastContainer({ toasts, removeToast }: { toasts: any[], removeToast: (id: string) => void }) {
    return (
        <div className="fixed top-24 right-6 z-[60] flex flex-col gap-4 w-96 pointer-events-none">
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    type={toast.type}
                    title={toast.title}
                    message={toast.message}
                    onClose={() => removeToast(toast.id)}
                />
            ))}
        </div>
    );
}
