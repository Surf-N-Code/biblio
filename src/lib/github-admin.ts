const GH_API = "https://api.github.com";

export function getRepoParts(): { owner: string; repo: string } | null {
  const raw = process.env.GITHUB_REPO?.trim();
  if (!raw?.includes("/")) return null;
  const [owner, repo] = raw.split("/");
  if (!owner || !repo) return null;
  return { owner, repo };
}

export function githubHeaders(token: string): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export function getGithubToken(): string | null {
  const t = process.env.GITHUB_TOKEN?.trim();
  return t || null;
}

export function requireAdmin(request: Request): Response | null {
  const secret = process.env.ADMIN_FEATURE_SECRET?.trim();
  if (!secret) {
    if (process.env.VERCEL === "1") {
      return Response.json(
        { error: "ADMIN_FEATURE_SECRET is not configured" },
        { status: 503 },
      );
    }
    return null;
  }
  if (request.headers.get("x-admin-secret") !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function dispatchBuildFeature(
  token: string,
  id: string,
  description: string,
): Promise<void> {
  const parts = getRepoParts();
  if (!parts) throw new Error("GITHUB_REPO is not set");
  const res = await fetch(
    `${GH_API}/repos/${parts.owner}/${parts.repo}/dispatches`,
    {
      method: "POST",
      headers: {
        ...githubHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_type: "build-feature",
        client_payload: { id, description },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`repository_dispatch failed: ${res.status} ${await res.text()}`);
  }
}

export async function dispatchDeployProductionWorkflow(
  token: string,
  featureDescription: string,
): Promise<void> {
  const parts = getRepoParts();
  if (!parts) throw new Error("GITHUB_REPO is not set");
  const desc = featureDescription.trim().slice(0, 3500);
  const res = await fetch(
    `${GH_API}/repos/${parts.owner}/${parts.repo}/actions/workflows/deploy-production.yml/dispatches`,
    {
      method: "POST",
      headers: {
        ...githubHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: "main",
        inputs: {
          feature_description: desc || "Manual production deploy",
        },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`workflow_dispatch failed: ${res.status} ${await res.text()}`);
  }
}

type PullLite = {
  number: number;
  html_url: string;
  state: string;
  merged: boolean;
};

type WorkflowRunLite = {
  status: string | null;
  conclusion: string | null;
  html_url: string;
};

export async function findPullForBranch(
  token: string,
  branch: string,
): Promise<PullLite | null> {
  const parts = getRepoParts();
  if (!parts) return null;
  const head = `${parts.owner}:${branch}`;
  const url = `${GH_API}/repos/${parts.owner}/${parts.repo}/pulls?head=${encodeURIComponent(head)}&state=all&per_page=5`;
  const res = await fetch(url, { headers: githubHeaders(token) });
  if (!res.ok) return null;
  const data = (await res.json()) as PullLite[];
  return data[0] ?? null;
}

export async function getLatestBuildFeatureRun(
  token: string,
  branch: string,
): Promise<WorkflowRunLite | null> {
  const parts = getRepoParts();
  if (!parts) return null;
  const url = `${GH_API}/repos/${parts.owner}/${parts.repo}/actions/workflows/build-feature.yml/runs?branch=${encodeURIComponent(branch)}&per_page=1`;
  const res = await fetch(url, { headers: githubHeaders(token) });
  if (!res.ok) return null;
  const json = (await res.json()) as { workflow_runs?: WorkflowRunLite[] };
  return json.workflow_runs?.[0] ?? null;
}

export async function mergePull(token: string, prNumber: number): Promise<void> {
  const parts = getRepoParts();
  if (!parts) throw new Error("GITHUB_REPO is not set");
  const res = await fetch(
    `${GH_API}/repos/${parts.owner}/${parts.repo}/pulls/${prNumber}/merge`,
    {
      method: "PUT",
      headers: {
        ...githubHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ merge_method: "squash" }),
    },
  );
  if (!res.ok) {
    throw new Error(`merge failed: ${res.status} ${await res.text()}`);
  }
}

export async function closePull(token: string, prNumber: number): Promise<void> {
  const parts = getRepoParts();
  if (!parts) throw new Error("GITHUB_REPO is not set");
  const res = await fetch(
    `${GH_API}/repos/${parts.owner}/${parts.repo}/pulls/${prNumber}`,
    {
      method: "PATCH",
      headers: {
        ...githubHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ state: "closed" }),
    },
  );
  if (!res.ok) {
    throw new Error(`close PR failed: ${res.status} ${await res.text()}`);
  }
}

export type BuildStatusPayload = {
  status:
    | "pending"
    | "building"
    | "ready"
    | "approved"
    | "deployed"
    | "rejected"
    | "failed";
  buildStep: string | null;
  prNumber: number | null;
  prUrl: string | null;
  previewUrl: string | null;
};

export async function computeBuildStatus(
  token: string,
  branchName: string,
): Promise<BuildStatusPayload> {
  const pr = await findPullForBranch(token, branchName);
  const run = await getLatestBuildFeatureRun(token, branchName);

  if (pr?.merged) {
    return {
      status: "deployed",
      buildStep: "Merged to main — production deploy should run via GitHub Actions",
      prNumber: pr.number,
      prUrl: pr.html_url,
      previewUrl: pr.html_url,
    };
  }

  if (pr?.state === "closed" && !pr.merged) {
    return {
      status: "rejected",
      buildStep: "PR closed without merging",
      prNumber: pr.number,
      prUrl: pr.html_url,
      previewUrl: pr.html_url,
    };
  }

  if (pr?.state === "open") {
    return {
      status: "ready",
      buildStep: "PR open — review, then Approve to merge",
      prNumber: pr.number,
      prUrl: pr.html_url,
      previewUrl: pr.html_url,
    };
  }

  if (run) {
    if (run.status === "in_progress" || run.status === "queued" || run.status === "waiting") {
      return {
        status: "building",
        buildStep: `Workflow: ${run.status}`,
        prNumber: pr?.number ?? null,
        prUrl: pr?.html_url ?? null,
        previewUrl: pr?.html_url ?? null,
      };
    }
    if (run.conclusion === "failure" || run.conclusion === "cancelled" || run.conclusion === "timed_out") {
      return {
        status: "failed",
        buildStep: `Workflow finished: ${run.conclusion ?? "unknown"}`,
        prNumber: pr?.number ?? null,
        prUrl: pr?.html_url ?? null,
        previewUrl: run.html_url,
      };
    }
    if (run.conclusion === "success" && !pr) {
      return {
        status: "building",
        buildStep: "Workflow succeeded — creating PR…",
        prNumber: null,
        prUrl: null,
        previewUrl: run.html_url,
      };
    }
  }

  return {
    status: "pending",
    buildStep: "Queued — waiting for GitHub Action",
    prNumber: null,
    prUrl: null,
    previewUrl: null,
  };
}
