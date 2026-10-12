import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";

/**
 * Guards the owner's dashboard. Without ADMIN_PASSWORD set, /admin simply
 * does not exist — there is no default password to guess.
 */
function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function proxy(req: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return new NextResponse("Not found", { status: 404 });
  }

  const user = process.env.ADMIN_USER || "saf";
  const header = req.headers.get("authorization") ?? "";

  if (header.startsWith("Basic ")) {
    const decoded = Buffer.from(header.slice(6), "base64").toString();
    const i = decoded.indexOf(":");
    if (i > 0 && same(decoded.slice(0, i), user) && same(decoded.slice(i + 1), password)) {
      const res = NextResponse.next();
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
      res.headers.set("Cache-Control", "no-store");
      return res;
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="GetWebPage dashboard", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/admin/:path*"],
};
