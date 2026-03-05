import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_FILE = /\.(.*)$/;
const PUBLIC_ROUTES = [
  "/login",
  "/admin/login",
  "/tenant-signup",
  "/landlord-signup",
  "/org-signup",
  "/agent-invite",
  "/create-account",
  "/auth",
];

const SESSION_COOKIE = "gar_session";
const JWT_SECRET = process.env.JWT_SECRET || "";

const LANDLORD_ONLY = [
  "/dashboard",
  "/add-property-details",
  "/add-property-photos",
  "/add-property-preferences",
  "/add-property-requirements",
  "/add-property-review",
  "/address-bill-verification",
  "/verify-identity",
  "/facial-verification",
];

const TENANT_ONLY = [
  "/explore",
  "/map-view",
  "/matches",
  "/messages",
  "/profile",
  "/property-details",
  "/tenant-onboarding",

];

const ADMIN_ONLY = ["/admin"];

const isPublicRoute = (pathname: string) =>
  PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  if (PUBLIC_FILE.test(pathname)) {
    return NextResponse.next();
  }

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return handleRoleRouting(request, session);
}

async function handleRoleRouting(request: NextRequest, token: string) {
  const { pathname } = request.nextUrl;
  const role = await resolveRole(token);
  if (!role) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return response;
  }

  const isLandlord = role === "landlord" || role === "organisation";
  const isTenant = role === "tenant";
  const isAdmin = role === "admin";
  const isLandlordRoute = LANDLORD_ONLY.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  const isTenantRoute = TENANT_ONLY.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  const isAdminRoute = ADMIN_ONLY.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isAdmin && (isLandlordRoute || isTenantRoute)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin";
    return NextResponse.redirect(redirectUrl);
  }

  if (isAdminRoute && !isAdmin) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = isLandlord ? "/dashboard/properties" : "/explore";
    return NextResponse.redirect(redirectUrl);
  }

  if (isLandlord && isTenantRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard/properties";
    return NextResponse.redirect(redirectUrl);
  }

  if (isTenant && isLandlordRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/explore";
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

async function resolveRole(token: string) {
  if (!JWT_SECRET) {
    return null;
  }
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return extractRole(payload?.role);
  } catch {
    return null;
  }
}

function extractRole(rawRole: unknown) {
  const roles = Array.isArray(rawRole) ? rawRole : rawRole ? [rawRole] : [];
  const normalized = roles
    .map((role) => role?.toString().toLowerCase())
    .filter(Boolean);
  if (normalized.includes("admin")) return "admin";
  if (normalized.includes("landlord")) return "landlord";
  if (normalized.includes("organisation")) return "organisation";
  if (normalized.includes("tenant")) return "tenant";
  return null;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
