import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { createHash } from "crypto";

type SlaEvent = {
  event_type: string;
  occurred_at: string;
  deadline_at: string;
  met: boolean;
};

type BehavioralFlag = {
  flag_type: string;
  detail: string;
  flagged_at: string;
};

type Expense = {
  description: string;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
};

type MandateEnrollment = {
  start_date: string;
  end_date: string;
};

/**
 * POST /api/docket
 * Body: { connection_id: string }
 *
 * Generates a cryptographically-hashed PDF docket for a co-parent connection,
 * stores it in Supabase Storage, logs the report in docket_reports, and
 * returns a signed download URL.
 *
 * Requires the caller to be a professional with active access to the connection.
 */
export async function POST(req: Request) {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let connectionId: string;
  try {
    const body = (await req.json()) as { connection_id?: unknown };
    if (typeof body.connection_id !== "string" || !body.connection_id) {
      return NextResponse.json(
        { error: "connection_id is required." },
        { status: 400 }
      );
    }
    connectionId = body.connection_id;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Verify professional access.
  const { data: access, error: accessError } = await supabase
    .from("professional_access")
    .select("role")
    .eq("user_id", user.id)
    .eq("connection_id", connectionId)
    .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
    .maybeSingle();

  if (accessError || !access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Use the service-role client for storage writes and docket_reports insert.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Server misconfiguration." },
      { status: 500 }
    );
  }
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Fetch all data in parallel.
  const [
    { data: slaEvents },
    { data: flags },
    { data: expenses },
    { data: mandate },
  ] = await Promise.all([
    supabase
      .from("sla_events")
      .select("event_type, occurred_at, deadline_at, met")
      .eq("connection_id", connectionId)
      .order("occurred_at", { ascending: true }),
    supabase
      .from("behavioral_flags")
      .select("flag_type, detail, flagged_at")
      .eq("connection_id", connectionId)
      .order("flagged_at", { ascending: true }),
    supabase
      .from("expenses")
      .select("description, amount_cents, currency, status, created_at")
      .eq("connection_id", connectionId)
      .order("created_at", { ascending: true }),
    supabase
      .from("mandate_enrollment")
      .select("start_date, end_date")
      .eq("connection_id", connectionId)
      .maybeSingle(),
  ]);

  const typedSlaEvents = (slaEvents ?? []) as SlaEvent[];
  const typedFlags = (flags ?? []) as BehavioralFlag[];
  const typedExpenses = (expenses ?? []) as Expense[];
  const typedMandate = mandate as MandateEnrollment | null;

  // Build the PDF.
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_WIDTH = 612;
  const PAGE_HEIGHT = 792;
  const MARGIN = 50;
  const LINE_H = 16;
  const navy = rgb(0.106, 0.212, 0.365);
  const gray = rgb(0.44, 0.5, 0.565);
  const red = rgb(0.8, 0.1, 0.1);
  const green = rgb(0.1, 0.5, 0.1);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  function ensureSpace(lines: number) {
    if (y - lines * LINE_H < MARGIN) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  }

  function drawText(
    text: string,
    opts: {
      size?: number;
      bold?: boolean;
      color?: ReturnType<typeof rgb>;
      x?: number;
    } = {}
  ) {
    const { size = 10, bold = false, color = navy, x = MARGIN } = opts;
    page.drawText(text, {
      x,
      y,
      size,
      font: bold ? boldFont : font,
      color,
    });
    y -= LINE_H;
  }

  function drawLine() {
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_WIDTH - MARGIN, y },
      thickness: 0.5,
      color: gray,
    });
    y -= 8;
  }

  // ---- Header ----
  const generatedAt = new Date().toISOString();
  drawText("BASELINE — COURT DOCKET REPORT", {
    size: 16,
    bold: true,
    color: navy,
  });
  drawText(`Case / Connection ID: ${connectionId}`, { size: 9, color: gray });
  drawText(`Generated: ${generatedAt}`, { size: 9, color: gray });
  drawText(`Generated by user: ${user.email ?? user.id}`, {
    size: 9,
    color: gray,
  });
  drawText(`Professional role: ${access.role}`, { size: 9, color: gray });
  y -= 8;
  drawLine();

  // ---- Mandate Window ----
  drawText("MANDATE WINDOW (18-MONTH PROGRAM)", {
    size: 12,
    bold: true,
    color: navy,
  });
  y -= 4;
  if (typedMandate) {
    const start = typedMandate.start_date;
    const end = typedMandate.end_date;
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    const elapsed = Math.max(
      0,
      Math.floor((Date.now() - startMs) / 86_400_000)
    );
    const total = Math.round((endMs - startMs) / 86_400_000);
    const pct = Math.min(100, Math.round((elapsed / total) * 100));
    drawText(`Start: ${start}   End: ${end}`);
    drawText(`Progress: ${elapsed} / ${total} days (${pct}%)`);
  } else {
    drawText("No mandate enrollment on record.", { color: gray });
  }
  y -= 8;
  drawLine();

  // ---- SLA Compliance ----
  drawText("SLA COMPLIANCE SUMMARY", { size: 12, bold: true, color: navy });
  y -= 4;
  const totalSla = typedSlaEvents.length;
  const metSla = typedSlaEvents.filter((e) => e.met).length;
  const rate =
    totalSla > 0 ? Math.round((metSla / totalSla) * 100) : null;
  drawText(
    `Total SLA events: ${totalSla}   Met: ${metSla}   Overdue: ${totalSla - metSla}   Compliance rate: ${rate !== null ? rate + "%" : "N/A"}`
  );
  y -= 6;

  const msgSla = typedSlaEvents.filter((e) => e.event_type === "message_sent");
  const expSla = typedSlaEvents.filter(
    (e) => e.event_type === "expense_submitted"
  );
  const msgMet = msgSla.filter((e) => e.met).length;
  const expMet = expSla.filter((e) => e.met).length;
  drawText(
    `  Messages (72-hour window): ${msgMet}/${msgSla.length} acknowledged on time`
  );
  drawText(
    `  Expenses (30-day window):  ${expMet}/${expSla.length} paid on time`
  );
  y -= 6;

  if (typedSlaEvents.length > 0) {
    drawText("Event log:", { size: 9, bold: true });
    for (const ev of typedSlaEvents) {
      ensureSpace(2);
      const status = ev.met ? "MET" : "OVERDUE";
      const color = ev.met ? green : red;
      const line = `  [${ev.event_type.padEnd(22)}]  occurred: ${ev.occurred_at.slice(0, 16)}  deadline: ${ev.deadline_at.slice(0, 16)}  ${status}`;
      page.drawText(line, {
        x: MARGIN,
        y,
        size: 8,
        font: ev.met ? font : boldFont,
        color,
      });
      y -= LINE_H;
    }
  }
  y -= 8;
  drawLine();

  // ---- Financial Ledger ----
  drawText("FINANCIAL LEDGER", { size: 12, bold: true, color: navy });
  y -= 4;
  const totalCents = typedExpenses.reduce((s, e) => s + e.amount_cents, 0);
  const paidCents = typedExpenses
    .filter((e) => e.status === "paid")
    .reduce((s, e) => s + e.amount_cents, 0);
  const overdueCents = typedExpenses
    .filter((e) => e.status === "pending")
    .reduce((s, e) => s + e.amount_cents, 0);

  const fmt = (cents: number, currency = "USD") =>
    (cents / 100).toLocaleString("en-US", {
      style: "currency",
      currency,
    });

  drawText(
    `Total submitted: ${fmt(totalCents)}   Paid: ${fmt(paidCents)}   Pending/overdue: ${fmt(overdueCents)}`
  );
  y -= 6;
  for (const exp of typedExpenses) {
    ensureSpace(2);
    drawText(
      `  ${exp.created_at.slice(0, 10)}  ${exp.description.slice(0, 40).padEnd(40)}  ${fmt(exp.amount_cents, exp.currency)}  [${exp.status}]`,
      { size: 8 }
    );
  }
  y -= 8;
  drawLine();

  // ---- Behavioral Flags ----
  drawText("BEHAVIORAL FLAGS", { size: 12, bold: true, color: navy });
  y -= 4;
  drawText(`Total flags: ${typedFlags.length}`);
  y -= 4;
  for (const flag of typedFlags) {
    ensureSpace(2);
    drawText(
      `  ${flag.flagged_at.slice(0, 16)}  [${flag.flag_type}]  ${flag.detail.slice(0, 60)}`,
      { size: 8 }
    );
  }
  y -= 8;
  drawLine();

  // ---- Footer / hash placeholder ----
  drawText(
    "This report was generated by Baseline and is cryptographically verified.",
    { size: 8, color: gray }
  );
  drawText(
    "SHA-256 hash computed over PDF bytes — see docket_reports table for verification.",
    { size: 8, color: gray }
  );

  const pdfBytes = await pdfDoc.save();

  // Compute SHA-256 of the PDF.
  const sha256Hash = createHash("sha256")
    .update(Buffer.from(pdfBytes))
    .digest("hex");

  const storagePath = `dockets/${connectionId}/${generatedAt.replace(/[:.]/g, "-")}.pdf`;

  // Upload to Supabase Storage (bucket: "dockets").
  const { error: uploadError } = await adminClient.storage
    .from("dockets")
    .upload(storagePath, Buffer.from(pdfBytes), {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    console.error("[docket] storage upload error:", uploadError);
    return NextResponse.json(
      { error: "Failed to store docket PDF. Please try again." },
      { status: 500 }
    );
  }

  // Log the report.
  await adminClient.from("docket_reports").insert({
    connection_id: connectionId,
    generated_by: user.id,
    generated_at: generatedAt,
    sha256_hash: sha256Hash,
    storage_path: storagePath,
  });

  // Create a signed URL (valid for 1 hour).
  const { data: signedUrlData } = await adminClient.storage
    .from("dockets")
    .createSignedUrl(storagePath, 3600);

  return NextResponse.json({
    ok: true,
    sha256_hash: sha256Hash,
    storage_path: storagePath,
    signed_url: signedUrlData?.signedUrl ?? null,
    generated_at: generatedAt,
  });
}
