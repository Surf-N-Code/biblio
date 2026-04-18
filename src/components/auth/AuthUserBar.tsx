import { logout } from "@/app/actions/auth";
import { getSession } from "@/lib/auth/session";

export async function AuthUserBar() {
  const session = await getSession();

  if (!session) {
    return (
      <a
        href="/login"
        className="rounded-md border border-zinc-300 bg-white/90 px-2.5 py-1.5 text-xs font-medium text-zinc-800 shadow-sm backdrop-blur-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900/90 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        Anmelden
      </a>
    );
  }

  const { username } = session;

  return (
    <div className="flex max-w-[min(100vw-6rem,14rem)] flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
      <span className="truncate text-xs text-zinc-600 dark:text-zinc-400" title={username}>
        <span className="hidden sm:inline">Angemeldet als </span>
        <strong className="text-zinc-900 dark:text-zinc-100">{username}</strong>
      </span>
      <form action={logout}>
        <button
          type="submit"
          className="rounded-md border border-zinc-300 bg-white/90 px-2.5 py-1.5 text-xs font-medium text-zinc-800 shadow-sm backdrop-blur-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900/90 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          Abmelden
        </button>
      </form>
    </div>
  );
}
