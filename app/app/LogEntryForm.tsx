'use client';

import { useMemo, useState } from "react";
import {
  CONTEXT_CATEGORIES,
  type AnySubcategory,
  type MainCategory,
} from "@/lib/shared/category-taxonomy";
import { logEntrySchema } from "@/lib/validation/log-entry.schema";

const MAIN_CATEGORIES = Object.keys(CONTEXT_CATEGORIES) as MainCategory[];

export default function LogEntryForm() {
  const [mainCategory, setMainCategory] = useState<MainCategory>("code_dev");
  const [subcategory, setSubcategory] = useState<AnySubcategory>(
    CONTEXT_CATEGORIES.code_dev.subcategories[0]
  );
  const [notes, setNotes] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const subcategories = useMemo(
    () => CONTEXT_CATEGORIES[mainCategory].subcategories,
    [mainCategory]
  );

  const onMainCategoryChange = (value: MainCategory) => {
    const nextSubcategory = CONTEXT_CATEGORIES[value].subcategories[0];
    setMainCategory(value);
    setSubcategory(nextSubcategory as AnySubcategory);
    setErrorMessage("");
    setStatusMessage("");
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage("");
    setErrorMessage("");

    const parsed = logEntrySchema.safeParse({
      mainCategory,
      subcategory,
      notes: notes.trim() || undefined,
    });

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "Invalid log entry.");
      return;
    }

    setStatusMessage("Log entry is valid.");
  };

  return (
    <section className="mt-8 rounded-2xl border border-slate-gray/25 p-4 sm:p-5">
      <h2 className="text-lg font-semibold">Log Entry Form</h2>
      <p className="mt-1 text-sm text-slate-gray">
        Category and subcategory pair is strictly validated.
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div className="space-y-1">
          <label htmlFor="mainCategory" className="text-sm font-medium">
            Main Category
          </label>
          <select
            id="mainCategory"
            className="w-full rounded-lg border border-slate-gray/35 px-3 py-2 text-sm"
            value={mainCategory}
            onChange={(event) =>
              onMainCategoryChange(event.target.value as MainCategory)
            }
          >
            {MAIN_CATEGORIES.map((categoryKey) => (
              <option key={categoryKey} value={categoryKey}>
                {CONTEXT_CATEGORIES[categoryKey].label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="subcategory" className="text-sm font-medium">
            Subcategory
          </label>
          <select
            id="subcategory"
            className="w-full rounded-lg border border-slate-gray/35 px-3 py-2 text-sm"
            value={subcategory}
            onChange={(event) =>
              setSubcategory(event.target.value as AnySubcategory)
            }
          >
            {subcategories.map((subcat) => (
              <option key={subcat} value={subcat}>
                {subcat}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="notes" className="text-sm font-medium">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            className="w-full rounded-lg border border-slate-gray/35 px-3 py-2 text-sm"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>

        {errorMessage ? (
          <p className="text-sm text-red-700" aria-live="polite">
            {errorMessage}
          </p>
        ) : null}
        {statusMessage ? (
          <p className="text-sm text-green-700" aria-live="polite">
            {statusMessage}
          </p>
        ) : null}

        <button
          type="submit"
          className="rounded-lg bg-navy-blue px-4 py-2 text-sm font-medium text-crisp-white"
        >
          Validate Entry
        </button>
      </form>
    </section>
  );
}
