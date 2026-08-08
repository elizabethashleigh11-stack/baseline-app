import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";

type SlaEvent = {
  id: string;
  event_type: string;
  occurred_at: string;
  deadline_at: string;
  met: boolean;
  resolved_at: string | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function SlaLogPage({
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

  const { data: events } = await supabase
    .from("sla_events")
    .select("id, event_type, occurred_at, deadline_at, met, resolved_at")
    .eq("connection_id", connectionId)
    .order("occurred_at", { ascending: false });

  const typedEvents = (events ?? []) as SlaEvent[];
  const totalMet = typedEvents.filter((e) => e.met).length;
  const complianceRate =
    typedEvents.length > 0
      ? Math.round((totalMet / typedEvents.length) * 100)
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
          SLA Accountability Log
        </h1>
        <p className="text-slate-gray mt-1 font-mono text-xs">{connectionId}</p>
      </div>

      {/* Sub-navigation */}
      <nav className="flex gap-2 border-b border-slate-gray/20 pb-1">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 pb-2 text-sm font-medium first:pl-0 ${
              link.label === "SLA Log"
                ? "text-navy-blue border-b-2 border-navy-blue"
                : "text-slate-gray hover:text-navy-blue"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-crisp-white rounded-2xl border border-slate-gray/25 p-4 text-center shadow-sm">
          <p className="text-slate-gray text-xs font-semibold uppercase tracking-wider">
            Total Events
          </p>
          <p className="text-navy-blue mt-1 text-2xl font-bold">
            {typedEvents.length}
          </p>
        </div>
        <div className="bg-crisp-white rounded-2xl border border-slate-gray/25 p-4 text-center shadow-sm">
          <p className="text-slate-gray text-xs font-semibold uppercase tracking-wider">
            Met On Time
          </p>
          <p className="mt-1 text-2xl font-bold text-green-600">{totalMet}</p>
        </div>
        <div className="bg-crisp-white rounded-2xl border border-slate-gray/25 p-4 text-center shadow-sm">
          <p className="text-slate-gray text-xs font-semibold uppercase tracking-wider">
            Compliance Rate
          </p>
          <p
            className={`mt-1 text-2xl font-bold ${
              (complianceRate ?? 0) >= 80 ? "text-green-600" : "text-red-600"
            }`}
          >
            {complianceRate !== null ? `${complianceRate}%` : "—"}
          </p>
        </div>
      </div>

      {/* Event table */}
      <section className="bg-crisp-white overflow-hidden rounded-2xl border border-slate-gray/25 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-gray/20 text-left">
                <th className="text-slate-gray px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                  Event Type
                </th>
                <th className="text-slate-gray px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                  Occurred
                </th>
                <th className="text-slate-gray px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                  Deadline
                </th>
                <th className="text-slate-gray px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                  Resolved
                </th>
                <th className="text-slate-gray px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {typedEvents.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="text-slate-gray px-4 py-8 text-center"
                  >
                    No SLA events recorded yet.
                  </td>
                </tr>
              )}
              {typedEvents.map((ev, i) => {
                const isOverdue =
                  !ev.met &&
                  ev.resolved_at !== null &&
                  new Date(ev.resolved_at) > new Date(ev.deadline_at);
                const isPending = !ev.met && ev.resolved_at === null;
                return (
                  <tr
                    key={ev.id}
                    className={`border-b border-slate-gray/10 last:border-0 ${
                      i % 2 === 0 ? "" : "bg-gray-50/50"
                    } ${isOverdue ? "bg-red-50/60" : ""}`}
                  >
                    <td className="text-navy-blue px-4 py-3 font-medium capitalize">
                      {ev.event_type.replace(/_/g, " ")}
                    </td>
                    <td className="text-slate-gray px-4 py-3">
                      {formatDate(ev.occurred_at)}
                    </td>
                    <td className="text-slate-gray px-4 py-3">
                      {formatDate(ev.deadline_at)}
                    </td>
                    <td className="text-slate-gray px-4 py-3">
                      {ev.resolved_at ? formatDate(ev.resolved_at) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {ev.met ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                          ✓ Met
                        </span>
                      ) : isPending ? (
                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-800">
                          Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                          ✗ Overdue
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

      <p className="text-slate-gray text-xs">
        Overdue events are highlighted in red and permanently logged —
        stonewalling is objectively documented.
      </p>
    </div>
  );
}
