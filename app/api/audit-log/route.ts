import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

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
    const limitParam = searchParams.get("limit");
    const limit = Math.min(Math.max(1, parseInt(limitParam ?? "50", 10)), 200);
    const cursor = searchParams.get("cursor"); // ISO timestamp for keyset pagination

    // RLS ensures actor_id = auth.uid() — users can only see their own entries.
    let query = supabase
      .from("audit_log")
      .select(
        "id, created_at, connection_id, action, target_type, target_id, metadata"
      )
      .eq("actor_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data, error } = await query;
    if (error) throw error;

    const nextCursor =
      data && data.length === limit
        ? data[data.length - 1].created_at
        : null;

    return NextResponse.json(
      { entries: data ?? [], next_cursor: nextCursor },
      { status: 200 }
    );
  } catch (err) {
    console.error("audit-log error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
