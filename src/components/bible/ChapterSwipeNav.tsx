"use client";

import { useRouter } from "next/navigation";
import { useRef, type ReactNode } from "react";

type ChapterSwipeNavProps = {
  bookSlug: string;
  chapter: number;
  maxChapter: number;
  children: ReactNode;
};

/**
 * Horizontal swipe on the chapter body: swipe left → next chapter, swipe right → previous.
 * Ignores mostly-vertical gestures so scrolling still works.
 */
export function ChapterSwipeNav({
  bookSlug,
  chapter,
  maxChapter,
  children,
}: ChapterSwipeNavProps) {
  const router = useRouter();
  const start = useRef<{ x: number; y: number } | null>(null);

  return (
    <div
      onTouchStart={(e) => {
        const t = e.touches[0];
        start.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={(e) => {
        if (!start.current) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - start.current.x;
        const dy = t.clientY - start.current.y;
        start.current = null;
        const minTravel = 72;
        if (Math.abs(dx) < minTravel || Math.abs(dx) < Math.abs(dy) * 1.2) return;
        if (dx < 0 && chapter < maxChapter) {
          router.push(`/read/${bookSlug}/${chapter + 1}`);
        } else if (dx > 0 && chapter > 1) {
          router.push(`/read/${bookSlug}/${chapter - 1}`);
        }
      }}
    >
      {children}
    </div>
  );
}
