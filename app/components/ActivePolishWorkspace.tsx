'use client';

import { useState } from "react";

type ToneMetrics = {
  empathy: number;
  directness: number;
  formality: number;
  frustration: number;
};

type SuggestionCardProps = {
  title: string;
  detail: string;
};

type ToneDialProps = {
  label: string;
  value: number;
  tone?: "good" | "warning";
};

const TONE_METRICS: ToneMetrics = {
  empathy: 45,
  directness: 85,
  formality: 60,
  frustration: 75, // Elevated frustration
};

export function ActivePolishWorkspace() {
  const [draftText, setDraftText] = useState("");

  // Simulated real-time metrics (These would be fed by your AI API)
  const toneMetrics = TONE_METRICS;

  const suggestions: SuggestionCardProps[] = [];

  if (toneMetrics.frustration >= 70) {
    suggestions.push({
      title: "Lower the heat",
      detail:
        "Swap charged words with neutral language so the message feels calmer.",
    });
  }

  if (toneMetrics.empathy < 60) {
    suggestions.push({
      title: "Add acknowledgment",
      detail:
        "Open with one line that validates the other person's perspective before your request.",
    });
  }

  if (toneMetrics.directness > 80) {
    suggestions.push({
      title: "Soften directness",
      detail:
        "Keep your core ask, but add context and one collaborative phrase.",
    });
  }

  if (!suggestions.length) {
    suggestions.push({
      title: "Tone looks balanced",
      detail: "No critical edits needed. Focus on clarity and brevity.",
    });
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-gray/25 p-4 sm:p-5">
      <h2 className="text-lg font-semibold">Active Polish Workspace</h2>
      <p className="mt-1 text-sm text-slate-gray">
        Draft your message and review live tone guidance before sending.
      </p>

      <div className="mt-4 rounded-xl border border-slate-gray/25 bg-white px-3 py-2">
        <textarea
          value={draftText}
          onChange={(event) => setDraftText(event.target.value)}
          rows={6}
          placeholder="Paste or write your draft here..."
          className="w-full resize-y bg-transparent text-sm text-navy-blue outline-none"
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ToneDial label="Empathy" value={toneMetrics.empathy} />
        <ToneDial label="Directness" value={toneMetrics.directness} />
        <ToneDial label="Formality" value={toneMetrics.formality} />
        <ToneDial
          label="Frustration"
          value={toneMetrics.frustration}
          tone={toneMetrics.frustration >= 70 ? "warning" : "good"}
        />
      </div>

      <div className="mt-5 space-y-3">
        {suggestions.map((suggestion, index) => (
          <SuggestionCard
            key={`${suggestion.title}-${index}`}
            title={suggestion.title}
            detail={suggestion.detail}
          />
        ))}
      </div>
    </section>
  );
}

function ToneDial({ label, value, tone = "good" }: ToneDialProps) {
  const toneClass = tone === "warning" ? "text-rose-700" : "text-navy-blue";
  const meterClass = tone === "warning" ? "bg-rose-500" : "bg-navy-blue";

  return (
    <div className="rounded-xl border border-slate-gray/25 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-gray">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${toneClass}`}>{value}%</p>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-gray/15">
        <div className={`h-full ${meterClass}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function SuggestionCard({ title, detail }: SuggestionCardProps) {
  return (
    <article className="rounded-xl border border-slate-gray/25 bg-crisp-white p-3">
      <h3 className="text-sm font-semibold text-navy-blue">{title}</h3>
      <p className="mt-1 text-sm text-slate-gray">{detail}</p>
    </article>
  );
}
