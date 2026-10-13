export type Category = "a_contacter" | "a_relancer" | "vivier";

export type LastContact = { typeOf: number; date: string; byMe: boolean };

export type Candidate = {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  town: string;
  state: number;
  linkedinUrl: string | null;
  category: Category;
  reasons: string[];
  nextContactTypeOf: number | null;
  lastContact: LastContact | null;
  eligibleFrom: string | null;
  updateDate?: string | null;
};

export type SearchParams = {
  keywords: string;
  states: number[];
  sort: "updateDate" | "creationDate";
  order: "asc" | "desc";
  scope: "mine" | "all";
  maxChecks: 100 | 200 | 300;
};

export type SearchResult = {
  example: boolean;
  searchTotal: number;
  checked: number;
  candidates: Candidate[];
  excluded: Record<string, number>;
  contactables?: number;
  notice?: string;
};

export type Template = {
  id: string;
  name: string;
  category: Category | "tous";
  channel: "invitation" | "message";
  body: string;
};
