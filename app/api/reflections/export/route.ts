import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: portalData, error: portalError } = await supabase
    .from("users")
    .select("portal_type")
    .eq("id", user.id)
    .maybeSingle();

  if (portalError) {
    return Response.json(
      { error: "Unable to verify portal access", details: portalError.message },
      { status: 400 }
    );
  }

  if (portalData?.portal_type !== "parent") {
    return Response.json(
      { error: "Reflection exports are only available in the parent portal." },
      { status: 403 }
    );
  }

  const { data: exportPayload, error: exportError } = await supabase.rpc(
    "export_my_reflection_trends"
  );

  if (exportError) {
    return Response.json(
      { error: "Unable to export communication trends", details: exportError.message },
      { status: 400 }
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return new Response(JSON.stringify(exportPayload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename=communication-trends-${today}.json`,
    },
  });
}
