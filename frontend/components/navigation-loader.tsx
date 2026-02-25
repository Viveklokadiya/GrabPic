"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const MIN_VISIBLE_MS = 320;
const HIDE_TRANSITION_MS = 220;
const FAILSAFE_HIDE_MS = 8000;

export default function NavigationLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = useMemo(() => `${pathname}?${searchParams?.toString() || ""}`, [pathname, searchParams]);

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const mountedRef = useRef(false);
  const activeRef = useRef(false);
  const startTimeRef = useRef(0);
  const lastRouteRef = useRef(routeKey);

  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failsafeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = (timerRef: MutableRefObject<ReturnType<typeof setTimeout> | ReturnType<typeof setInterval> | null>) => {
    if (!timerRef.current) return;
    clearTimeout(timerRef.current as ReturnType<typeof setTimeout>);
    clearInterval(timerRef.current as ReturnType<typeof setInterval>);
    timerRef.current = null;
  };

  const finishLoader = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;

    clearTimer(progressTimerRef);
    clearTimer(failsafeTimerRef);

    const elapsed = Date.now() - startTimeRef.current;
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);

    clearTimer(hideTimerRef);
    hideTimerRef.current = setTimeout(() => {
      setProgress(100);
      hideTimerRef.current = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, HIDE_TRANSITION_MS);
    }, remaining);
  }, []);

  const startLoader = useCallback(() => {
    if (activeRef.current) return;
    activeRef.current = true;
    startTimeRef.current = Date.now();

    clearTimer(hideTimerRef);
    setVisible(true);
    setProgress(12);

    clearTimer(progressTimerRef);
    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        const next = prev + (90 - prev) * 0.18 + 1.6;
        return Math.min(90, Number(next.toFixed(2)));
      });
    }, 180);

    clearTimer(failsafeTimerRef);
    failsafeTimerRef.current = setTimeout(() => {
      finishLoader();
    }, FAILSAFE_HIDE_MS);
  }, [finishLoader]);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      lastRouteRef.current = routeKey;
      return;
    }
    if (lastRouteRef.current !== routeKey) {
      lastRouteRef.current = routeKey;
      finishLoader();
    }
  }, [routeKey, finishLoader]);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      if (anchor.dataset.noLoader === "true") return;
      if (anchor.hasAttribute("download")) return;
      if (anchor.target && anchor.target !== "_self") return;

      const href = anchor.getAttribute("href") || "";
      if (!href || href.startsWith("#")) return;

      let nextUrl: URL;
      try {
        nextUrl = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      const currentUrl = new URL(window.location.href);
      if (nextUrl.origin !== currentUrl.origin) return;
      if (nextUrl.pathname === currentUrl.pathname && nextUrl.search === currentUrl.search) return;

      startLoader();
    };

    const onSubmit = (event: SubmitEvent) => {
      if (event.defaultPrevented) return;
      const form = event.target as HTMLFormElement | null;
      if (!form) return;
      if (form.dataset.noLoader === "true") return;
      if (form.target && form.target !== "_self") return;

      const action = form.getAttribute("action") || "";
      if (action.startsWith("http://") || action.startsWith("https://")) {
        try {
          const actionUrl = new URL(action, window.location.href);
          if (actionUrl.origin !== window.location.origin) return;
        } catch {
          return;
        }
      }

      startLoader();
    };

    const onPopState = () => {
      startLoader();
    };

    document.addEventListener("click", onDocumentClick, true);
    document.addEventListener("submit", onSubmit, true);
    window.addEventListener("popstate", onPopState);

    return () => {
      document.removeEventListener("click", onDocumentClick, true);
      document.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, [startLoader]);

  useEffect(() => {
    return () => {
      clearTimer(progressTimerRef);
      clearTimer(hideTimerRef);
      clearTimer(failsafeTimerRef);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-x-0 top-0 z-[10050] transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
    >
      <div className="h-[3px] w-full bg-transparent">
        <div
          className="h-full rounded-r-full bg-gradient-to-r from-primary/80 via-primary to-primary-dark shadow-[0_0_20px_rgba(72,72,229,0.5)] transition-[width] duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div
        className={`absolute right-4 top-4 flex items-center gap-2 rounded-full border border-primary/20 bg-white/95 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary shadow-[0_10px_26px_rgba(72,72,229,0.2)] backdrop-blur transition-all duration-200 ${visible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"}`}
      >
        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        Loading
      </div>
    </div>
  );
}
