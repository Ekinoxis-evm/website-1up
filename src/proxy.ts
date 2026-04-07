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
    // Strip /app prefix if links include it (e.g. app.1upesports.org/app/identidad → /app/identidad)
    const clean = pathname === "/app" || pathname.startsWith("/app/")
      ? pathname.slice(4) || "/"
      : pathname;
    const appPath = clean === "/" ? "/app" : `/app${clean}`;
    return NextResponse.rewrite(new URL(appPath, request.url));
  }

  if (isAdmin && !isInternal) {
    // Strip /admin prefix if links include it (e.g. admin.1upesports.org/admin/courses → /admin/courses)
    const clean = pathname === "/admin" || pathname.startsWith("/admin/")
      ? pathname.slice(6) || "/"
      : pathname;
    const adminPath = clean === "/" ? "/admin" : `/admin${clean}`;
    return NextResponse.rewrite(new URL(adminPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
