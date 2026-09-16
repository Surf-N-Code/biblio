import { expect, it } from "vitest";
import { ChapterSwipeGesture } from "@/lib/bible/chapter-swipe";

it("follows the finger and locks next/previous when crossing the threshold", () => {
  for (const direction of [-1, 1]) {
    const swipe = new ChapterSwipeGesture(200, 300, 390, 4, 28);
    swipe.move(200 + direction * 50, 305);
    expect(swipe.offset).toBe(direction * 50);
    expect(swipe.target).toBe(4 - direction);
    expect(swipe.committed).toBe(false);
    swipe.move(200 + direction * 115, 305);
    expect(swipe.committed).toBe(true);
    swipe.move(200 - direction * 180, 305);
    expect(swipe.target).toBe(4 - direction);
  }
});

it("locks vertical and diagonal scrolling out of navigation", () => {
  for (const dx of [3, 19]) {
    const swipe = new ChapterSwipeGesture(200, 300, 390, 4, 28);
    swipe.move(200 + dx, 320);
    swipe.move(20, 330);
    expect(swipe.axis).toBe("vertical");
    expect(swipe.offset).toBe(0);
    expect(swipe.committed).toBe(false);
  }
});

it("resists swipes past book boundaries without navigating", () => {
  for (const [chapter, dx] of [[1, 180], [28, -180]]) {
    const swipe = new ChapterSwipeGesture(200, 300, 390, chapter, 28);
    swipe.move(200 + dx, 300);
    expect(swipe.target).toBeNull();
    expect(swipe.committed).toBe(false);
    expect(Math.abs(swipe.offset)).toBeLessThanOrEqual(32);
  }
});

it("ignores tap jitter and permits reversal before committing", () => {
  const swipe = new ChapterSwipeGesture(200, 300, 390, 4, 28);
  swipe.move(204, 302);
  expect(swipe.axis).toBe("pending");
  swipe.move(250, 302);
  swipe.move(150, 302);
  expect(swipe.target).toBe(5);
  expect(swipe.committed).toBe(false);
});
