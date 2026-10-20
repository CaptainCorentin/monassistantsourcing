import type { SearchParams } from "./types";
import { parseSearchParams } from "./search-params";

export type Channel = "linkedin" | "phone";
export type Target = "a_contacter" | "a_relancer" | "tous";
export type Campaign = {
  id: string;
  name: string;
  channel: Channel;
  target: Target;
  filters: SearchParams;
  seniority: "PO1" | "PO2" | "PO3" | "QA";
  discipline: "DIGITAL" | "DATA" | "IA" | "BUILD" | "QA";
  message: string;
};

export const DEFAULT_FILTERS: SearchParams = {
  keywords: "", states: [11, 13], sort: "updateDate", order: "desc", scope: "mine", maxChecks: 300, titlePrefixes: [], requirePhone: false
};

const SENIORITIES = ["PO1", "PO2", "PO3", "QA"] as const;
const DISCIPLINES = ["DIGITAL", "DATA", "IA", "BUILD", "QA"] as const;

export const isUuid = (s: unknown): s is string =>
  typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

// Ligne Supabase → campagne. Des filtres illisibles retombent sur les valeurs par défaut.
export function toCampaign(r: Record<string, unknown>): Campaign {
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    channel: r.channel === "phone" ? "phone" : "linkedin",
    target: r.target === "a_relancer" || r.target === "tous" ? r.target : "a_contacter",
    filters: parseSearchParams(r.filters) ?? DEFAULT_FILTERS,
    seniority: SENIORITIES.find(s => s === r.seniority) ?? "PO2",
    discipline: DISCIPLINES.find(d => d === r.discipline) ?? "DIGITAL",
    message: String(r.message ?? "")
  };
}

// Valide une campagne reçue du navigateur. Les mêmes bornes sont imposées par la base.
export function parseCampaignInput(input: unknown): Omit<Campaign, "id"> | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Record<string, unknown>;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  const message = typeof o.message === "string" ? o.message : "";
  const filters = parseSearchParams(o.filters);
  const seniority = SENIORITIES.find(s => s === o.seniority);
  const discipline = DISCIPLINES.find(d => d === o.discipline);
  const channel = o.channel === "phone" ? "phone" : o.channel === "linkedin" ? "linkedin" : null;
  const target = o.target === "a_contacter" || o.target === "a_relancer" || o.target === "tous" ? o.target : null;
  if (!name || name.length > 80 || message.length > 4000 || !filters || !seniority || !discipline || !channel || !target) return null;
  return { name, channel, target, filters, seniority, discipline, message };
}

export const saveArgs = (token: string, id: string | null, c: Omit<Campaign, "id">) => ({
  p_token: token, p_id: id, p_name: c.name, p_channel: c.channel, p_target: c.target, p_filters: c.filters,
  p_seniority: c.seniority, p_discipline: c.discipline, p_message: c.message
});
