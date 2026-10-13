// Génère l'insertion SQL des blocs par défaut (lib/messages.ts) : node scripts/blocks-seed.mjs
import { DEFAULT_BLOCKS } from "../lib/messages.ts";
// Une ligne par bloc : un texte multiligne devient une chaîne E'…\n…'.
const q = s => {
  const v = String(s).replace(/\\/g, "\\\\").replace(/'/g, "''");
  return v.includes("\n") ? `E'${v.replace(/\n/g, "\\n")}'` : `'${v}'`;
};
const rows = DEFAULT_BLOCKS.map((b, i) => `(${q(b.code)}, ${q(b.kind)}, ${q(b.label)}, ${q(b.body)}, ${i + 1})`);
console.log(`insert into public.message_blocks (code, kind, label, body, sort_order) values\n  ${rows.join(",\n  ")}\non conflict (code) do nothing;`);
