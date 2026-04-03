import {
  dispatchDeployProductionWorkflow,
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

  let body: { description?: string };
  try {
    body = (await request.json()) as { description?: string };
  } catch {
    body = {};
  }

  const description = (body.description ?? "").trim();

  try {
    await dispatchDeployProductionWorkflow(token, description);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "workflow dispatch failed";
    return Response.json({ error: msg }, { status: 502 });
  }

  return Response.json({ ok: true });
}
