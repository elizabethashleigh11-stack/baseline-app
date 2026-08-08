import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

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

export function proxy(request: NextRequest) {
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
