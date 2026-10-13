import type { Template } from "./types";

const CATEGORIES = ["a_contacter", "a_relancer", "vivier", "tous"] as const;
const CHANNELS = ["invitation", "message"] as const;

export type TemplateRow = {
  id: string;
  name: string;
  category: Template["category"];
  channel: Template["channel"];
  body: string;
  sort_order: number;
};

export const toTemplate = (r: TemplateRow): Template => ({
  id: r.id, name: r.name, category: r.category, channel: r.channel, body: r.body
});

export const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

// Valide un message type reçu du navigateur. Les mêmes bornes sont imposées par la base.
export function parseTemplateInput(input: unknown): Omit<TemplateRow, "id" | "sort_order"> | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Record<string, unknown>;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  const body = typeof o.body === "string" ? o.body : "";
  const category = CATEGORIES.find(c => c === o.category);
  const channel = CHANNELS.find(c => c === o.channel);
  if (!name || name.length > 80 || !body.trim() || body.length > 8000 || !category || !channel) return null;
  return { name, body, category, channel };
}
