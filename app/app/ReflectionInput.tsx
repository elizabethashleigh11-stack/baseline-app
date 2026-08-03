'use client';

import { useEffect, useRef, useState } from "react";
import EmotionTags from "./EmotionTags";

type SaveStatus = "saved" | "saving" | "error";

export default function ReflectionInput() {
  const [isFocused, setIsFocused] = useState(false);
  const [text, setText] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isMounted = useRef(false);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }

    setSaveStatus("saving");

    const delayDebounceFn = setTimeout(async () => {
      try {
        const response = await fetch("/api/reflections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, tags: selectedTags }),
        });

        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        setSaveStatus("saved");
      } catch (error) {
        console.error("Failed to save reflection", error);
        setSaveStatus("error");
      }
    }, 1000);

    return () => clearTimeout(delayDebounceFn);
  }, [text, selectedTags]);

  const handleToggleTag = (tagId: string) => {
    setSelectedTags((prevTags) =>
      prevTags.includes(tagId)
        ? prevTags.filter((id) => id !== tagId)
        : [...prevTags, tagId]
    );
    setSaveStatus("saving");
  };

  const saveStatusLabel =
    saveStatus === "saving"
      ? "Saving..."
      : saveStatus === "error"
        ? "Save failed"
        : "Saved";

  return (
    <section className="mt-8 rounded-2xl border border-slate-gray/25 p-4 sm:p-5">
      <h2 className="text-lg font-semibold">Daily Reflection</h2>
      <p className="mt-1 text-sm text-slate-gray">
        Capture how you are feeling and what happened today.
      </p>

      <div
        className={`mt-4 rounded-xl border bg-white px-3 py-2 transition ${
          isFocused ? "border-navy-blue/60" : "border-slate-gray/25"
        }`}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          rows={1}
          className="max-h-56 w-full resize-none bg-transparent text-sm text-navy-blue outline-none"
          placeholder="Write your reflection..."
        />
      </div>

      <div className="mt-3">
        <EmotionTags selectedTags={selectedTags} onToggleTag={handleToggleTag} />
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-slate-gray">
        <p>🔒 Private note</p>
        <p aria-live="polite">{saveStatusLabel}</p>
      </div>
    </section>
  );
}
