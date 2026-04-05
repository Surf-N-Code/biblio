"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { login, signup } from "@/app/actions/auth";
import type { AuthFormState } from "@/app/actions/auth";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginState, loginAction, loginPending] = useActionState<
    AuthFormState | undefined,
    FormData
  >(login, undefined);
  const [signupState, signupAction, signupPending] = useActionState<
    AuthFormState | undefined,
    FormData
  >(signup, undefined);

  const state = mode === "login" ? loginState : signupState;
  const pending = mode === "login" ? loginPending : signupPending;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {mode === "login" ? "Anmelden" : "Registrieren"}
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {mode === "login"
          ? "Melde Dich an, um KI-Hilfen und synchronisierten Lesefortschritt zu nutzen."
          : "Lege ein Konto an (nur für wenige Nutzer gedacht). Benutzername und Passwort wählst Du selbst."}
      </p>

      <div
        className="mt-6 flex rounded-lg border border-zinc-200 p-1 dark:border-zinc-800"
        role="tablist"
        aria-label="Anmeldung oder Registrierung"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "login"}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === "login"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
          onClick={() => setMode("login")}
        >
          Anmelden
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signup"}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === "signup"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
          onClick={() => setMode("signup")}
        >
          Registrieren
        </button>
      </div>

      {state?.error ? (
        <p
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      {mode === "login" ? (
        <form action={loginAction} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="login-username"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Benutzername
            </label>
            <input
              id="login-username"
              name="username"
              type="text"
              autoComplete="username"
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none ring-zinc-400 focus:border-zinc-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-500"
            />
          </div>
          <div>
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Passwort
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none ring-zinc-400 focus:border-zinc-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-500"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {pending ? "…" : "Anmelden"}
          </button>
        </form>
      ) : (
        <form action={signupAction} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="signup-username"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Benutzername
            </label>
            <input
              id="signup-username"
              name="username"
              type="text"
              autoComplete="username"
              required
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9]{3,20}"
              title="3–20 Zeichen, nur Buchstaben und Ziffern"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none ring-zinc-400 focus:border-zinc-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-500"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              3–20 Zeichen, nur Buchstaben und Ziffern.
            </p>
          </div>
          <div>
            <label
              htmlFor="signup-password"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Passwort
            </label>
            <input
              id="signup-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none ring-zinc-400 focus:border-zinc-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-500"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              Mindestens 8 Zeichen.
            </p>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {pending ? "…" : "Konto anlegen"}
          </button>
        </form>
      )}

      <p className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
        <Link
          href="/read"
          className="font-medium text-zinc-800 underline-offset-2 hover:underline dark:text-zinc-200"
        >
          ← Ohne Anmeldung weiterlesen
        </Link>
      </p>
    </div>
  );
}
