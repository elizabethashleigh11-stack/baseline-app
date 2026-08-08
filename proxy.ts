import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const protectionEnabled =
  process.env.SITE_PASSWORD_PROTECTION_ENABLED === "true";
const accessUsername = process.env.SITE_ACCESS_USERNAME;
const accessPassword = process.env.SITE_ACCESS_PASSWORD;

function timingSafeEqual(a: string, b: string) {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  const maxLength = Math.max(aBytes.length, bBytes.length);

  const paddedA = new Uint8Array(maxLength);
  const paddedB = new Uint8Array(maxLength);
  paddedA.set(aBytes);
  paddedB.set(bBytes);

  let mismatch = aBytes.length ^ bBytes.length;
  for (let index = 0; index < maxLength; index += 1) {
    mismatch |= paddedA[index] ^ paddedB[index];
  }

  return mismatch === 0;
}

function unauthorized() {
  return new Response("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Restricted Area", charset="UTF-8"',
    },
  });
}

/**
 * Guard for /court-portal/* routes.
 * Allows /court-portal/login through; all other sub-paths require the user to
 * have a valid row in professional_access.
 */
async function guardCourtPortal(
  request: NextRequest
): Promise<NextResponse | Response | null> {
  const { pathname } = request.nextUrl;

  if (pathname === "/court-portal/login") {
    return null; // allow through
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(new URL("/court-portal/login", request.url));
  }

  const accessToken = request.cookies
    .getAll()
    .find((c) => c.name.endsWith("-auth-token"))?.value;

  if (!accessToken) {
    return NextResponse.redirect(new URL("/court-portal/login", request.url));
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: "Bearer " + accessToken },
    },
    auth: { persistSession: false, detectSessionInUrl: false },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/court-portal/login", request.url));
  }

  const { count } = await supabase
    .from("professional_access")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

  if (!count || count === 0) {
    return NextResponse.redirect(new URL("/court-portal/login", request.url));
  }

  return null; // allow through
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Court portal access guard ---
  if (pathname.startsWith("/court-portal")) {
    const guardResponse = await guardCourtPortal(request);
    if (guardResponse) return guardResponse;
    // If no site-wide protection is enabled, let the request through now.
    if (!protectionEnabled) return NextResponse.next();
  }

  // --- Site-wide Basic-Auth protection (optional) ---
  if (!protectionEnabled) {
    return NextResponse.next();
  }

  if (!accessUsername || !accessPassword) {
    return new Response("Password protection is misconfigured.", {
      status: 500,
    });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Basic ")) {
    return unauthorized();
  }

  const credentials = authHeader.slice("Basic ".length).trim();

  try {
    const decodedCredentials = atob(credentials);
    const separator = decodedCredentials.indexOf(":");

    if (separator < 0) {
      return unauthorized();
    }

    const username = decodedCredentials.slice(0, separator);
    const password = decodedCredentials.slice(separator + 1);

    const usernameMatches = timingSafeEqual(username, accessUsername);
    const passwordMatches = timingSafeEqual(password, accessPassword);

    if (!(usernameMatches && passwordMatches)) {
      return unauthorized();
    }
  } catch {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};

