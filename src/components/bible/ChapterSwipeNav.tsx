"use client";

import { useRouter } from "next/navigation";
import { useRef, type ReactNode, type TouchEvent } from "react";

type ChapterSwipeNavProps = {
  bookSlug: string;
  chapter: number;
  maxChapter: number;
  children: ReactNode;
};

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "button, a, input, textarea, select, label, [role='button'], [data-no-chapter-swipe]",
    ),
  );
}

/**
 * Horizontal swipe on the chapter body: swipe left → next chapter, swipe right → previous.
 * Ignores mostly-vertical gestures and swipes that start on interactive controls.
 */
export function ChapterSwipeNav({
  bookSlug,
  chapter,
  maxChapter,
  children,
}: ChapterSwipeNavProps) {
  const router = useRouter();
  const start = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (isInteractiveTarget(event.target)) {
      start.current = null;
      return;
    }
    const touch = event.touches[0];
    start.current = { x: touch.clientX, y: touch.clientY };
  };

  const onTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (!start.current) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.current.x;
    const dy = touch.clientY - start.current.y;
    start.current = null;

    const minTravel = 64;
    if (Math.abs(dx) < minTravel || Math.abs(dx) < Math.abs(dy) * 1.15) return;

    if (dx < 0 && chapter < maxChapter) {
      router.push(`/read/${bookSlug}/${chapter + 1}`);
      return;
    }
    if (dx > 0 && chapter > 1) {
      router.push(`/read/${bookSlug}/${chapter - 1}`);
    }
  };

  const onTouchCancel = () => {
    start.current = null;
  };

  return (
    <div
      className="touch-pan-y"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
    >
      {children}
    </div>
  );
}
