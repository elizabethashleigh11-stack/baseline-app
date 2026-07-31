import Link from "next/link";

export default function Home() {
  return (
    <main className="bg-crisp-white text-navy-blue flex min-h-screen items-center px-4 py-10 sm:px-6">
      <section className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-gray/35 bg-white p-6 shadow-sm sm:p-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Baseline
        </h1>
        <p className="mt-3 text-base text-slate-gray sm:text-lg">
          Co-parenting communication in a mobile-first app powered by Next.js
          and Supabase.
        </p>
        <nav className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="bg-navy-blue text-crisp-white rounded-lg px-4 py-2 text-center font-medium"
          >
            Sign in
          </Link>
          <Link
            href="/app"
            className="border-slate-gray text-navy-blue rounded-lg border px-4 py-2 text-center font-medium"
          >
            Dashboard
          </Link>
        </nav>
        <p className="mt-6 text-sm text-slate-gray">API check: /api/health</p>
      </section>
    </main>
  );
}
