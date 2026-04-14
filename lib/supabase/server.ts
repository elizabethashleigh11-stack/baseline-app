import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Creates a Supabase client for use in Server Components or Route Handlers.
 * Reads the auth token from cookies so the server can act on behalf of the
 * signed-in user (respecting RLS policies).
 *
 * Usage (Server Component):
 *   const supabase = await createServerClient();
 */
export async function createServerClient() {
  const cookieStore = await cookies();

  // Supabase stores the access token in a cookie named sb-<project-ref>-auth-token
  // or as individual parts.  Reading the raw value lets us forward the token.
  const accessToken = cookieStore
    .getAll()
    .find((c) => c.name.endsWith("-auth-token"))?.value;

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {},
    },
    auth: {
      // Disable automatic session storage in server context
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  return client;
}
