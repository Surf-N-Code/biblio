import { expect, it } from "vitest";
import {
  buildBibleAiUserContent,
  parseBibleAiBody,
} from "@/lib/ai/bible-prompt-context";

it("builds user content with selected verses and full chapter", () => {
  const content = buildBibleAiUserContent({
    reference: "Genesis 1:1",
    selectedPassage: "1 In the beginning",
    chapterText: "1 In the beginning\n2 The earth was without form",
    bookName: "Genesis",
  });
  expect(content).toContain("Ausgewählte Stelle (Fokus): Genesis 1:1");
  expect(content).toContain("1 In the beginning");
  expect(content).toContain("Ganzes Kapitel (Genesis):");
  expect(content).toContain("2 The earth was without form");
});

it("parses AI request bodies with chapter text", () => {
  expect(
    parseBibleAiBody({
      reference: "Genesis 1:1",
      passage: "1 In the beginning",
      chapterText: "1 In the beginning\n2 And the earth",
      bookName: "Genesis",
    }),
  ).toEqual({
    reference: "Genesis 1:1",
    selectedPassage: "1 In the beginning",
    chapterText: "1 In the beginning\n2 And the earth",
    bookName: "Genesis",
  });
});

it("rejects invalid AI request bodies", () => {
  expect(parseBibleAiBody({ reference: "", passage: "x" })).toBeNull();
  expect(parseBibleAiBody({ reference: "Genesis 1:1", passage: "" })).toBeNull();
});
