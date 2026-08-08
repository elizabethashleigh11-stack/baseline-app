import Link from "next/link";

export default function CourtPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Top navigation bar */}
      <header className="bg-navy-blue text-crisp-white shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-widest opacity-70">
              Baseline
            </span>
            <span className="opacity-40">|</span>
            <span className="text-sm font-semibold">Professional Portal</span>
          </div>
          <nav className="hidden gap-6 text-sm sm:flex">
            <Link href="/court-portal" className="opacity-80 hover:opacity-100">
              Cases
            </Link>
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
