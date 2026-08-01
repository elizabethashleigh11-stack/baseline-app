import {
  moderateDraft,
  normalizeForComparison,
} from "@/lib/moderation/language-filter";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  const connectionId =
    typeof body?.connectionId === "string" ? body.connectionId.trim() : "";
  const draftText = typeof body?.draftText === "string" ? body.draftText : "";
  const finalText = typeof body?.finalText === "string" ? body.finalText : "";

  if (!connectionId || !draftText.trim() || !finalText.trim()) {
    return Response.json(
      { error: "connectionId, draftText, and finalText are required" },
      { status: 400 }
    );
  }

  const moderation = moderateDraft(draftText);

  if (
    moderation.flagged &&
    normalizeForComparison(draftText) === normalizeForComparison(finalText)
  ) {
    return Response.json(
      {
        error:
          "Flagged draft text cannot be sent as-is. Accept or edit the neutral rewrite.",
      },
      { status: 400 }
    );
  }

  const { data: insertedMessage, error: messageInsertError } = await supabase
    .from("messages")
    .insert({
      connection_id: connectionId,
      sender_id: user.id,
      body: finalText.trim(),
      moderation_applied: moderation.flagged,
      moderated_at: moderation.flagged ? new Date().toISOString() : null,
    })
    .select("id, created_at, body, moderation_applied")
    .single();

  if (messageInsertError) {
    return Response.json(
      {
        error: "Message could not be sent.",
        details: messageInsertError.message,
      },
      { status: 400 }
    );
  }

  if (moderation.flagged && insertedMessage) {
    const category = moderation.category ?? "other";
    const reason = moderation.reason ?? "Flagged by language filter.";

    const { error: draftInsertError } = await supabase
      .from("message_drafts_private")
      .insert({
        message_id: insertedMessage.id,
        user_id: user.id,
        original_text: draftText.trim(),
        ai_flag_reason: reason,
        emotional_category: category,
      });

    if (draftInsertError) {
      return Response.json(
        {
          error: "Message sent, but private moderation metadata failed to store.",
          details: draftInsertError.message,
        },
        { status: 500 }
      );
    }

    const { error: reflectionInsertError } = await supabase
      .from("user_reflections")
      .insert({
        user_id: user.id,
        category,
      });

    if (reflectionInsertError) {
      return Response.json(
        {
          error: "Message sent, but reflection trend entry failed to store.",
          details: reflectionInsertError.message,
        },
        { status: 500 }
      );
    }
  }

  return Response.json({
    sentMessage: insertedMessage,
    moderation: {
      flagged: moderation.flagged,
      category: moderation.category,
    },
  });
}
