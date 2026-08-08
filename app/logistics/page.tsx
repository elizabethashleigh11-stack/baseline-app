import ApprovalButton from "./ApprovalButton";
import GpsCheckin from "./GpsCheckin";

// ---------------------------------------------------------------------------
// Static demo data — replace with live Supabase queries once auth is wired.
// ---------------------------------------------------------------------------

const SCHEDULE = [
  {
    id: "evt-1",
    type: "sports" as const,
    title: "Ryle Raiders Soccer Practice",
    time: "Today · 5:30 PM",
    location: "Community Field, Gate B",
    notes: "Bring shin guards and water bottle.",
  },
  {
    id: "evt-2",
    type: "medical" as const,
    title: "Pediatric Checkup",
    time: "Tomorrow · 10:15 AM",
    location: "Northside Clinic",
    notes: null,
  },
  {
    id: "evt-3",
    type: "custody" as const,
    title: "Weekend Custody Handoff",
    time: "Sat · 9:00 AM",
    location: "Riverside Elementary",
    notes: null,
  },
  {
    id: "evt-4",
    type: "school" as const,
    title: "Canvas Assignment Due",
    time: "Mon · 11:59 PM",
    location: null,
    notes: "Math — Chapter 7 worksheet (synced from Canvas).",
  },
];

const INTEGRATIONS = [
  {
    key: "canvas",
    name: "Canvas",
    icon: "🎓",
    description: "Assignments, grades, and school notices.",
    connected: false,
  },
  {
    key: "infinite_campus",
    name: "Infinite Campus",
    icon: "🏫",
    description: "Attendance, report cards, and lunch balance.",
    connected: false,
  },
  {
    key: "mychart",
    name: "MyChart",
    icon: "🏥",
    description: "Appointments, immunization records, and prescriptions.",
    connected: false,
  },
];

const EVENT_TYPE_LABELS: Record<(typeof SCHEDULE)[number]["type"], string> = {
  sports: "⚽ Sports",
  medical: "🏥 Medical",
  custody: "🤝 Custody",
  school: "📚 School",
};

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function LogisticsPage() {
  return (
    <main className="bg-gray-50 min-h-screen px-4 pb-28 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        {/* ---------------------------------------------------------------- */}
        {/* Header                                                           */}
        {/* ---------------------------------------------------------------- */}
        <header className="bg-crisp-white rounded-2xl border border-slate-gray/25 p-5 shadow-sm sm:p-6">
          <p className="text-slate-gray text-sm">Logistics &amp; Connectors</p>
          <h1 className="text-navy-blue mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            The Frictionless Hub
          </h1>
          <p className="text-slate-gray mt-1 text-sm">
            Centralised schedules, quick approvals, and secure integrations —
            all in one place.
          </p>
        </header>

        {/* ---------------------------------------------------------------- */}
        {/* Unified Schedule                                                  */}
        {/* ---------------------------------------------------------------- */}
        <section className="bg-crisp-white rounded-2xl border border-slate-gray/25 p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-navy-blue text-lg font-semibold">
              Upcoming Schedule
            </h2>
            <button
              type="button"
              className="text-navy-blue rounded-lg border border-slate-gray/30 px-3 py-1.5 text-xs font-medium hover:bg-slate-gray/5"
            >
              + Add Event
            </button>
          </div>
          <p className="text-slate-gray mt-1 text-sm">
            Custody, sports, medical, and school — unified view.
          </p>

          <ul className="mt-4 space-y-3">
            {SCHEDULE.map((event) => (
              <li
                key={event.id}
                className="rounded-xl border border-slate-gray/20 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-slate-gray">
                      {EVENT_TYPE_LABELS[event.type]}
                    </span>
                    <p className="text-navy-blue mt-0.5 text-sm font-semibold">
                      {event.title}
                    </p>
                    <p className="text-slate-gray mt-1 text-sm">{event.time}</p>
                    {event.location && (
                      <p className="text-slate-gray text-sm">
                        📍 {event.location}
                      </p>
                    )}
                    {event.notes && (
                      <p className="text-slate-gray mt-1 text-xs italic">
                        {event.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Frictionless Approvals */}
                <ApprovalButton eventId={event.id} />

                {/* GPS Verification (only for events with a physical location) */}
                {event.location && (
                  <GpsCheckin
                    eventId={event.id}
                    eventLocation={event.location}
                  />
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* EdTech & MedTech Integrations                                    */}
        {/* ---------------------------------------------------------------- */}
        <section className="bg-crisp-white rounded-2xl border border-slate-gray/25 p-5 shadow-sm sm:p-6">
          <h2 className="text-navy-blue text-lg font-semibold">
            EdTech &amp; MedTech Sync
          </h2>
          <p className="text-slate-gray mt-1 text-sm">
            Role-based, read-only access — prevents digital gatekeeping and
            unauthorised account changes.
          </p>

          <ul className="mt-4 space-y-3">
            {INTEGRATIONS.map((integration) => (
              <li
                key={integration.key}
                className="flex items-center justify-between gap-4 rounded-xl border border-slate-gray/20 p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl" aria-hidden>
                    {integration.icon}
                  </span>
                  <div>
                    <p className="text-navy-blue text-sm font-semibold">
                      {integration.name}
                    </p>
                    <p className="text-slate-gray text-xs">
                      {integration.description}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Connect ${integration.name}`}
                  className="bg-navy-blue text-crisp-white shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium"
                >
                  Connect
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 1-Way Calendar Sync                                              */}
        {/* ---------------------------------------------------------------- */}
        <section className="bg-crisp-white rounded-2xl border border-slate-gray/25 p-5 shadow-sm sm:p-6">
          <h2 className="text-navy-blue text-lg font-semibold">
            1-Way Calendar Sync
          </h2>
          <p className="text-slate-gray mt-1 text-sm">
            Push custody and event schedules to your personal calendar. Your
            personal calendar data is never pulled into Baseline.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              className="flex items-center gap-3 rounded-xl border border-slate-gray/25 p-4 text-left hover:border-navy-blue/40"
            >
              <span className="text-2xl" aria-hidden>
                🍎
              </span>
              <div>
                <p className="text-navy-blue text-sm font-semibold">
                  Apple Calendar
                </p>
                <p className="text-slate-gray text-xs">
                  Subscribe via .ics feed
                </p>
              </div>
            </button>

            <button
              type="button"
              className="flex items-center gap-3 rounded-xl border border-slate-gray/25 p-4 text-left hover:border-navy-blue/40"
            >
              <span className="text-2xl" aria-hidden>
                📅
              </span>
              <div>
                <p className="text-navy-blue text-sm font-semibold">
                  Google Calendar
                </p>
                <p className="text-slate-gray text-xs">
                  Subscribe via .ics feed
                </p>
              </div>
            </button>
          </div>

          <p className="text-slate-gray mt-3 text-xs">
            🔒 Read-only export only. Changes made in your personal calendar do
            not affect Baseline.
          </p>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* GPS Geofence info card                                           */}
        {/* ---------------------------------------------------------------- */}
        <section className="bg-crisp-white rounded-2xl border border-slate-gray/25 p-5 shadow-sm sm:p-6">
          <h2 className="text-navy-blue text-lg font-semibold">
            Opt-In GPS Verification
          </h2>
          <p className="text-slate-gray mt-1 text-sm">
            Objectively verify drop-off and pick-up arrivals using a 500-foot
            geofence. This is never a live tracker — a single snapshot is
            captured only when you tap &quot;Verify arrival&quot;.
          </p>
          <ul className="text-slate-gray mt-3 space-y-1 text-xs">
            <li>✅ Participation is always opt-in</li>
            <li>✅ Only one-time location snapshot — no continuous tracking</li>
            <li>✅ Data is shared only with your co-parent connection</li>
            <li>✅ Verification results visible on each event card above</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
