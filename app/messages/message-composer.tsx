"use client";

import { useMemo, useState } from "react";

type Moderation = {
  flagged: boolean;
  category: string | null;
  reason: string | null;
  suggestedText: string;
};

export default function MessageComposer() {
  const [connectionId, setConnectionId] = useState("");
  const [draftText, setDraftText] = useState("");
  const [finalText, setFinalText] = useState("");
  const [moderation, setModeration] = useState<Moderation | null>(null);
  const [loadingReview, setLoadingReview] = useState(false);
  const [loadingSend, setLoadingSend] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canReview = useMemo(
    () => connectionId.trim() && draftText.trim() && !loadingReview && !loadingSend,
    [connectionId, draftText, loadingReview, loadingSend]
  );

  async function handleReview() {
    setError(null);
    setSuccess(null);
    setLoadingReview(true);

    try {
      const response = await fetch("/api/messages/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftText }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Review failed");
        setLoadingReview(false);
        return;
      }

      const review = payload.moderation as Moderation;
      setModeration(review);
      setFinalText(review.suggestedText);
    } catch {
      setError("Unable to review the message right now.");
    } finally {
      setLoadingReview(false);
    }
  }

  async function handleSend() {
    if (!moderation) return;

    setError(null);
    setSuccess(null);
    setLoadingSend(true);

    try {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionId,
          draftText,
          finalText,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Message send failed");
        setLoadingSend(false);
        return;
      }

      setSuccess("Message sent successfully.");
      setModeration(null);
      setDraftText("");
      setFinalText("");
    } catch {
      setError("Unable to send the message right now.");
    } finally {
      setLoadingSend(false);
    }
  }

  function resetReview() {
    setModeration(null);
    setFinalText("");
    setError(null);
    setSuccess(null);
  }

  return (
    <div className="mt-5 space-y-4">
      <div>
        <label
          htmlFor="connectionId"
          className="text-slate-gray mb-1 block text-sm font-medium"
        >
          Connection ID
        </label>
        <input
          id="connectionId"
          type="text"
          value={connectionId}
          onChange={(e) => setConnectionId(e.target.value)}
          placeholder="Connection UUID"
          className="focus:border-navy-blue focus:ring-navy-blue w-full rounded-lg border border-slate-gray/40 px-3 py-2 text-sm outline-none focus:ring-2"
        />
      </div>

      <div>
        <label
          htmlFor="draftText"
          className="text-slate-gray mb-1 block text-sm font-medium"
        >
          Draft Message (private vent space)
        </label>
        <textarea
          id="draftText"
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          rows={5}
          placeholder="Type your message draft here..."
          className="focus:border-navy-blue focus:ring-navy-blue w-full rounded-lg border border-slate-gray/40 px-3 py-2 text-sm outline-none focus:ring-2"
        />
      </div>

      {!moderation && (
        <button
          type="button"
          onClick={handleReview}
          disabled={!canReview}
          className="bg-navy-blue text-crisp-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-70"
        >
          {loadingReview ? "Reviewing..." : "Review / Send"}
        </button>
      )}

      {moderation && (
        <div className="rounded-xl border border-slate-gray/30 p-4">
          <p className="text-navy-blue text-sm font-semibold">AI Review</p>
          {moderation.flagged ? (
            <>
              <p className="text-slate-gray mt-2 text-sm">
                Flagged category: <strong>{moderation.category}</strong>
              </p>
              <p className="text-slate-gray mt-1 text-sm">{moderation.reason}</p>
              <div className="mt-3">
                <p className="text-slate-gray text-xs font-medium uppercase tracking-wide">
                  Original Vent (cannot be sent)
                </p>
                <p className="mt-1 rounded-lg border border-slate-gray/25 bg-gray-50 px-3 py-2 text-sm">
                  {draftText}
                </p>
              </div>
            </>
          ) : (
            <p className="text-slate-gray mt-2 text-sm">
              No flagged language detected. You can send this message.
            </p>
          )}

          <div className="mt-3">
            <label
              htmlFor="finalText"
              className="text-slate-gray mb-1 block text-sm font-medium"
            >
              Final Message To Send
            </label>
            <textarea
              id="finalText"
              value={finalText}
              onChange={(e) => setFinalText(e.target.value)}
              rows={4}
              className="focus:border-navy-blue focus:ring-navy-blue w-full rounded-lg border border-slate-gray/40 px-3 py-2 text-sm outline-none focus:ring-2"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSend}
              disabled={loadingSend || !finalText.trim()}
              className="bg-navy-blue text-crisp-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-70"
            >
              {loadingSend ? "Sending..." : "Send Final Message"}
            </button>
            <button
              type="button"
              onClick={resetReview}
              disabled={loadingSend}
              className="border-slate-gray text-navy-blue rounded-lg border px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}
      {success && <p className="text-sm text-green-700">{success}</p>}
    </div>
  );
}
