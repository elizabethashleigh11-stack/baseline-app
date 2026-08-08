import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

type ApprovalPayload = {
  event_id: unknown;
  reaction: unknown;
};

const VALID_REACTIONS = new Set(["approved", "declined", "noted"]);

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as ApprovalPayload;
    const { event_id, reaction } = body;

    if (typeof event_id !== "string") {
      return NextResponse.json(
        { error: "event_id must be a string." },
        { status: 400 },
      );
    }

    // reaction === null means remove the reaction
    if (reaction !== null && !VALID_REACTIONS.has(reaction as string)) {
      return NextResponse.json(
        { error: "reaction must be 'approved', 'declined', 'noted', or null." },
        { status: 400 },
      );
    }

    if (reaction === null) {
      const { error } = await supabase
        .from("approvals")
        .delete()
        .eq("event_id", event_id)
        .eq("user_id", user.id);

      if (error) throw error;
      return NextResponse.json({ success: true, reaction: null });
    }

    const { error } = await supabase.from("approvals").upsert(
      { event_id, user_id: user.id, reaction },
      { onConflict: "event_id,user_id" },
    );

    if (error) throw error;

    return NextResponse.json({ success: true, reaction });
  } catch (error) {
    console.error("Approvals error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
