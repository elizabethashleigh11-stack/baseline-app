import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

type SubscriptionPayload = {
  connection_id: unknown;
  plan: unknown;
  stripe_customer_id?: unknown;
  stripe_subscription_id?: unknown;
};

/** GET /api/subscriptions?connection_id=<uuid>
 *  Returns the subscription record for the given connection.
 */
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
    const connectionId = searchParams.get("connection_id");
    if (!connectionId) {
      return NextResponse.json(
        { error: "connection_id is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .select(
        "id, connection_id, paying_user_id, plan, status, created_at, updated_at"
      )
      .eq("connection_id", connectionId)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ subscription: data }, { status: 200 });
  } catch (err) {
    console.error("subscriptions GET error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/** POST /api/subscriptions
 *  Creates or upgrades a subscription (the current user becomes the paying parent).
 */
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

    const body = (await req.json()) as SubscriptionPayload;
    const { connection_id, plan, stripe_customer_id, stripe_subscription_id } =
      body;

    if (
      typeof connection_id !== "string" ||
      (plan !== "premium" && plan !== "free")
    ) {
      return NextResponse.json(
        { error: "Invalid payload: connection_id (string) and plan ('premium'|'free') are required." },
        { status: 400 }
      );
    }

    // Verify the current user is a member of this connection
    const { data: conn, error: connErr } = await supabase
      .from("connections")
      .select("id")
      .eq("id", connection_id)
      .maybeSingle();

    if (connErr) throw connErr;
    if (!conn) {
      return NextResponse.json(
        { error: "Connection not found or access denied." },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .upsert(
        {
          connection_id,
          paying_user_id: user.id,
          plan,
          status: "active",
          ...(typeof stripe_customer_id === "string"
            ? { stripe_customer_id }
            : {}),
          ...(typeof stripe_subscription_id === "string"
            ? { stripe_subscription_id }
            : {}),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "connection_id" }
      )
      .select()
      .single();

    if (error) throw error;

    // Emit audit log
    await supabase.from("audit_log").insert({
      connection_id,
      actor_id: user.id,
      action: "subscription_created",
      target_type: "subscription",
      target_id: data.id,
      metadata: { plan },
    });

    return NextResponse.json({ subscription: data }, { status: 201 });
  } catch (err) {
    console.error("subscriptions POST error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
