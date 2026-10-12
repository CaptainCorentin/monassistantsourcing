import type { SearchParams } from "./types";

const STATES = [0, 5, 11, 13];
const LIMITS = [25, 50, 100] as const;

// Valide côté serveur tout ce qui partira vers Boond.
export function parseSearchParams(input: unknown): SearchParams | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Record<string, unknown>;
  const keywords = typeof o.keywords === "string" ? o.keywords.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 120) : "";
  const states = Array.isArray(o.states) ? [...new Set(o.states.map(Number))].filter(s => STATES.includes(s)) : [];
  const sort = o.sort === "creationDate" ? "creationDate" : "updateDate";
  const order = o.order === "desc" ? "desc" : "asc";
  const limit = LIMITS.find(l => l === Number(o.limit));
  if (!states.length || !limit) return null;
  return { keywords, states, sort, order, limit };
}
