import OptOutFlow from "./OptOutFlow";

/**
 * /dashboard/settings/opt-out
 *
 * Displays the mutual opt-out request UI.
 * In a real app the connectionId and caseCreatedAt would be fetched
 * server-side from the authenticated user's active connection.
 */
export default function OptOutPage() {
  // Placeholder values — replace with real server-side data fetch once
  // the connections table is wired to the session.
  const connectionId = "00000000-0000-0000-0000-000000000000";
  const caseCreatedAt = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString(); // 30 days ago (still locked)

  return (
    <main className="bg-gray-50 min-h-screen px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <h1 className="text-navy-blue text-2xl font-semibold">
            Case Settings
          </h1>
          <p className="text-slate-gray mt-1 text-sm">
            Manage your Baseline case preferences.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-navy-blue text-lg font-semibold">
            Mutual Opt-Out
          </h2>
          <p className="text-slate-gray text-sm">
            Baseline remains active until both parents agree in writing to
            close the case, or until the youngest child turns 18. Submitting a
            request notifies the other parent; the case only closes once they
            countersign.
          </p>
          <OptOutFlow
            connectionId={connectionId}
            caseCreatedAt={caseCreatedAt}
          />
        </section>
      </div>
    </main>
  );
}
