import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

type OptOutPayload = {
  connection_id: unknown;
};

type CountersignPayload = {
  opt_out_id: unknown;
};

type WithdrawPayload = {
  opt_out_id: unknown;
};

/** POST /api/opt-out  — initiate an opt-out request */
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

    const body = (await req.json()) as OptOutPayload;
    const { connection_id } = body;

    if (typeof connection_id !== "string") {
      return NextResponse.json(
        { error: "connection_id (string) is required." },
        { status: 400 }
      );
    }

    // Enforce 18-month lock: fetch the connection's created_at
    const { data: conn, error: connErr } = await supabase
      .from("connections")
      .select("id, created_at, status")
      .eq("id", connection_id)
      .maybeSingle();

    if (connErr) throw connErr;
    if (!conn) {
      return NextResponse.json(
        { error: "Connection not found or access denied." },
        { status: 404 }
      );
    }

    if (conn.status !== "active") {
      return NextResponse.json(
        { error: "Connection is not active." },
        { status: 409 }
      );
    }

    const createdAt = new Date(conn.created_at as string);
    const eighteenMonthsLater = new Date(createdAt);
    eighteenMonthsLater.setMonth(eighteenMonthsLater.getMonth() + 18);

    if (new Date() < eighteenMonthsLater) {
      return NextResponse.json(
        {
          error: `Opt-out is locked until ${eighteenMonthsLater.toISOString().slice(0, 10)} (18 months after case creation).`,
          locked_until: eighteenMonthsLater.toISOString(),
        },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("opt_out_requests")
      .insert({
        connection_id,
        requested_by: user.id,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    // Audit log
    await supabase.from("audit_log").insert({
      connection_id,
      actor_id: user.id,
      action: "opt_out_requested",
      target_type: "opt_out_request",
      target_id: data.id,
      metadata: {},
    });

    return NextResponse.json({ opt_out_request: data }, { status: 201 });
  } catch (err) {
    console.error("opt-out POST error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/** PATCH /api/opt-out  — countersign or withdraw an existing opt-out request */
export async function PATCH(req: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as (CountersignPayload | WithdrawPayload) & { action?: unknown };
    const { opt_out_id } = body as { opt_out_id: unknown };
    const action = (body as { action?: unknown }).action;

    if (typeof opt_out_id !== "string") {
      return NextResponse.json(
        { error: "opt_out_id (string) is required." },
        { status: 400 }
      );
    }

    if (action !== "countersign" && action !== "withdraw") {
      return NextResponse.json(
        { error: "action must be 'countersign' or 'withdraw'." },
        { status: 400 }
      );
    }

    const { data: existing, error: fetchErr } = await supabase
      .from("opt_out_requests")
      .select("id, connection_id, requested_by, status")
      .eq("id", opt_out_id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!existing) {
      return NextResponse.json(
        { error: "Opt-out request not found or access denied." },
        { status: 404 }
      );
    }

    if (existing.status !== "pending") {
      return NextResponse.json(
        { error: "Opt-out request is no longer pending." },
        { status: 409 }
      );
    }

    let updatePayload: Record<string, unknown>;
    let auditAction: string;

    if (action === "countersign") {
      if (existing.requested_by === user.id) {
        return NextResponse.json(
          { error: "You cannot countersign your own opt-out request." },
          { status: 403 }
        );
      }
      updatePayload = {
        countersigned_by: user.id,
        countersigned_at: new Date().toISOString(),
        status: "completed",
      };
      auditAction = "opt_out_countersigned";
    } else {
      // withdraw — only the original requester may withdraw
      if (existing.requested_by !== user.id) {
        return NextResponse.json(
          { error: "Only the original requester may withdraw the opt-out request." },
          { status: 403 }
        );
      }
      updatePayload = { status: "withdrawn" };
      auditAction = "opt_out_withdrawn";
    }

    const { data, error } = await supabase
      .from("opt_out_requests")
      .update(updatePayload)
      .eq("id", opt_out_id)
      .select()
      .single();

    if (error) throw error;

    // Audit log
    await supabase.from("audit_log").insert({
      connection_id: existing.connection_id,
      actor_id: user.id,
      action: auditAction,
      target_type: "opt_out_request",
      target_id: existing.id,
      metadata: {},
    });

    return NextResponse.json({ opt_out_request: data }, { status: 200 });
  } catch (err) {
    console.error("opt-out PATCH error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/** GET /api/opt-out?connection_id=<uuid>  — list opt-out requests for a connection */
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
        { error: "connection_id is required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("opt_out_requests")
      .select(
        "id, connection_id, requested_by, requested_at, countersigned_by, countersigned_at, status, created_at"
      )
      .eq("connection_id", connectionId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ opt_out_requests: data ?? [] }, { status: 200 });
  } catch (err) {
    console.error("opt-out GET error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
