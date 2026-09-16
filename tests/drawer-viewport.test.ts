import { expect, it } from "vitest";
import { drawerViewportBounds, focusedControlScrollDelta } from "@/lib/bible/drawer-viewport";

it("fits above the keyboard even when Safari pans the visual viewport", () => {
  expect(drawerViewportBounds(844, 360, 100)).toEqual({ maxHeight: 344, bottom: 384 });
  expect(drawerViewportBounds(844, 844, 0)).toEqual({ maxHeight: 828, bottom: 0 });
});

it("brings fields back from either edge without moving fields already visible", () => {
  expect(focusedControlScrollDelta(480, 600, 116, 444)).toBe(156);
  expect(focusedControlScrollDelta(50, 170, 116, 444)).toBe(-66);
  expect(focusedControlScrollDelta(150, 270, 116, 444)).toBe(0);
  expect(focusedControlScrollDelta(140, 740, 116, 444)).toBe(24);
});
