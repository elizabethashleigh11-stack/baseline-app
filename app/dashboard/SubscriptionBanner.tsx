"use client";

import { useState } from "react";

type Plan = "free" | "premium";

interface SubscriptionBannerProps {
  currentPlan: Plan;
  isPayingUser: boolean;
  lockedUntil?: string; // ISO date string if the payer is already set by the other parent
}

export default function SubscriptionBanner({
  currentPlan,
  isPayingUser,
  lockedUntil,
}: SubscriptionBannerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgraded, setUpgraded] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    try {
      // In production this would redirect to a Stripe Checkout session.
      // For now we surface the intent to the console and show a success state.
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "premium" }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Upgrade failed.");
      }
      setUpgraded(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (currentPlan === "premium" && !isPayingUser) {
    return (
      <div className="rounded-2xl border border-slate-gray/20 bg-green-50 p-4 text-sm text-green-800">
        <span className="font-semibold">✓ Guardrails Active</span> — the other
        parent has subscribed to Baseline Premium. Your account is covered.
      </div>
    );
  }

  if (currentPlan === "premium" && isPayingUser) {
    return (
      <div className="rounded-2xl border border-slate-gray/20 bg-green-50 p-4 text-sm text-green-800">
        <span className="font-semibold">✓ Baseline Premium</span> — you are
        covering both accounts ($12/mo). Guardrails are active for both parents.
        {lockedUntil && (
          <p className="mt-1 text-xs text-green-700">
            Next billing renewal: {lockedUntil}
          </p>
        )}
      </div>
    );
  }

  // Free tier — offer upgrade
  return (
    <div className="rounded-2xl border border-slate-gray/25 bg-amber-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-navy-blue text-sm font-semibold">
            🔒 Mandated Free Tier
          </p>
          <p className="text-slate-gray mt-1 text-xs">
            One parent can subscribe to Baseline Premium ($12/mo) to activate
            AI guardrails for both accounts. The other parent stays on this
            protected free tier automatically.
          </p>
        </div>
        {upgraded ? (
          <p className="text-sm font-medium text-green-700">✓ Upgraded!</p>
        ) : (
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={loading}
            className="bg-navy-blue text-crisp-white shrink-0 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {loading ? "Processing…" : "Upgrade to Premium"}
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
