import {
  computeBuildStatus,
  getGithubToken,
  getRepoParts,
  requireAdmin,
} from "@/lib/github-admin";

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const token = getGithubToken();
  if (!token || !getRepoParts()) {
    return Response.json(
      { error: "GITHUB_TOKEN and GITHUB_REPO must be set" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const branchName = searchParams.get("branchName")?.trim();
  if (!branchName) {
    return Response.json({ error: "branchName required" }, { status: 400 });
  }

  try {
    const payload = await computeBuildStatus(token, branchName);
    return Response.json(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "status failed";
    return Response.json({ error: msg }, { status: 502 });
  }
}
