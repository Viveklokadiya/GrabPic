"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const MIN_VISIBLE_MS = 220;
const HIDE_TRANSITION_MS = 180;
const FAILSAFE_HIDE_MS = 3500;

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
    setProgress(14);

    clearTimer(progressTimerRef);
    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 88) return prev;
        const next = prev + (88 - prev) * 0.2 + 1.2;
        return Math.min(88, Number(next.toFixed(2)));
      });
    }, 160);

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
      if (!target) return;
      if (target.closest('[data-no-loader="true"]')) return;

      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      if (anchor.dataset.noLoader === "true") return;
      if (anchor.hasAttribute("download")) return;
      if (anchor.target && anchor.target !== "_self") return;

      const href = anchor.getAttribute("href") || "";
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;

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

    const onPageShow = () => {
      finishLoader();
    };

    document.addEventListener("click", onDocumentClick, true);
    document.addEventListener("submit", onSubmit, true);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      document.removeEventListener("click", onDocumentClick, true);
      document.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [finishLoader, startLoader]);

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
      className={`pointer-events-none fixed inset-x-0 top-0 z-[10050] transition-opacity duration-150 ${visible ? "opacity-100" : "opacity-0"}`}
    >
      <div className="h-[3px] w-full bg-transparent">
        <div
          className="h-full rounded-r-full bg-gradient-to-r from-primary/80 via-primary to-primary-dark shadow-[0_0_18px_rgba(72,72,229,0.45)] transition-[width] duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
