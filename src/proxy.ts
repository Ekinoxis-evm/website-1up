import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const { pathname } = request.nextUrl;

  // Strip port for local dev (e.g. localhost:3000)
  const hostname = host.split(":")[0];

  const isApp =
    hostname === "app.1upesports.org" ||
    hostname === "app.localhost";

  const isAdmin =
    hostname === "admin.1upesports.org" ||
    hostname === "admin.localhost";

  // Never rewrite API or internal Next.js paths — let them resolve as-is
  const isInternal = pathname.startsWith("/api") || pathname.startsWith("/_next");

  if (isApp && !isInternal) {
    // app.1upesports.org/* → /app/*
    const appPath = pathname === "/" ? "/app" : `/app${pathname}`;
    return NextResponse.rewrite(new URL(appPath, request.url));
  }

  if (isAdmin && !isInternal) {
    // admin.1upesports.org/* → /admin/*
    const adminPath = pathname === "/" ? "/admin" : `/admin${pathname}`;
    return NextResponse.rewrite(new URL(adminPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
