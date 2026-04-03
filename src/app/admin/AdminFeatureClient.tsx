"use client";

import { useEffect, useState } from "react";
import BuilderPage from "@/app/BuilderPage";
import {
  adminFetchInit,
  clearAdminSecret,
  getAdminSecret,
  setAdminSecret,
} from "@/lib/admin-client";

function AdminProductionPanel() {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  async function handleDeploy() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(
        "/api/deploy-production",
        adminFetchInit({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: draft.trim() }),
        }),
      );
      if (res.ok) {
        setToast("Production-Deploy wurde in GitHub Actions gestartet.");
        setDraft("");
      } else {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setToast(j.error ?? "Anfrage fehlgeschlagen");
      }
    } catch {
      setToast("Netzwerkfehler");
    }
    setBusy(false);
    setTimeout(() => setToast(""), 5000);
  }

  return (
    <section
      className="border-b border-zinc-200 bg-zinc-50 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950"
      aria-labelledby="admin-prod-heading"
    >
      <h2
        id="admin-prod-heading"
        className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
      >
        Production-Deploy
      </h2>
      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
        Beschreib kurz, was Du auslieferst — der Text erscheint in der Summary des Workflows{" "}
        <span className="font-mono">Deploy Production</span> auf GitHub. Der Deploy baut{" "}
        <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">main</code> und schiebt ihn
        zu Vercel Production.
      </p>
      <textarea
        className="mt-3 w-full resize-none rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
        rows={3}
        placeholder="z. B. Neues Admin-Panel, Bugfix Lesefortschritt …"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        disabled={busy}
      />
      <button
        type="button"
        onClick={handleDeploy}
        disabled={busy}
        className="mt-2 w-full rounded-xl bg-amber-600 py-2 text-sm font-medium text-white min-h-[44px] hover:bg-amber-500 disabled:bg-zinc-400 dark:disabled:bg-zinc-600"
      >
        {busy ? "Starte…" : "Deploy Production auslösen"}
      </button>
      {toast && (
        <p className="mt-2 text-xs text-zinc-700 dark:text-zinc-300" role="status">
          {toast}
        </p>
      )}
    </section>
  );
}

export function AdminFeatureClient() {
  const [secretInput, setSecretInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (getAdminSecret()) setUnlocked(true);
  }, []);

  function tryUnlock() {
    setAdminSecret(secretInput);
    setUnlocked(true);
  }

  function lock() {
    clearAdminSecret();
    setSecretInput("");
    setUnlocked(false);
  }

  if (!unlocked) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-3 px-4 py-16">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Admin</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Gib das Admin-Geheimnis ein (wie <code className="font-mono">ADMIN_FEATURE_SECRET</code>{" "}
          auf dem Server). Es wird nur in dieser Sitzung im Browser gespeichert.
        </p>
        <input
          type="password"
          autoComplete="off"
          className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          value={secretInput}
          onChange={(e) => setSecretInput(e.target.value)}
          placeholder="Admin-Geheimnis"
        />
        <button
          type="button"
          onClick={tryUnlock}
          className="rounded-xl bg-zinc-900 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Fortfahren
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
        <h1 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Admin</h1>
        <button
          type="button"
          onClick={lock}
          className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          Abmelden
        </button>
      </div>
      <AdminProductionPanel />
      <div className="min-h-0 flex-1">
        <BuilderPage />
      </div>
    </div>
  );
}
