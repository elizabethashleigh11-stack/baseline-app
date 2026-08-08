'use client';

import { useState } from "react";
import {
  CONTEXT_CATEGORIES,
  type MainCategory,
} from "@/lib/shared/category-taxonomy";

type ContextNavProps = {
  onSelect?: (mainCategory: MainCategory, subcategory: string) => void;
};

const MAIN_CATEGORIES = Object.keys(CONTEXT_CATEGORIES) as MainCategory[];

export default function ContextNav({ onSelect }: ContextNavProps) {
  const [activeMain, setActiveMain] = useState<MainCategory>("code_dev");
  const [activeSubcategory, setActiveSubcategory] = useState(
    CONTEXT_CATEGORIES.code_dev.subcategories[0]
  );

  const activeSubcategories = CONTEXT_CATEGORIES[activeMain].subcategories;

  return (
    <section className="mt-8 rounded-2xl border border-slate-gray/25 p-4 sm:p-5">
      <h2 className="text-lg font-semibold">Category Navigation</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {MAIN_CATEGORIES.map((mainCategory) => {
          const isActive = activeMain === mainCategory;
          return (
            <button
              key={mainCategory}
              type="button"
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                isActive
                  ? "border-navy-blue bg-navy-blue text-crisp-white"
                  : "border-slate-gray/35 text-slate-gray hover:border-navy-blue/50 hover:text-navy-blue"
              }`}
              onClick={() => {
                const nextSubcategory =
                  CONTEXT_CATEGORIES[mainCategory].subcategories[0];
                setActiveMain(mainCategory);
                setActiveSubcategory(nextSubcategory);
                onSelect?.(mainCategory, nextSubcategory);
              }}
            >
              {CONTEXT_CATEGORIES[mainCategory].label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {activeSubcategories.map((subcategory) => {
          const isActive = activeSubcategory === subcategory;
          return (
            <button
              key={subcategory}
              type="button"
              className={`rounded-full border px-3 py-1.5 text-xs transition sm:text-sm ${
                isActive
                  ? "border-navy-blue/40 bg-navy-blue/10 text-navy-blue"
                  : "border-slate-gray/25 text-slate-gray hover:border-navy-blue/40 hover:text-navy-blue"
              }`}
              onClick={() => {
                setActiveSubcategory(subcategory);
                onSelect?.(activeMain, subcategory);
              }}
            >
              {subcategory}
            </button>
          );
        })}
      </div>
    </section>
  );
}
