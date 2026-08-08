import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * SLA Cron Job — marks overdue SLA events as permanently unmet.
 *
 * Intended to be called on a schedule (e.g., every hour via Vercel Cron or
 * an external scheduler).  Requires the SUPABASE_SERVICE_ROLE_KEY environment
 * variable so that it can bypass RLS and write to sla_events.
 *
 * Protect this route with a shared secret:
 *   curl -H "Authorization: ******" /api/sla/cron
 */

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: Request) {
  // Require CRON_SECRET to be configured; reject all requests when it is absent.
  if (!CRON_SECRET) {
    return NextResponse.json(
      { error: "Cron secret not configured. Set CRON_SECRET to enable this endpoint." },
      { status: 503 }
    );
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (token !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Server misconfiguration: missing Supabase credentials." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Mark every unresolved event whose deadline has passed as permanently unmet.
  const { error, count } = await supabase
    .from("sla_events")
    .update({ met: false, resolved_at: new Date().toISOString() })
    .eq("met", false)
    .is("resolved_at", null)
    .lt("deadline_at", new Date().toISOString());

  if (error) {
    console.error("[sla/cron] update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    overdue_marked: count ?? 0,
    ran_at: new Date().toISOString(),
  });
}
