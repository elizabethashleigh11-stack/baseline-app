'use client';

const EMOTIONS = [
  {
    id: "anxious",
    label: "Anxious",
    activeClass: "bg-indigo-100 text-indigo-700 border-indigo-200",
  },
  {
    id: "frustrated",
    label: "Frustrated",
    activeClass: "bg-rose-100 text-rose-700 border-rose-200",
  },
  {
    id: "sad",
    label: "Sad",
    activeClass: "bg-sky-100 text-sky-700 border-sky-200",
  },
  {
    id: "content",
    label: "Content",
    activeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  {
    id: "exhausted",
    label: "Exhausted",
    activeClass: "bg-stone-100 text-stone-700 border-stone-200",
  },
] as const;

type EmotionTagsProps = {
  selectedTags: string[];
  onToggleTag: (tagId: string) => void;
};

export default function EmotionTags({
  selectedTags,
  onToggleTag,
}: EmotionTagsProps) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {EMOTIONS.map((emotion) => {
          const isActive = selectedTags.includes(emotion.id);
          return (
            <button
              key={emotion.id}
              type="button"
              onClick={() => onToggleTag(emotion.id)}
              aria-pressed={isActive}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                isActive
                  ? emotion.activeClass
                  : "border-slate-gray/35 text-slate-gray hover:border-slate-gray/50"
              }`}
            >
              {emotion.label}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled
        className="mt-2 text-xs text-slate-gray/80 underline decoration-dotted underline-offset-2 disabled:cursor-not-allowed"
      >
        + Add custom
      </button>
    </div>
  );
}
