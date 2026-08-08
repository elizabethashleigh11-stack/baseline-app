import Link from "next/link";

const quickActions = [
  { label: "New Message", emoji: "💬", href: null },
  { label: "Log Expense", emoji: "🧾", href: null },
  { label: "Add Event", emoji: "📅", href: null },
  { label: "Logistics Hub", emoji: "🗓️", href: "/logistics" },
];

const upcomingSchedule = [
  {
    title: "School Drop-Off",
    time: "Today · 7:30 AM",
    detail: "Riverside Elementary",
  },
  {
    title: "Pediatric Checkup",
    time: "Tomorrow · 10:15 AM",
    detail: "Northside Clinic",
  },
  {
    title: "Soccer Practice",
    time: "Tomorrow · 5:30 PM",
    detail: "Community Field",
  },
];

const recentActivity = [
  {
    title: "2 unread messages",
    detail: "Alex sent updates about pickup timing.",
    when: "5m ago",
  },
  {
    title: "Expense pending review",
    detail: "New receipt added for school supplies.",
    when: "1h ago",
  },
  {
    title: "Reminder",
    detail: "Confirm weekend schedule by tonight.",
    when: "3h ago",
  },
];

const navItems = ["Dashboard", "Calendar", "Messages", "Settings"];

export default function DashboardPage() {
  return (
    <main className="bg-gray-50 min-h-screen px-4 pb-28 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl space-y-5">
        <header className="bg-crisp-white rounded-2xl border border-slate-gray/25 p-5 shadow-sm sm:p-6">
          <p className="text-slate-gray text-sm">Parent Dashboard</p>
          <h1 className="text-navy-blue mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Welcome back, Jordan
          </h1>
        </header>

        <section className="bg-crisp-white rounded-2xl border border-slate-gray/25 p-5 shadow-sm sm:p-6">
          <h2 className="text-navy-blue text-lg font-semibold">Quick Actions</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
            {quickActions.map((action) =>
              action.href ? (
                <Link
                  key={action.label}
                  href={action.href}
                  className="bg-navy-blue text-crisp-white flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium"
                >
                  <span aria-hidden>{action.emoji}</span>
                  {action.label}
                </Link>
              ) : (
                <button
                  key={action.label}
                  type="button"
                  className="bg-navy-blue text-crisp-white flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium"
                >
                  <span aria-hidden>{action.emoji}</span>
                  {action.label}
                </button>
              ),
            )}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <section className="bg-crisp-white rounded-2xl border border-slate-gray/25 p-5 shadow-sm sm:p-6">
            <h2 className="text-navy-blue text-lg font-semibold">
              Upcoming Schedule
            </h2>
            <p className="text-slate-gray mt-1 text-sm">Next 48 hours</p>
            <ul className="mt-4 space-y-3">
              {upcomingSchedule.map((item) => (
                <li
                  key={item.title}
                  className="rounded-xl border border-slate-gray/20 p-3"
                >
                  <p className="text-navy-blue text-sm font-semibold">
                    {item.title}
                  </p>
                  <p className="text-slate-gray mt-1 text-sm">{item.time}</p>
                  <p className="text-slate-gray text-sm">{item.detail}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-crisp-white rounded-2xl border border-slate-gray/25 p-5 shadow-sm sm:p-6">
            <h2 className="text-navy-blue text-lg font-semibold">
              Recent Activity
            </h2>
            <ul className="mt-4 space-y-3">
              {recentActivity.map((item) => (
                <li
                  key={item.title}
                  className="flex items-start justify-between gap-4 rounded-xl border border-slate-gray/20 p-3"
                >
                  <div>
                    <p className="text-navy-blue text-sm font-semibold">
                      {item.title}
                    </p>
                    <p className="text-slate-gray mt-1 text-sm">{item.detail}</p>
                  </div>
                  <span className="text-slate-gray shrink-0 text-xs">
                    {item.when}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <nav className="bg-crisp-white fixed inset-x-0 bottom-0 border-t border-slate-gray/25 shadow-[0_-6px_20px_rgba(27,54,93,0.08)] sm:hidden">
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {navItems.map((item) => {
            const isActive = item === "Dashboard";
            return (
              <li key={item}>
                <button
                  type="button"
                  className={`flex w-full flex-col items-center gap-1 py-3 text-xs font-medium ${
                    isActive ? "text-navy-blue" : "text-slate-gray"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="text-sm" aria-hidden>
                    ●
                  </span>
                  {item}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </main>
  );
}
