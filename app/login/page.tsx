"use client";

import Link from "next/link";
import { useState } from "react";

type PortalType = "parent" | "professional";

export default function LoginPage() {
  const [selectedPortal, setSelectedPortal] = useState<PortalType | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 500));

    setLoading(false);

    if (!selectedPortal) {
      setError("Please select a portal first.");
      return;
    }

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setSuccess(true);
  }

  function handleBackToPortalSelection() {
    setSelectedPortal(null);
    setEmail("");
    setPassword("");
    setError(null);
    setSuccess(false);
  }

  return (
    <main className="bg-gray-50 flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <section className="bg-crisp-white w-full max-w-md rounded-2xl border border-slate-gray/25 p-6 shadow-sm sm:p-8">
        <h1 className="text-navy-blue text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          Sign in to Baseline
        </h1>
        <p className="text-slate-gray mt-2 text-center text-sm">
          Choose your portal to continue.
        </p>

        {!selectedPortal ? (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setSelectedPortal("parent")}
              className="border-slate-gray/35 text-navy-blue hover:border-navy-blue hover:bg-navy-blue/5 rounded-xl border p-4 text-left"
            >
              <p className="text-sm font-semibold">Parent Portal</p>
              <p className="text-slate-gray mt-1 text-xs">Family coordination</p>
            </button>
            <button
              type="button"
              onClick={() => setSelectedPortal("professional")}
              className="border-slate-gray/35 text-navy-blue hover:border-navy-blue hover:bg-navy-blue/5 rounded-xl border p-4 text-left"
            >
              <p className="text-sm font-semibold">Professional Portal</p>
              <p className="text-slate-gray mt-1 text-xs">Provider access</p>
            </button>
          </div>
        ) : (
          <div className="mt-6">
            <button
              type="button"
              onClick={handleBackToPortalSelection}
              className="text-slate-gray mb-4 text-sm font-medium"
            >
              ← Back
            </button>

            <p className="text-slate-gray mb-4 text-sm">
              Signing in to{" "}
              <span className="text-navy-blue font-semibold">
                {selectedPortal === "parent"
                  ? "Parent Portal"
                  : "Professional Portal"}
              </span>
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="text-slate-gray mb-1 block text-sm font-medium"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="focus:border-navy-blue focus:ring-navy-blue w-full rounded-lg border border-slate-gray/40 px-3 py-2 text-sm outline-none focus:ring-2"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="text-slate-gray mb-1 block text-sm font-medium"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="focus:border-navy-blue focus:ring-navy-blue w-full rounded-lg border border-slate-gray/40 px-3 py-2 text-sm outline-none focus:ring-2"
                />
              </div>

              {error && <p className="text-sm text-red-700">{error}</p>}
              {success && (
                <p className="text-sm text-green-700">
                  Sign-in form submitted for {email}.
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="bg-navy-blue text-crisp-white w-full rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-70"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="mt-4 flex items-center justify-between text-sm">
              <Link href="#" className="text-slate-gray hover:text-navy-blue">
                Forgot Password?
              </Link>
              <Link
                href="/signup"
                className="text-slate-gray hover:text-navy-blue"
              >
                Create an Account
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
