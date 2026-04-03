import {
  dispatchBuildFeature,
  getGithubToken,
  getRepoParts,
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

  let body: { id?: string; description?: string };
  try {
    body = (await request.json()) as { id?: string; description?: string };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = body.id?.trim();
  const description = body.description?.trim();
  if (!id || !description) {
    return Response.json({ error: "id and description required" }, { status: 400 });
  }

  try {
    await dispatchBuildFeature(token, id, description);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "dispatch failed";
    return Response.json({ error: msg }, { status: 502 });
  }

  return Response.json({ ok: true });
}
