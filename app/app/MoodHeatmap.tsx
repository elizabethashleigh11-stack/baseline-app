'use client';

import { useMemo } from "react";

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
  tags: string[] | null;
};

type MoodHeatmapProps = {
  reflections: Reflection[];
};

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function MoodHeatmap({ reflections }: MoodHeatmapProps) {
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

  return (
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
            <div
              key={key}
              className={`h-7 w-7 rounded-md border border-slate-gray/20 transition ${EMOTION_COLORS[emotionKey]}`}
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
  );
}
