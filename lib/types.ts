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
};

export type SearchParams = {
  keywords: string;
  states: number[];
  sort: "updateDate" | "creationDate";
  order: "asc" | "desc";
  limit: 25 | 50 | 100;
};

export type SearchResult = {
  example: boolean;
  searchTotal: number;
  checked: number;
  candidates: Candidate[];
  excluded: Record<string, number>;
};

export type Template = {
  id: string;
  name: string;
  category: Category | "tous";
  channel: "invitation" | "message";
  body: string;
};
