import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { randomBytes, createHmac } from "crypto";

const SHARE_TOKEN_SECRET = process.env.SHARE_TOKEN_SECRET;
const SHARE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Sign a share token so it cannot be forged. Throws if SHARE_TOKEN_SECRET is not set. */
function signToken(payload: string): string {
  if (!SHARE_TOKEN_SECRET) {
    throw new Error("SHARE_TOKEN_SECRET environment variable is not set.");
  }
  return createHmac("sha256", SHARE_TOKEN_SECRET)
    .update(payload)
    .digest("hex");
}

/** Build a short-lived share token that encodes the user + expiry.
 *  Note: the token is time-limited (7 days) but not single-use.
 *  For single-use enforcement a nonce-tracking store would be required.
 */
function createShareToken(userId: string): string {
  const nonce = randomBytes(8).toString("hex");
  const expiresAt = Date.now() + SHARE_TOKEN_TTL_MS;
  const payload = `${userId}:${expiresAt}:${nonce}`;
  const sig = signToken(payload);
  // Encode as base64url so it survives URL embedding
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export async function GET(req: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const since = searchParams.get("since"); // optional ISO date e.g. "2024-01-01"
    const format = searchParams.get("format") ?? "json"; // "json" | "summary"

    // --- Fetch only this user's reflections (RLS enforces user_id = auth.uid()) ---
    let reflectionsQuery = supabase
      .from("reflections")
      .select("entry_date, text, tags, updated_at")
      .order("entry_date", { ascending: false });

    if (since) {
      reflectionsQuery = reflectionsQuery.gte("entry_date", since);
    }

    const { data: reflections, error: reflErr } = await reflectionsQuery;
    if (reflErr) throw reflErr;

    // --- Fetch AI flag tallies (strict silo — only this user's rows via RLS) ---
    let urQuery = supabase
      .from("user_reflections")
      .select("analysis_date, flag_count, flag_breakdown, tone_score, ai_summary")
      .order("analysis_date", { ascending: false });

    if (since) {
      urQuery = urQuery.gte("analysis_date", since);
    }

    const { data: userReflections, error: urErr } = await urQuery;
    if (urErr) throw urErr;

    // --- Aggregate summary ---
    const totalFlags = (userReflections ?? []).reduce(
      (sum, r) => sum + (r.flag_count ?? 0),
      0
    );
    const avgTone =
      (userReflections ?? []).length > 0
        ? (userReflections ?? []).reduce(
            (sum, r) => sum + (Number(r.tone_score) || 0),
            0
          ) / (userReflections ?? []).length
        : null;

    // Flatten flag breakdown totals
    const flagBreakdownTotals: Record<string, number> = {};
    for (const r of userReflections ?? []) {
      const bd = r.flag_breakdown as Record<string, number> | null;
      if (bd && typeof bd === "object") {
        for (const [key, val] of Object.entries(bd)) {
          flagBreakdownTotals[key] = (flagBreakdownTotals[key] ?? 0) + val;
        }
      }
    }

    const report = {
      generated_at: new Date().toISOString(),
      user_id: user.id,
      period: { since: since ?? "all-time" },
      summary: {
        journal_entries: (reflections ?? []).length,
        ai_analyses: (userReflections ?? []).length,
        total_flags: totalFlags,
        average_tone_score: avgTone !== null ? Math.round(avgTone * 100) / 100 : null,
        flag_breakdown: flagBreakdownTotals,
      },
      // Full per-day data
      daily_analyses:
        format === "summary" ? undefined : (userReflections ?? []),
    };

    // --- Optionally generate a share token ---
    const wantToken = searchParams.get("share") === "true";
    const shareToken = wantToken ? createShareToken(user.id) : undefined;

    // --- Emit audit log entry ---
    await supabase.from("audit_log").insert({
      actor_id: user.id,
      action: "report_exported",
      target_type: "communication_trends",
      metadata: {
        format,
        since: since ?? null,
        share_token_issued: wantToken,
      },
    });

    return NextResponse.json(
      {
        report,
        ...(shareToken ? { share_token: shareToken } : {}),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("communication-trends export error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
