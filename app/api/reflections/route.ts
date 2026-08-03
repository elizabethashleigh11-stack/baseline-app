import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

type ReflectionPayload = {
  text: unknown;
  tags: unknown;
};

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

    const body = (await req.json()) as ReflectionPayload;
    const { text, tags } = body;

    const hasValidTags =
      Array.isArray(tags) && tags.every((tag) => typeof tag === "string");

    if (typeof text !== "string" || !hasValidTags) {
      return NextResponse.json(
        { error: "Invalid data format." },
        { status: 400 }
      );
    }

    const entryDate = new Date().toISOString().slice(0, 10);

    const { error } = await supabase.from("reflections").upsert(
      {
        user_id: user.id,
        entry_date: entryDate,
        text,
        tags,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,entry_date" }
    );

    if (error) {
      throw error;
    }

    return NextResponse.json(
      { success: true, message: "Draft saved successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Auto-save error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
