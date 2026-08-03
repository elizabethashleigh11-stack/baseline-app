'use client';

import { useMemo, useState } from "react";

const EMOTION_COLORS: Record<string, string> = {
  anxious: "bg-indigo-200 hover:bg-indigo-300",
  frustrated: "bg-rose-200 hover:bg-rose-300",
  sad: "bg-sky-200 hover:bg-sky-300",
  content: "bg-emerald-200 hover:bg-emerald-300",
  exhausted: "bg-stone-200 hover:bg-stone-300",
  none: "bg-gray-50 hover:bg-gray-100",
};

type Reflection = {
  entry_date: string;
  text: string;
  tags: string[] | null;
};

type MoodHeatmapProps = {
  reflections: Reflection[];
};

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function MoodHeatmap({ reflections }: MoodHeatmapProps) {
  const [selectedEntry, setSelectedEntry] = useState<{
    reflection: Reflection;
    day: Date;
  } | null>(null);

  const reflectionsByDate = useMemo(() => {
    const map = new Map<string, Reflection>();
    for (const reflection of reflections) {
      map.set(reflection.entry_date, reflection);
    }
    return map;
  }, [reflections]);

  const past30Days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: 30 }).map((_, i) => {
      const day = new Date(today);
      day.setDate(today.getDate() - (29 - i));
      return day;
    });
  }, []);

  const closeDrawer = () => {
    setSelectedEntry(null);
  };

  return (
    <>
      <section className="mt-8 rounded-2xl border border-slate-gray/25 p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Mood Heatmap</h2>
        <p className="mt-1 text-sm text-slate-gray">Your last 30 days at a glance.</p>

        <div className="mt-4 grid grid-cols-10 gap-2">
          {past30Days.map((day) => {
            const key = dateKey(day);
            const reflection = reflectionsByDate.get(key);
            const primaryTag = reflection?.tags?.[0];
            const emotionKey =
              primaryTag && EMOTION_COLORS[primaryTag] ? primaryTag : "none";

            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  if (reflection) {
                    setSelectedEntry({ reflection, day });
                  }
                }}
                disabled={!reflection}
                className={`h-7 w-7 rounded-md border border-slate-gray/20 transition ${EMOTION_COLORS[emotionKey]} ${
                  reflection
                    ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-navy-blue/40"
                    : "cursor-default"
                }`}
                title={`${day.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}${primaryTag ? ` · ${primaryTag}` : " · No entry"}`}
                aria-label={`${day.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}: ${primaryTag ?? "No entry"}`}
              />
            );
          })}
        </div>
      </section>

      <div
        className={`fixed inset-0 z-40 transition ${
          selectedEntry ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!selectedEntry}
      >
        <button
          type="button"
          className={`absolute inset-0 bg-navy-blue/30 transition ${
            selectedEntry ? "opacity-100" : "opacity-0"
          }`}
          onClick={closeDrawer}
          aria-label="Close reflection drawer"
        />
        <aside
          className={`absolute right-0 top-0 h-full w-full max-w-md border-l border-slate-gray/20 bg-white p-5 shadow-xl transition-transform sm:w-[28rem] ${
            selectedEntry ? "translate-x-0" : "translate-x-full"
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Reflection details"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold">Daily Reflection</h3>
              <p className="mt-1 text-sm text-slate-gray">
                {selectedEntry?.day.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={closeDrawer}
              className="rounded-md p-2 text-slate-gray transition hover:bg-slate-gray/10"
              aria-label="Close drawer"
            >
              ✕
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <p className="rounded-lg bg-crisp-white p-3 text-sm text-navy-blue">
              {selectedEntry?.reflection.text.trim()
                ? selectedEntry.reflection.text
                : "No reflection text was recorded for this day."}
            </p>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-gray">
                Emotions
              </h4>
              {selectedEntry?.reflection.tags?.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedEntry.reflection.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-slate-gray/30 px-2.5 py-1 text-xs font-medium text-navy-blue"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-gray">No emotion tags.</p>
              )}
            </div>
          </div>

          <p className="mt-6 text-xs text-slate-gray">🔒 Private note</p>
        </aside>
      </div>
    </>
  );
}
