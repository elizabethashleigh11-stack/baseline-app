"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type DocketResult = {
  ok: boolean;
  sha256_hash: string;
  storage_path: string;
  signed_url: string | null;
  generated_at: string;
};

const navLinks = (connectionId: string) => [
  { href: `/court-portal/${connectionId}`, label: "Vitals" },
  { href: `/court-portal/${connectionId}/sla`, label: "SLA Log" },
  { href: `/court-portal/${connectionId}/graduation`, label: "Graduation" },
  { href: `/court-portal/${connectionId}/docket`, label: "Docket" },
];

export default function DocketPage() {
  const params = useParams();
  const connectionId = Array.isArray(params.connectionId)
    ? params.connectionId[0]
    : (params.connectionId as string);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DocketResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generateDocket() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/docket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_id: connectionId }),
      });

      const json = (await res.json()) as DocketResult & { error?: string };

      if (!res.ok || !json.ok) {
        setError(json.error ?? `Request failed with status ${res.status}`);
        return;
      }

      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const links = navLinks(connectionId);

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
          One-Click Docket
        </h1>
        <p className="text-slate-gray mt-1 text-sm">
          Generate a timestamped, cryptographically hashed PDF report
          summarizing all behavioral flags, SLA compliance data, and financial
          activity for this case. The SHA-256 hash is permanently logged.
        </p>
      </div>

      {/* Sub-navigation */}
      <nav className="flex gap-2 border-b border-slate-gray/20 pb-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 pb-2 text-sm font-medium first:pl-0 ${
              link.label === "Docket"
                ? "text-navy-blue border-b-2 border-navy-blue"
                : "text-slate-gray hover:text-navy-blue"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Generator card */}
      <section className="bg-crisp-white rounded-2xl border border-slate-gray/25 p-6 shadow-sm">
        <h2 className="text-navy-blue font-semibold">Generate PDF Report</h2>
        <p className="text-slate-gray mt-1 text-sm">
          The report includes: case header, SLA compliance table, behavioral
          flag log, financial ledger summary, and a SHA-256 integrity hash.
        </p>

        <button
          type="button"
          onClick={generateDocket}
          disabled={loading}
          className="bg-navy-blue text-crisp-white mt-4 rounded-lg px-6 py-2.5 text-sm font-medium disabled:opacity-70"
        >
          {loading ? "Generating…" : "Generate Docket PDF"}
        </button>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">Error</p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-green-800">
              ✓ Docket generated and logged
            </p>

            <div className="space-y-1 text-sm">
              <p className="text-slate-gray">
                <span className="font-medium text-navy-blue">Generated:</span>{" "}
                {new Date(result.generated_at).toLocaleString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  timeZoneName: "short",
                })}
              </p>
              <p className="text-slate-gray break-all">
                <span className="font-medium text-navy-blue">SHA-256:</span>{" "}
                <code className="font-mono text-xs">{result.sha256_hash}</code>
              </p>
              <p className="text-slate-gray break-all">
                <span className="font-medium text-navy-blue">Storage:</span>{" "}
                <code className="font-mono text-xs">{result.storage_path}</code>
              </p>
            </div>

            {result.signed_url ? (
              <a
                href={result.signed_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-green-600 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100"
              >
                ↓ Download PDF (valid for 1 hour)
              </a>
            ) : (
              <p className="text-slate-gray text-sm">
                PDF stored but signed URL unavailable. Contact administrator.
              </p>
            )}
          </div>
        )}
      </section>

      <p className="text-slate-gray text-xs">
        Each generated report is cryptographically logged in the{" "}
        <code className="font-mono">docket_reports</code> table with the file
        hash for long-term court-admissible verification.
      </p>
    </div>
  );
}
