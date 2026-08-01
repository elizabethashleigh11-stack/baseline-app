"use client";

import { useEffect, useState } from "react";

type Summary = {
  totals: Record<string, number>;
  last30Days: Record<string, number>;
  totalEvents: number;
};

export default function GrowthSummary() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSummary() {
      try {
        const response = await fetch("/api/reflections/summary");
        const payload = await response.json();

        if (!response.ok) {
          setError(payload.error ?? "Unable to load trends");
          setLoading(false);
          return;
        }

        setSummary(payload as Summary);
      } catch {
        setError("Unable to load trends right now.");
      } finally {
        setLoading(false);
      }
    }

    void loadSummary();
  }, []);

  async function handleExport() {
    setError(null);
    setExporting(true);

    try {
      const response = await fetch("/api/reflections/export");
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload.error ?? "Unable to export communication trends.");
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename=([^;]+)/i);
      const filename = match?.[1]?.replaceAll('"', "") ?? "communication-trends.json";

      const downloadUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch {
      setError("Unable to export communication trends right now.");
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return <p className="text-slate-gray mt-4 text-sm">Loading trends...</p>;
  }

  if (error && !summary) {
    return <p className="mt-4 text-sm text-red-700">{error}</p>;
  }

  const totalEntries = Object.entries(summary?.totals ?? {});
  const monthEntries = Object.entries(summary?.last30Days ?? {});

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-slate-gray text-sm">
          Total flagged reflection events: <strong>{summary?.totalEvents ?? 0}</strong>
        </p>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="border-slate-gray text-navy-blue rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-70"
        >
          {exporting ? "Exporting..." : "Export Communication Trends"}
        </button>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <section>
        <h2 className="text-navy-blue text-sm font-semibold">All Time</h2>
        {totalEntries.length === 0 ? (
          <p className="text-slate-gray mt-1 text-sm">No reflection events yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {totalEntries.map(([category, count]) => (
              <li
                key={category}
                className="flex items-center justify-between rounded-lg border border-slate-gray/20 px-3 py-2 text-sm"
              >
                <span className="capitalize">{category}</span>
                <strong>{count}</strong>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-navy-blue text-sm font-semibold">Last 30 Days</h2>
        {monthEntries.length === 0 ? (
          <p className="text-slate-gray mt-1 text-sm">No reflection events in the last 30 days.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {monthEntries.map(([category, count]) => (
              <li
                key={category}
                className="flex items-center justify-between rounded-lg border border-slate-gray/20 px-3 py-2 text-sm"
              >
                <span className="capitalize">{category}</span>
                <strong>{count}</strong>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
