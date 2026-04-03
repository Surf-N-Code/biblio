import {
  getGithubToken,
  getRepoParts,
  mergePull,
  requireAdmin,
} from "@/lib/github-admin";

export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const token = getGithubToken();
  if (!token || !getRepoParts()) {
    return Response.json(
      { error: "GITHUB_TOKEN and GITHUB_REPO must be set" },
      { status: 503 },
    );
  }

  let body: { prNumber?: number };
  try {
    body = (await request.json()) as { prNumber?: number };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const prNumber = body.prNumber;
  if (typeof prNumber !== "number" || prNumber < 1) {
    return Response.json({ error: "prNumber required" }, { status: 400 });
  }

  try {
    await mergePull(token, prNumber);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "merge failed";
    return Response.json({ error: msg }, { status: 502 });
  }

  return Response.json({ ok: true });
}
