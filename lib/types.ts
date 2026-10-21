export type Category = "a_contacter" | "a_relancer" | "vivier";

export type LastContact = { typeOf: number; date: string; byMe: boolean };

// Action Boond affichée sur la fiche (texte nettoyé et tronqué par N8N).
export type HistoryItem = { typeOf: number; date: string | null; author: string | null; byMe: boolean; text: string };

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
  pastProcessDate?: string | null;
  pastProcessByMe?: boolean | null;
  phone?: string | null;
  addedToCampaign?: boolean;
  company?: string | null;
  companyInTitle?: boolean;
  history?: HistoryItem[];
};

export type SearchParams = {
  keywords: string;
  states: number[];
  sort: "updateDate" | "creationDate";
  order: "asc" | "desc";
  scope: "mine" | "all";
  maxChecks: 100 | 200 | 300;
  titlePrefixes: string[];
  requirePhone: boolean;
  // Évaluation globale Boond (« soft / hard »), filtrée par Boond.
  evaluations: string[];
  // Historique de contact calculé par N8N (motif de classement), filtré dans la session.
  segments: string[];
  // Entreprises citées dans la fiche (titre, compétences, expériences) : recherche Boond puis confirmation N8N.
  companies: string[];
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
