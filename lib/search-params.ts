import type { SearchParams } from "./types";
import { SEGMENTS } from "./segments";

const STATES = [0, 5, 11, 13];
const CHECKS = [100, 200, 300] as const;
export const TITLE_PREFIXES = ["PO1", "PO2", "PO3", "QA0", "QA1", "QA2", "NONE"];
// Valeurs du dictionnaire Boond (setting.evaluation) : soft skills / hard skills Product.
export const EVALUATIONS = ["A", "B", "C", "D", "A/A", "A/B", "A/C", "A/D", "B/A", "B/B", "B/C", "B/D", "C/A", "C/B", "C/C", "C/D"];

// Valide côté serveur tout ce qui partira vers N8N puis Boond.
export function parseSearchParams(input: unknown): SearchParams | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Record<string, unknown>;
  const keywords = typeof o.keywords === "string" ? o.keywords.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 120) : "";
  const states = Array.isArray(o.states) ? [...new Set(o.states.map(Number))].filter(s => STATES.includes(s)) : [];
  const sort = o.sort === "creationDate" ? "creationDate" : "updateDate";
  const order = o.order === "asc" ? "asc" : "desc";
  const scope = o.scope === "all" ? "all" : "mine";
  const maxChecks = CHECKS.find(l => l === Number(o.maxChecks));
  const titlePrefixes = Array.isArray(o.titlePrefixes) ? [...new Set(o.titlePrefixes.map(String))].filter(p => TITLE_PREFIXES.includes(p)) : [];
  const requirePhone = o.requirePhone === true;
  const evaluations = Array.isArray(o.evaluations) ? [...new Set(o.evaluations.map(String))].filter(e => EVALUATIONS.includes(e)) : [];
  const companies = Array.isArray(o.companies)
    ? [...new Set(o.companies.map(c => String(c).trim()))].filter(c => /^[\p{L}\p{N} &.'-]{2,40}$/u.test(c)).slice(0, 30)
    : [];
  const segments = Array.isArray(o.segments) ? [...new Set(o.segments.map(String))].filter(e => SEGMENTS.includes(e)) : [];
  if (!states.length || !maxChecks) return null;
  return { keywords, states, sort, order, scope, maxChecks, titlePrefixes, requirePhone, evaluations, segments, companies };
}
