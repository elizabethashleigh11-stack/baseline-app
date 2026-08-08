"use client";

import { useState } from "react";

type RequestStatus = "idle" | "requesting" | "pending" | "locked" | "error";

interface OptOutFlowProps {
  connectionId: string;
  /** ISO string of case creation date — used to compute the 18-month lock */
  caseCreatedAt: string;
}

function computeLockDate(caseCreatedAt: string): Date {
  const d = new Date(caseCreatedAt);
  d.setMonth(d.getMonth() + 18);
  return d;
}

export default function OptOutFlow({
  connectionId,
  caseCreatedAt,
}: OptOutFlowProps) {
  const [status, setStatus] = useState<RequestStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const lockDate = computeLockDate(caseCreatedAt);
  const isLocked = new Date() < lockDate;

  async function handleRequest() {
    setStatus("requesting");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/opt-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_id: connectionId }),
      });
      const body = (await res.json()) as {
        error?: string;
        locked_until?: string;
      };

      if (res.status === 403 && body.locked_until) {
        setLockedUntil(body.locked_until);
        setStatus("locked");
        return;
      }

      if (!res.ok) {
        throw new Error(body.error ?? "Request failed.");
      }

      setStatus("pending");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  if (status === "pending") {
    return (
      <div className="rounded-2xl border border-slate-gray/25 bg-blue-50 p-5">
        <p className="text-navy-blue font-semibold">
          📋 Opt-Out Request Submitted
        </p>
        <p className="text-slate-gray mt-2 text-sm">
          Your request to leave Baseline has been sent to the other parent. The
          case will only close once they countersign. You will receive a
          notification when they respond.
        </p>
      </div>
    );
  }

  if (status === "locked") {
    return (
      <div className="rounded-2xl border border-slate-gray/25 bg-amber-50 p-5">
        <p className="text-navy-blue font-semibold">🔒 Opt-Out Locked</p>
        <p className="text-slate-gray mt-2 text-sm">
          Baseline is legally mandated for 18 months after case creation. You
          may request to leave after{" "}
          <strong>
            {lockedUntil
              ? new Date(lockedUntil).toLocaleDateString()
              : lockDate.toLocaleDateString()}
          </strong>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-gray/25 bg-white p-5 shadow-sm">
      <h3 className="text-navy-blue font-semibold">Request to Leave Baseline</h3>
      <p className="text-slate-gray mt-2 text-sm">
        Both parents must agree in writing to close this case. Once you submit a
        request, the other parent will be notified and asked to countersign.
        {isLocked && (
          <span className="ml-1 font-medium text-amber-700">
            Note: the 18-month mandatory period ends on{" "}
            {lockDate.toLocaleDateString()}.
          </span>
        )}
      </p>

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-4 rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Request to Leave
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-medium text-red-700">
            Are you sure? This will notify the other parent and begin the
            mutual opt-out process.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleRequest}
              disabled={status === "requesting"}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {status === "requesting" ? "Submitting…" : "Yes, Submit Request"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-xl border border-slate-gray/30 px-4 py-2 text-sm font-medium text-slate-gray"
            >
              Cancel
            </button>
          </div>
          {status === "error" && errorMsg && (
            <p className="text-xs text-red-600">{errorMsg}</p>
          )}
        </div>
      )}
    </div>
  );
}
