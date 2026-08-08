"use client";

import { useState } from "react";

type Reaction = "approved" | "declined" | "noted";

interface Props {
  eventId: string;
  initialReaction?: Reaction | null;
}

const REACTIONS: { value: Reaction; emoji: string; label: string }[] = [
  { value: "approved", emoji: "👍", label: "Approve" },
  { value: "declined", emoji: "👎", label: "Decline" },
  { value: "noted", emoji: "📌", label: "Note" },
];

export default function ApprovalButton({ eventId, initialReaction }: Props) {
  const [reaction, setReaction] = useState<Reaction | null>(
    initialReaction ?? null,
  );
  const [pending, setPending] = useState(false);

  async function handleReact(value: Reaction) {
    if (pending) return;
    const next = reaction === value ? null : value;
    setPending(true);
    setReaction(next);
    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, reaction: next }),
      });
      if (!res.ok) throw new Error("Server error");
    } catch {
      // Revert optimistic update on error
      setReaction(reaction);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-3 flex items-center gap-2" aria-label="Quick reaction">
      {REACTIONS.map(({ value, emoji, label }) => (
        <button
          key={value}
          type="button"
          aria-label={label}
          aria-pressed={reaction === value}
          disabled={pending}
          onClick={() => handleReact(value)}
          className={`rounded-full px-3 py-1 text-sm transition ${
            reaction === value
              ? "bg-navy-blue text-crisp-white"
              : "border border-slate-gray/30 text-slate-gray hover:border-navy-blue/50 hover:text-navy-blue"
          } disabled:opacity-50`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
