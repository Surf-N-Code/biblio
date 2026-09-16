"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ChapterSwipeGesture } from "@/lib/bible/chapter-swipe";

type ChapterSwipeNavProps = {
  bookSlug: string;
  chapter: number;
  maxChapter: number;
  children: ReactNode;
};

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("[data-no-chapter-swipe], [data-vaul-drawer], dialog")) return true;
  const control = target.closest("button, a, input, textarea, select, label, [role='button']");
  return control !== null && !control.matches("button[data-verse]");
}

const SLIDE_MS = 220;

export function ChapterSwipeNav({ bookSlug, chapter, maxChapter, children }: ChapterSwipeNavProps) {
  const router = useRouter();
  const container = useRef<HTMLDivElement>(null);
  const gesture = useRef<ChapterSwipeGesture | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recoveryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClickUntil = useRef(0);
  const busy = useRef(false);
  const prefetched = useRef<number | null>(null);
  const [view, setView] = useState({ offset: 0, progress: 0, target: null as number | null, phase: "idle", direction: 0 });
  const [navigationError, setNavigationError] = useState(false);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (recoveryTimer.current) clearTimeout(recoveryTimer.current);
  }, []);

  const settle = () => {
    gesture.current = null;
    busy.current = true;
    setView((previous) => ({ ...previous, offset: 0, progress: 0, phase: "settling" }));
    timer.current = setTimeout(() => {
      busy.current = false;
      setView({ offset: 0, progress: 0, target: null, phase: "idle", direction: 0 });
    }, SLIDE_MS);
  };

  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (busy.current) return;
    if (event.touches.length !== 1 && gesture.current?.axis === "horizontal") { settle(); return; }
    gesture.current = null;
    if (event.touches.length !== 1 || isInteractiveTarget(event.target) ||
      document.querySelector("dialog[open], [data-vaul-drawer][data-state='open']")) return;
    const touch = event.touches[0];
    // Preserve Safari's native edge-back gesture and zoom.
    if (touch.clientX < 24 || touch.clientX > window.innerWidth - 24 ||
      (window.visualViewport?.scale ?? 1) > 1.05) return;
    gesture.current = new ChapterSwipeGesture(touch.clientX, touch.clientY, container.current?.clientWidth ?? window.innerWidth, chapter, maxChapter);
    setNavigationError(false);
  };

  const onTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (busy.current || !current) return;
    if (event.touches.length !== 1) { settle(); return; }
    current.move(event.touches[0].clientX, event.touches[0].clientY);
    if (current.axis !== "horizontal") return;
    suppressClickUntil.current = Date.now() + 800;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const direction = Math.sign(current.offset);
    if (current.target !== null && prefetched.current !== current.target) {
      prefetched.current = current.target;
      router.prefetch(`/read/${bookSlug}/${current.target}`);
    }
    setView({
      offset: reducedMotion ? 0 : current.committed ? direction * current.width : current.offset,
      progress: Math.min(1, Math.abs(current.offset) / current.threshold),
      target: current.target,
      phase: current.committed ? "navigating" : "dragging",
      direction,
    });
    if (!current.committed || current.target === null) return;
    busy.current = true;
    const target = current.target;
    timer.current = setTimeout(() => {
      router.push(`/read/${bookSlug}/${target}`, { scroll: true });
      recoveryTimer.current = setTimeout(() => {
        busy.current = false;
        gesture.current = null;
        setView({ offset: 0, progress: 0, target: null, phase: "idle", direction: 0 });
        setNavigationError(true);
      }, 8000);
    }, reducedMotion ? 0 : SLIDE_MS);
  };

  const onTouchEnd = () => {
    if (busy.current) return;
    if (gesture.current?.axis === "horizontal") {
      suppressClickUntil.current = Date.now() + 800;
      settle();
    }
    else gesture.current = null;
  };

  const visible = view.phase === "dragging" || view.phase === "navigating";
  const Arrow = view.direction < 0 ? ArrowRight : ArrowLeft;

  return (
    <div ref={container} className="relative overflow-x-clip touch-pan-y touch-pinch-zoom"
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}
      onClickCapture={(event) => {
        if (busy.current || Date.now() < suppressClickUntil.current) { event.preventDefault(); event.stopPropagation(); }
      }}
      aria-busy={view.phase === "navigating"}
    >
      {visible && (
        <div className={`pointer-events-none fixed top-1/2 z-20 -translate-y-1/2 ${view.direction < 0 ? "right-4" : "left-4"}`} role="status">
          <div className="flex max-w-40 flex-col items-center gap-2 rounded-2xl border border-zinc-200 bg-white/95 px-3 py-4 text-center text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-900/95">
            <Arrow className="h-6 w-6" aria-hidden />
            <span>{view.target === null ? (view.direction > 0 ? "Erstes Kapitel" : "Letztes Kapitel") : `Kapitel ${view.target}`}</span>
            {view.target !== null && <>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{view.phase === "navigating" ? "Wird geöffnet …" : "Weiter wischen"}</span>
              <div className="h-1 w-full overflow-hidden rounded bg-zinc-200 dark:bg-zinc-700"><div className="h-full origin-left bg-sky-500" style={{ transform: `scaleX(${view.progress})` }} /></div>
            </>}
          </div>
        </div>
      )}
      <div style={{
        transform: view.phase === "idle" ? undefined : `translateX(${view.offset}px)`,
        transition: view.phase === "dragging" ? "none" : `transform ${SLIDE_MS}ms ease-out`,
        willChange: view.phase === "idle" ? undefined : "transform",
      }}>
        {children}
      </div>
      {navigationError && <p role="status" className="mt-3 text-sm text-amber-700 dark:text-amber-300">Das Kapitel konnte noch nicht geöffnet werden. Bitte nutze die Kapitelnavigation unten oder versuche es erneut.</p>}
    </div>
  );
}
