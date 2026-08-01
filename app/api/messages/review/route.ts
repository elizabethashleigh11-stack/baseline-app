import { moderateDraft } from "@/lib/moderation/language-filter";
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
  const draftText = typeof body?.draftText === "string" ? body.draftText : "";

  if (!draftText.trim()) {
    return Response.json({ error: "draftText is required" }, { status: 400 });
  }

  const moderation = moderateDraft(draftText);

  return Response.json({ moderation });
}
