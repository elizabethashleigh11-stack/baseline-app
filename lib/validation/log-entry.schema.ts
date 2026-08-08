import { z } from "zod";
import {
  CONTEXT_CATEGORIES,
  type AnySubcategory,
  type MainCategory,
} from "@/lib/shared/category-taxonomy";

const mainCategoryValues = Object.keys(CONTEXT_CATEGORIES) as MainCategory[];
if (mainCategoryValues.length === 0) {
  throw new Error("CONTEXT_CATEGORIES must define at least one main category.");
}
const mainCategorySchema = z.enum([
  mainCategoryValues[0],
  ...mainCategoryValues.slice(1),
]);

const allSubcategoryValues = Array.from(
  new Set(
    Object.values(CONTEXT_CATEGORIES).flatMap((category) => category.subcategories)
  )
) as AnySubcategory[];
if (allSubcategoryValues.length === 0) {
  throw new Error("CONTEXT_CATEGORIES must define at least one subcategory.");
}
const subcategorySchema = z.enum([
  allSubcategoryValues[0],
  ...allSubcategoryValues.slice(1),
]);

export const logEntrySchema = z
  .object({
    mainCategory: mainCategorySchema,
    subcategory: subcategorySchema,
    notes: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    const allowedSubcategories =
      CONTEXT_CATEGORIES[data.mainCategory].subcategories as readonly string[];
    if (!allowedSubcategories.includes(data.subcategory)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["subcategory"],
        message: "Subcategory must belong to selected main category.",
      });
    }
  });

export type LogEntryInput = z.infer<typeof logEntrySchema>;
