import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/read/fortschritt" || pathname.startsWith("/read/fortschritt/")) {
    const session = await getSessionFromRequest(request);
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", "/read/fortschritt");
      return NextResponse.redirect(url);
    }
  }

  if (pathname === "/login" || pathname.startsWith("/login/")) {
    const session = await getSessionFromRequest(request);
    if (session) {
      return NextResponse.redirect(new URL("/read", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/read/fortschritt", "/read/fortschritt/:path*", "/login", "/login/:path*"],
};
