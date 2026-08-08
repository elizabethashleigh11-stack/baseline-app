import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal/session";
import MoodHeatmap from "@/app/app/MoodHeatmap";
import ReflectionInput from "@/app/app/ReflectionInput";

const caseloadMetrics = [
  { label: "Active families", value: "12" },
  { label: "Sessions today", value: "4" },
  { label: "Follow-ups due", value: "3" },
];

const todaySchedule = [
  {
    title: "Family mediation session",
    time: "9:00 AM",
    detail: "Jordan & Alex · Video call",
  },
  {
    title: "Care plan review",
    time: "1:30 PM",
    detail: "Nguyen family · In-person",
  },
  {
    title: "Documentation block",
    time: "4:00 PM",
    detail: "Finalize shared notes and next steps",
  },
];

const followUps = [
  {
    title: "Escalation flagged",
    detail: "Review tone shift in the Carter family thread.",
    when: "Needs review",
  },
  {
    title: "Reflection trend",
    detail: "Two parents reported elevated stress this week.",
    when: "Today",
  },
  {
    title: "Intake reminder",
    detail: "Confirm forms before Monday's onboarding session.",
    when: "Tomorrow",
  },
];

export default async function ProfessionalPortalPage() {
  const { supabase, user, role } = await getPortalSession();

  if (!user || !role) {
    redirect("/login");
  }

  if (role === "parent") {
    redirect("/parent-portal");
  }

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 29);

  // This reflection view is intentionally scoped to the signed-in professional.
  const { data: reflectionsData } = await supabase
    .from("reflections")
    .select("entry_date, tags, text")
    .eq("user_id", user.id)
    .gte("entry_date", startDate.toISOString().slice(0, 10))
    .lte("entry_date", today.toISOString().slice(0, 10))
    .order("entry_date", { ascending: true });

  const reflections = (reflectionsData ?? []).map((reflection) => ({
    entry_date: reflection.entry_date,
    text: typeof reflection.text === "string" ? reflection.text : "",
    tags: Array.isArray(reflection.tags)
      ? reflection.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
  }));

  return (
    <main className="bg-gray-50 min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <header className="bg-crisp-white rounded-2xl border border-slate-gray/25 p-5 shadow-sm sm:p-6">
          <p className="text-slate-gray text-sm">Professional Portal</p>
          <h1 className="text-navy-blue mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Caseload dashboard
          </h1>
          <p className="text-slate-gray mt-3 text-sm sm:text-base">
            Signed in as <strong>{user.email}</strong>
          </p>
        </header>

        <section className="space-y-3">
          <p className="text-slate-gray text-sm">
            Demo caseload metrics are shown below until live professional
            reporting is connected.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {caseloadMetrics.map((metric) => (
              <article
                key={metric.label}
                className="bg-crisp-white rounded-2xl border border-slate-gray/25 p-5 shadow-sm"
              >
                <p className="text-slate-gray text-sm">{metric.label}</p>
                <p className="text-navy-blue mt-2 text-3xl font-semibold">
                  {metric.value}
                </p>
              </article>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-5">
            <section className="bg-crisp-white rounded-2xl border border-slate-gray/25 p-5 shadow-sm sm:p-6">
              <h2 className="text-navy-blue text-lg font-semibold">
                Demo schedule snapshot
              </h2>
              <p className="text-slate-gray mt-1 text-sm">
                Placeholder caseload data is shown here until live professional
                scheduling data is connected.
              </p>
              <ul className="mt-4 space-y-3">
                {todaySchedule.map((item) => (
                  <li
                    key={item.title}
                    className="rounded-xl border border-slate-gray/20 p-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-navy-blue text-sm font-semibold">
                          {item.title}
                        </p>
                        <p className="text-slate-gray mt-1 text-sm">
                          {item.detail}
                        </p>
                      </div>
                      <span className="text-slate-gray shrink-0 text-sm">
                        {item.time}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="bg-crisp-white rounded-2xl border border-slate-gray/25 p-5 shadow-sm sm:p-6">
              <h2 className="text-navy-blue text-lg font-semibold">
                Personal provider reflection
              </h2>
              <p className="text-slate-gray mt-1 text-sm">
                Track your own notes, emotional trends, and follow-up context for
                the day.
              </p>
              <ReflectionInput />
              <MoodHeatmap reflections={reflections} />
            </section>
          </section>

          <section className="bg-crisp-white rounded-2xl border border-slate-gray/25 p-5 shadow-sm sm:p-6">
            <h2 className="text-navy-blue text-lg font-semibold">
              Demo follow-up queue
            </h2>
            <p className="text-slate-gray mt-1 text-sm">
              These items are sample content to shape the professional dashboard
              layout.
            </p>
            <ul className="mt-4 space-y-3">
              {followUps.map((item) => (
                <li
                  key={item.title}
                  className="rounded-xl border border-slate-gray/20 p-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-navy-blue text-sm font-semibold">
                        {item.title}
                      </p>
                      <p className="text-slate-gray mt-1 text-sm">{item.detail}</p>
                    </div>
                    <span className="text-slate-gray shrink-0 text-xs font-medium">
                      {item.when}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
