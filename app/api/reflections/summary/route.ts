import { createServerClient } from "@/lib/supabase/server";

type Totals = Record<string, number>;

function isWithinLast30Days(isoDate: string): boolean {
  const timestamp = new Date(isoDate).getTime();
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return Number.isFinite(timestamp) && timestamp >= thirtyDaysAgo;
}

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("user_reflections")
    .select("category, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    return Response.json(
      { error: "Unable to load reflection summary", details: error.message },
      { status: 400 }
    );
  }

  const totals: Totals = {};
  const last30Days: Totals = {};

  for (const row of data ?? []) {
    const category = row.category;
    totals[category] = (totals[category] ?? 0) + 1;

    if (isWithinLast30Days(row.created_at)) {
      last30Days[category] = (last30Days[category] ?? 0) + 1;
    }
  }

  return Response.json({
    totals,
    last30Days,
    totalEvents: (data ?? []).length,
  });
}
