"use server";

import { redirect } from "next/navigation";
import {
  createSession,
  destroySession,
  isSessionStorageAvailable,
} from "@/lib/auth/session";
import {
  createUser,
  getUser,
  isAuthStorageAvailable,
  verifyPassword,
} from "@/lib/auth/users";

export type AuthFormState = {
  error?: string;
};

const USERNAME_RE = /^[a-zA-Z0-9]{3,20}$/;

function validateUsername(raw: string): string | null {
  const u = raw.trim();
  if (!USERNAME_RE.test(u)) return null;
  return u;
}

function validatePassword(raw: string): string | null {
  const p = raw;
  if (p.length < 8) return null;
  return p;
}

export async function signup(
  _prev: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const usernameRaw = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  const username = validateUsername(usernameRaw);
  const pw = validatePassword(password);
  if (!username) {
    return {
      error:
        "Benutzername: 3–20 Zeichen, nur Buchstaben und Ziffern (keine Leerzeichen).",
    };
  }
  if (!pw) {
    return { error: "Passwort muss mindestens 8 Zeichen haben." };
  }

  if (!isAuthStorageAvailable() || !isSessionStorageAvailable()) {
    return {
      error:
        "Anmeldung ist gerade nicht möglich (Redis nicht konfiguriert). Bitte später erneut versuchen.",
    };
  }

  const created = await createUser(username, pw);
  if (!created.ok) {
    if (created.error === "taken") {
      return { error: "Dieser Benutzername ist schon vergeben." };
    }
    return { error: "Registrierung fehlgeschlagen. Bitte erneut versuchen." };
  }

  await createSession(username);
  redirect("/read");
}

export async function login(
  _prev: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const usernameRaw = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  const username = validateUsername(usernameRaw);
  if (!username || !password) {
    return { error: "Ungültiger Benutzername oder Passwort." };
  }

  if (!isSessionStorageAvailable()) {
    return {
      error:
        "Anmeldung ist gerade nicht möglich (Redis nicht konfiguriert). Bitte später erneut versuchen.",
    };
  }

  const user = await getUser(username);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Ungültiger Benutzername oder Passwort." };
  }

  await createSession(user.username);
  redirect("/read");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
