import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * Route protection at the network boundary.
 *
 * In Next.js 16 `middleware.ts` is renamed to `proxy.ts` and the exported
 * function is `proxy`. It runs on the Node.js runtime only.
 *
 * URLs deliberately keep the original React Router casing (/Events, /Team,
 * /Login, /PrivacyPolicy …) so the replica is indistinguishable from the old
 * site — including in the address bar. Lowercase variants are redirected to the
 * canonical casing so hand-typed URLs still resolve.
 *
 * Pages authorise independently; this is a fast gate, not the authority.
 */

/** lowercase pathname -> canonical casing used by the app. */
const CANONICAL = new Map<string, string>([
  ["/events", "/Events"],
  ["/events/pastevents", "/Events/pastEvents"],
  ["/pastevents", "/Events/pastEvents"],
  ["/team", "/Team"],
  ["/blog", "/Insights"],
  ["/insights", "/Insights"],
  ["/social", "/Insights"],
  ["/alumni", "/Alumni"],
  ["/login", "/Login"],
  ["/signup", "/SignUp"],
  ["/forgotpassword", "/ForgotPassword"],
  ["/forgot-password", "/ForgotPassword"],
  ["/privacypolicy", "/PrivacyPolicy"],
  ["/privacy-policy", "/PrivacyPolicy"],
  ["/termsandconditions", "/TermsAndConditions"],
  ["/terms-and-conditions", "/TermsAndConditions"],
  ["/completeprofile", "/completeProfile"],
  ["/complete-profile", "/completeProfile"],
]);

const PROTECTED_PREFIXES = ["/profile"];

const AUTH_ONLY = new Set([
  "/Login",
  "/SignUp",
  "/ForgotPassword",
  "/completeProfile",
  "/otp",
]);

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get("token")?.value;
  if (!token) return false;

  const secret = process.env.JWT_SECRET;
  if (!secret) return false;

  try {
    await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1. Normalise casing. The comparison is explicit rather than a redirect rule
  //    in next.config.ts, because Next matches redirect `source` patterns
  //    case-insensitively — "/Events" -> "/events" would also match "/events"
  //    and loop forever.
  const canonical = CANONICAL.get(pathname.toLowerCase());
  if (canonical && canonical !== pathname) {
    const url = new URL(canonical, request.url);
    url.search = search;
    return NextResponse.redirect(url, 308);
  }

  // 2. Route protection.
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) =>
      pathname === prefix || pathname.toLowerCase().startsWith(`${prefix}/`),
  );
  const isAuthOnly = AUTH_ONLY.has(pathname);

  if (!isProtected && !isAuthOnly) return NextResponse.next();

  const authenticated = await hasValidSession(request);

  if (isProtected && !authenticated) {
    const login = new URL("/Login", request.url);
    login.searchParams.set("next", `${pathname}${search}`);
    const response = NextResponse.redirect(login);
    if (request.cookies.has("token")) response.cookies.delete("token");
    return response;
  }

  if (isAuthOnly && authenticated) {
    const next = request.nextUrl.searchParams.get("next");
    const target =
      next && next.startsWith("/") && !next.startsWith("//") ? next : "/profile";
    return NextResponse.redirect(new URL(target, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/|_next/static/|_next/image/|favicon.ico|robots.txt|sitemap.xml|opengraph-image).*)",
  ],
};
