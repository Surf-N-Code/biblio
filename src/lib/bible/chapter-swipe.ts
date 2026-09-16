export class ChapterSwipeGesture {
  axis: "pending" | "horizontal" | "vertical" = "pending";
  committed = false;
  offset = 0;
  target: number | null = null;
  readonly threshold: number;

  constructor(readonly x: number, readonly y: number, readonly width: number, readonly chapter: number, readonly maxChapter: number) {
    this.threshold = Math.min(128, Math.max(72, width * 0.28));
  }

  move(x: number, y: number) {
    if (this.committed || this.axis === "vertical") return;
    const dx = x - this.x;
    const dy = y - this.y;
    if (this.axis === "pending") {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 10) return;
      this.axis = Math.abs(dx) > Math.abs(dy) * 1.25 ? "horizontal" : "vertical";
    }
    if (this.axis !== "horizontal") return;
    const next = this.chapter + (dx < 0 ? 1 : -1);
    this.target = next >= 1 && next <= this.maxChapter ? next : null;
    this.offset = this.target === null ? Math.sign(dx) * Math.min(32, Math.abs(dx) * 0.18) : dx;
    this.committed = this.target !== null && Math.abs(dx) >= this.threshold;
  }
}
