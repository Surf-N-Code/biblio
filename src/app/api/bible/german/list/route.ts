import { NextResponse } from "next/server";
import { listGermanBibleFiles } from "@/lib/bible/de-local";

export const runtime = "nodejs";

export async function GET() {
  const files = listGermanBibleFiles();
  return NextResponse.json({
    files: files.map((f) => ({
      id: f,
      label: f.replace(/\.txt$/i, "").replace(/^de_/, ""),
    })),
  });
}
