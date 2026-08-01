export type EmotionalCategory =
  | "offensive"
  | "manipulative"
  | "explicit"
  | "hostile"
  | "profanity"
  | "other";

export type ModerationResult = {
  flagged: boolean;
  category: EmotionalCategory | null;
  reason: string | null;
  suggestedText: string;
};

type Rule = {
  category: EmotionalCategory;
  reason: string;
  pattern: RegExp;
};

const RULES: Rule[] = [
  {
    category: "explicit",
    reason: "Explicit sexual language was detected.",
    pattern: /\b(f\*{1,2}k|fuck|s\*{1,2}x|sex(ual)?)\b/i,
  },
  {
    category: "profanity",
    reason: "Profanity or insulting language was detected.",
    pattern: /\b(a\*{1,2}hole|asshole|bitch|shit|damn)\b/i,
  },
  {
    category: "manipulative",
    reason: "Potentially manipulative language was detected.",
    pattern: /\b(always|never)\s+(do this|do that)|\bif you cared\b/i,
  },
  {
    category: "hostile",
    reason: "Hostile or aggressive language was detected.",
    pattern: /\b(i hate|you are awful|you are terrible|i can't stand you)\b/i,
  },
  {
    category: "offensive",
    reason: "Potentially offensive language was detected.",
    pattern: /\bidiot|stupid|crazy\b/i,
  },
];

function buildNeutralRewrite(rawText: string): string {
  const mentionsChildren = /\b(child|children|kid|kids)\b/i.test(rawText);

  if (mentionsChildren) {
    return "I am feeling upset about this conversation and would like to keep our communication focused on the children and next steps.";
  }

  return "I am feeling upset right now. I would like to communicate clearly and focus on practical next steps.";
}

export function normalizeForComparison(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function moderateDraft(rawDraftText: string): ModerationResult {
  const draftText = rawDraftText.trim();
  if (!draftText) {
    return {
      flagged: false,
      category: null,
      reason: null,
      suggestedText: "",
    };
  }

  const matchedRule = RULES.find((rule) => rule.pattern.test(draftText));

  if (!matchedRule) {
    return {
      flagged: false,
      category: null,
      reason: null,
      suggestedText: draftText,
    };
  }

  return {
    flagged: true,
    category: matchedRule.category,
    reason: matchedRule.reason,
    suggestedText: buildNeutralRewrite(draftText),
  };
}
