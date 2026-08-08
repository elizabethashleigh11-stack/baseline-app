import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";

type GraduationRow = {
  month_start: string;
  mandate_month: number;
  intervention_count: number;
};

type MandateRow = {
  start_date: string;
  end_date: string;
};

/**
 * Simple SVG bar chart — no external dependency.
 * Renders month-by-month intervention counts as vertical bars.
 */
function GraduationChart({
  data,
  baseline,
}: {
  data: GraduationRow[];
  baseline: number;
}) {
  if (data.length === 0) return null;

  const BAR_W = 32;
  const GAP = 8;
  const CHART_H = 200;
  const LABEL_H = 40;
  const max = Math.max(...data.map((d) => d.intervention_count), 1);
  const svgW = data.length * (BAR_W + GAP) + GAP;
  const svgH = CHART_H + LABEL_H;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${svgW} ${svgH}`}
      aria-label="Graduation metric chart — monthly intervention counts"
      role="img"
    >
      {data.map((d, i) => {
        const barH = Math.round((d.intervention_count / max) * CHART_H);
        const x = i * (BAR_W + GAP) + GAP;
        const y = CHART_H - barH;
        const isBaseline = d.mandate_month === 1;
        const isBetter = !isBaseline && d.intervention_count < baseline;

        return (
          <g key={d.month_start}>
            <rect
              x={x}
              y={y}
              width={BAR_W}
              height={barH}
              rx={4}
              fill={isBaseline ? "#708090" : isBetter ? "#22c55e" : "#ef4444"}
            />
            {/* Count label */}
            <text
              x={x + BAR_W / 2}
              y={Math.max(y - 4, 12)}
              textAnchor="middle"
              fontSize={9}
              fill="#1b365d"
            >
              {d.intervention_count}
            </text>
            {/* Month label */}
            <text
              x={x + BAR_W / 2}
              y={CHART_H + 16}
              textAnchor="middle"
              fontSize={8}
              fill="#708090"
            >
              M{d.mandate_month}
            </text>
            <text
              x={x + BAR_W / 2}
              y={CHART_H + 28}
              textAnchor="middle"
              fontSize={7}
              fill="#708090"
            >
              {d.month_start.slice(0, 7)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default async function GraduationPage({
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

  const [{ data: gradData }, { data: mandate }] = await Promise.all([
    supabase
      .from("graduation_metrics")
      .select("month_start, mandate_month, intervention_count")
      .eq("connection_id", connectionId)
      .order("mandate_month", { ascending: true }),
    supabase
      .from("mandate_enrollment")
      .select("start_date, end_date")
      .eq("connection_id", connectionId)
      .maybeSingle(),
  ]);

  const rows = (gradData ?? []) as GraduationRow[];
  const typedMandate = mandate as MandateRow | null;

  const baselineCount = rows.find((r) => r.mandate_month === 1)?.intervention_count ?? 0;
  const latestRow = rows[rows.length - 1];
  const latestCount = latestRow?.intervention_count ?? 0;
  const improvement =
    baselineCount > 0
      ? Math.round(((baselineCount - latestCount) / baselineCount) * 100)
      : null;

  const navLinks = [
    { href: `/court-portal/${connectionId}`, label: "Vitals" },
    { href: `/court-portal/${connectionId}/sla`, label: "SLA Log" },
    { href: `/court-portal/${connectionId}/graduation`, label: "Graduation" },
    { href: `/court-portal/${connectionId}/docket`, label: "Docket" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-slate-gray text-sm">
          <Link href="/court-portal" className="hover:text-navy-blue">
            ← All Cases
          </Link>
          {" / "}
          <Link
            href={`/court-portal/${connectionId}`}
            className="hover:text-navy-blue"
          >
            Vitals
          </Link>
        </p>
        <h1 className="text-navy-blue mt-1 text-2xl font-semibold tracking-tight">
          Graduation Metric
        </h1>
        <p className="text-slate-gray mt-1 text-sm">
          Tracks behavioral growth over the 18-month mandate — a lower AI
          intervention count month-over-month indicates improvement.
        </p>
      </div>

      {/* Sub-navigation */}
      <nav className="flex gap-2 border-b border-slate-gray/20 pb-1">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 pb-2 text-sm font-medium first:pl-0 ${
              link.label === "Graduation"
                ? "text-navy-blue border-b-2 border-navy-blue"
                : "text-slate-gray hover:text-navy-blue"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Mandate window */}
      {typedMandate && (
        <div className="bg-crisp-white rounded-2xl border border-slate-gray/25 p-4 shadow-sm">
          <p className="text-slate-gray text-sm">
            Mandate window:{" "}
            <strong className="text-navy-blue">
              {typedMandate.start_date}
            </strong>{" "}
            →{" "}
            <strong className="text-navy-blue">{typedMandate.end_date}</strong>
          </p>
        </div>
      )}

      {/* Summary stats */}
      {rows.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-crisp-white rounded-2xl border border-slate-gray/25 p-4 text-center shadow-sm">
            <p className="text-slate-gray text-xs font-semibold uppercase tracking-wider">
              Month 1 (Baseline)
            </p>
            <p className="text-navy-blue mt-1 text-2xl font-bold">
              {baselineCount}
            </p>
            <p className="text-slate-gray text-xs">interventions</p>
          </div>
          <div className="bg-crisp-white rounded-2xl border border-slate-gray/25 p-4 text-center shadow-sm">
            <p className="text-slate-gray text-xs font-semibold uppercase tracking-wider">
              Latest Month
            </p>
            <p className="text-navy-blue mt-1 text-2xl font-bold">
              {latestCount}
            </p>
            <p className="text-slate-gray text-xs">interventions</p>
          </div>
          <div className="bg-crisp-white rounded-2xl border border-slate-gray/25 p-4 text-center shadow-sm">
            <p className="text-slate-gray text-xs font-semibold uppercase tracking-wider">
              Improvement
            </p>
            <p
              className={`mt-1 text-2xl font-bold ${
                (improvement ?? 0) >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {improvement !== null
                ? `${improvement >= 0 ? "+" : ""}${improvement}%`
                : "—"}
            </p>
            <p className="text-slate-gray text-xs">vs. baseline</p>
          </div>
        </div>
      )}

      {/* Chart */}
      <section className="bg-crisp-white rounded-2xl border border-slate-gray/25 p-5 shadow-sm">
        <h2 className="text-navy-blue mb-1 font-semibold">
          Monthly AI Interventions
        </h2>
        <p className="text-slate-gray mb-4 text-xs">
          <span className="inline-block h-2 w-4 rounded bg-slate-400" /> Month
          1 baseline &nbsp;
          <span className="inline-block h-2 w-4 rounded bg-green-500" /> Below
          baseline (improvement) &nbsp;
          <span className="inline-block h-2 w-4 rounded bg-red-400" /> Above
          baseline (regression)
        </p>

        {rows.length === 0 ? (
          <p className="text-slate-gray text-sm">
            No behavioral flags recorded yet.
          </p>
        ) : (
          <GraduationChart data={rows} baseline={baselineCount} />
        )}
      </section>

      {/* Detailed table */}
      {rows.length > 0 && (
        <section className="bg-crisp-white overflow-hidden rounded-2xl border border-slate-gray/25 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-gray/20">
                  <th className="text-slate-gray px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    Mandate Month
                  </th>
                  <th className="text-slate-gray px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    Period
                  </th>
                  <th className="text-slate-gray px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    Interventions
                  </th>
                  <th className="text-slate-gray px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    vs. Baseline
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const delta = r.intervention_count - baselineCount;
                  const isBaseline = r.mandate_month === 1;
                  return (
                    <tr
                      key={r.month_start}
                      className={`border-b border-slate-gray/10 last:border-0 ${
                        i % 2 === 0 ? "" : "bg-gray-50/50"
                      }`}
                    >
                      <td className="text-navy-blue px-4 py-3 font-semibold">
                        Month {r.mandate_month}
                        {isBaseline && (
                          <span className="text-slate-gray ml-2 text-xs font-normal">
                            (baseline)
                          </span>
                        )}
                      </td>
                      <td className="text-slate-gray px-4 py-3">
                        {r.month_start}
                      </td>
                      <td className="text-navy-blue px-4 py-3 font-semibold">
                        {r.intervention_count}
                      </td>
                      <td className="px-4 py-3">
                        {isBaseline ? (
                          <span className="text-slate-gray">—</span>
                        ) : (
                          <span
                            className={
                              delta <= 0 ? "text-green-600" : "text-red-600"
                            }
                          >
                            {delta <= 0 ? "" : "+"}
                            {delta}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
