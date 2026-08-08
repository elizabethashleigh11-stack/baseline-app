import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";

type SlaEvent = { met: boolean; event_type: string };
type BehavioralFlag = { flag_type: string };
type Expense = { amount_cents: number; status: string };
type MandateRow = { start_date: string; end_date: string };

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-gray-200">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-crisp-white rounded-2xl border border-slate-gray/25 p-5 shadow-sm">
      <p className="text-slate-gray text-xs font-semibold uppercase tracking-wider">
        {label}
      </p>
      <p className="text-navy-blue mt-1 text-3xl font-bold">{value}</p>
      {sub && <p className="text-slate-gray mt-1 text-sm">{sub}</p>}
    </div>
  );
}

export default async function VitalsDashboardPage({
  params,
}: {
  params: Promise<{ connectionId: string }>;
}) {
  const { connectionId } = await params;
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/court-portal/login");
  }

  // Verify access.
  const { data: access } = await supabase
    .from("professional_access")
    .select("role")
    .eq("user_id", user.id)
    .eq("connection_id", connectionId)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .maybeSingle();

  if (!access) {
    notFound();
  }

  // Fetch all data in parallel.
  const [
    { data: slaEvents },
    { data: flags },
    { data: expenses },
    { data: mandate },
  ] = await Promise.all([
    supabase
      .from("sla_events")
      .select("met, event_type")
      .eq("connection_id", connectionId),
    supabase
      .from("behavioral_flags")
      .select("flag_type")
      .eq("connection_id", connectionId),
    supabase
      .from("expenses")
      .select("amount_cents, status")
      .eq("connection_id", connectionId),
    supabase
      .from("mandate_enrollment")
      .select("start_date, end_date")
      .eq("connection_id", connectionId)
      .maybeSingle(),
  ]);

  const typedSla = (slaEvents ?? []) as SlaEvent[];
  const typedFlags = (flags ?? []) as BehavioralFlag[];
  const typedExpenses = (expenses ?? []) as Expense[];
  const typedMandate = mandate as MandateRow | null;

  // SLA compliance calculations.
  const msgSla = typedSla.filter((e) => e.event_type === "message_sent");
  const expSla = typedSla.filter((e) => e.event_type === "expense_submitted");
  const msgRate =
    msgSla.length > 0
      ? Math.round((msgSla.filter((e) => e.met).length / msgSla.length) * 100)
      : null;
  const expRate =
    expSla.length > 0
      ? Math.round((expSla.filter((e) => e.met).length / expSla.length) * 100)
      : null;

  // Financial ledger.
  const totalCents = typedExpenses.reduce((s, e) => s + e.amount_cents, 0);
  const paidCents = typedExpenses
    .filter((e) => e.status === "paid")
    .reduce((s, e) => s + e.amount_cents, 0);
  const pendingCount = typedExpenses.filter(
    (e) => e.status === "pending"
  ).length;

  const fmt = (cents: number) =>
    (cents / 100).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });

  // Mandate progress.
  let mandatePct = 0;
  let mandateLabel = "No enrollment on record";
  if (typedMandate) {
    const startMs = new Date(typedMandate.start_date).getTime();
    const endMs = new Date(typedMandate.end_date).getTime();
    const elapsed = Math.max(0, Date.now() - startMs);
    const total = endMs - startMs;
    mandatePct = Math.min(100, Math.round((elapsed / total) * 100));
    const elapsedDays = Math.floor(elapsed / 86_400_000);
    const totalDays = Math.round(total / 86_400_000);
    mandateLabel = `${elapsedDays} / ${totalDays} days (${mandatePct}%)`;
  }

  // Behavioral flags by type.
  const flagCounts: Record<string, number> = {};
  for (const f of typedFlags) {
    flagCounts[f.flag_type] = (flagCounts[f.flag_type] ?? 0) + 1;
  }

  const navLinks = [
    { href: `/court-portal/${connectionId}`, label: "Vitals" },
    { href: `/court-portal/${connectionId}/sla`, label: "SLA Log" },
    { href: `/court-portal/${connectionId}/graduation`, label: "Graduation" },
    { href: `/court-portal/${connectionId}/docket`, label: "Docket" },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb & title */}
      <div>
        <p className="text-slate-gray text-sm">
          <Link href="/court-portal" className="hover:text-navy-blue">
            ← All Cases
          </Link>
        </p>
        <h1 className="text-navy-blue mt-1 text-2xl font-semibold tracking-tight">
          Family Vitals Dashboard
        </h1>
        <p className="text-slate-gray mt-1 font-mono text-xs">
          {connectionId}
        </p>
        <p className="text-slate-gray text-sm capitalize">
          Your role:{" "}
          <strong>{(access as { role: string }).role.replace("_", " ")}</strong>
        </p>
      </div>

      {/* Sub-navigation */}
      <nav className="flex gap-2 border-b border-slate-gray/20 pb-1">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 pb-2 text-sm font-medium first:pl-0 ${
              link.label === "Vitals"
                ? "text-navy-blue border-b-2 border-navy-blue"
                : "text-slate-gray hover:text-navy-blue"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Total SLA Events"
          value={String(typedSla.length)}
          sub={`${typedSla.filter((e) => e.met).length} met on time`}
        />
        <StatCard
          label="Total Expenses"
          value={fmt(totalCents)}
          sub={`${fmt(paidCents)} paid · ${pendingCount} pending`}
        />
        <StatCard
          label="Behavioral Flags"
          value={String(typedFlags.length)}
          sub="AI interventions logged"
        />
        <StatCard
          label="Mandate Progress"
          value={`${mandatePct}%`}
          sub={mandateLabel}
        />
      </div>

      {/* SLA Compliance */}
      <section className="bg-crisp-white rounded-2xl border border-slate-gray/25 p-5 shadow-sm">
        <h2 className="text-navy-blue font-semibold">SLA Compliance Rates</h2>
        <div className="mt-4 space-y-4">
          <div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-gray">
                Messages — 72-hour acknowledgment
              </span>
              <span className="text-navy-blue font-semibold">
                {msgRate !== null ? `${msgRate}%` : "No data"}
              </span>
            </div>
            <ProgressBar
              pct={msgRate ?? 0}
              color={
                (msgRate ?? 0) >= 80 ? "bg-green-500" : "bg-red-400"
              }
            />
          </div>
          <div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-gray">
                Expenses — 30-day payment
              </span>
              <span className="text-navy-blue font-semibold">
                {expRate !== null ? `${expRate}%` : "No data"}
              </span>
            </div>
            <ProgressBar
              pct={expRate ?? 0}
              color={
                (expRate ?? 0) >= 80 ? "bg-green-500" : "bg-red-400"
              }
            />
          </div>
        </div>
        <p className="text-slate-gray mt-4 text-xs">
          <Link
            href={`/court-portal/${connectionId}/sla`}
            className="underline"
          >
            View full SLA event log →
          </Link>
        </p>
      </section>

      {/* Mandate Progress */}
      <section className="bg-crisp-white rounded-2xl border border-slate-gray/25 p-5 shadow-sm">
        <h2 className="text-navy-blue font-semibold">
          18-Month Mandate Progress
        </h2>
        {typedMandate ? (
          <div className="mt-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-gray">
                {typedMandate.start_date} → {typedMandate.end_date}
              </span>
              <span className="text-navy-blue font-semibold">
                {mandatePct}%
              </span>
            </div>
            <ProgressBar pct={mandatePct} color="bg-navy-blue" />
            <p className="text-slate-gray mt-1 text-sm">{mandateLabel}</p>
          </div>
        ) : (
          <p className="text-slate-gray mt-2 text-sm">
            No mandate enrollment on record.
          </p>
        )}
      </section>

      {/* Behavioral Flags by Type */}
      <section className="bg-crisp-white rounded-2xl border border-slate-gray/25 p-5 shadow-sm">
        <h2 className="text-navy-blue font-semibold">
          Behavioral Flags by Type
        </h2>
        {Object.keys(flagCounts).length === 0 ? (
          <p className="text-slate-gray mt-2 text-sm">No flags recorded.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {Object.entries(flagCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <li
                  key={type}
                  className="flex items-center justify-between rounded-lg border border-slate-gray/15 px-3 py-2"
                >
                  <span className="text-navy-blue text-sm capitalize">
                    {type.replace(/_/g, " ")}
                  </span>
                  <span className="text-slate-gray text-sm font-semibold">
                    {count}
                  </span>
                </li>
              ))}
          </ul>
        )}
        <p className="text-slate-gray mt-4 text-xs">
          <Link
            href={`/court-portal/${connectionId}/graduation`}
            className="underline"
          >
            View Graduation Metric →
          </Link>
        </p>
      </section>
    </div>
  );
}
