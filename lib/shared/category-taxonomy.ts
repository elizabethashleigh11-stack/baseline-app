export const CONTEXT_CATEGORIES = {
  code_dev: {
    label: "Code & Dev",
    subcategories: ["PR Reviews", "Bug / Issue Tickets", "Tech Specs / Docs"],
  },
  reporting: {
    label: "Reporting",
    subcategories: [
      "Status Updates",
      "Data / Analytics",
      "Incident Post-mortems",
    ],
  },
  team_comms: {
    label: "Team Comms",
    subcategories: ["Manager 1:1s", "Peer Feedback", "Delegation / Tasks"],
  },
  stakeholders: {
    label: "Stakeholders",
    subcategories: [
      "Feature Pushback",
      "Client Presentations",
      "Vendor Emails",
    ],
  },
  admin_hr: {
    label: "Admin & HR",
    subcategories: ["Goal Setting", "Performance Reviews", "General Requests"],
  },
} as const;

export type MainCategory = keyof typeof CONTEXT_CATEGORIES;

export type SubcategoryFor<C extends MainCategory> =
  (typeof CONTEXT_CATEGORIES)[C]["subcategories"][number];

export type AnySubcategory =
  (typeof CONTEXT_CATEGORIES)[MainCategory]["subcategories"][number];

export type LogEntryCategoryPair = {
  [C in MainCategory]: {
    mainCategory: C;
    subcategory: SubcategoryFor<C>;
  };
}[MainCategory];

export type LogEntry = LogEntryCategoryPair & {
  id: string;
  notes?: string | null;
  createdAt: Date;
};
