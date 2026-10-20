"use client";

import { useState } from "react";
import { DEFAULT_BLOCKS, KIND_LABELS, type Block } from "@/lib/messages";
import { api } from "./shared";

// Banque de messages : chaque bloc se modifie ici, la campagne s'en sert pour pré-remplir son message.
export default function BlocksEditor({ blocks, setBlocks, notify, error }: {
  blocks: Block[];
  setBlocks: React.Dispatch<React.SetStateAction<Block[]>>;
  notify: (msg: string) => void;
  error: string;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const kinds = [...new Set(blocks.map(b => b.kind))];
  const original = (code: string) => DEFAULT_BLOCKS.find(b => b.code === code)?.body;

  async function save(code: string) {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      const saved = await api<Block>(`/api/blocks/${encodeURIComponent(code)}`, "PUT", { body: draft.slice(0, 2000) });
      setBlocks(prev => prev.map(b => b.code === saved.code ? saved : b));
      setEditing(null);
      notify("Bloc enregistré");
    } catch (err) {
      notify((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel">
      <details>
        <summary><h2 style={{ display: "inline" }}>Banque de messages</h2></summary>
        <p className="hint" style={{ margin: "6px 0 0" }}>
          Chaque message est assemblé à partir de ces blocs. Une modification s&apos;applique tout de suite à toutes les fiches.
          Variables : <code>{"{{prenom}}"}</code> <code>{"{{titre}}"}</code> <code>{"{{entreprise}}"}</code> <code>{"{{anciennete}}"}</code> <code>{"{{argument_metier}}"}</code>.
        </p>
        {error && <p className="warn" style={{ marginTop: 10 }}>{error}</p>}
        {kinds.map(kind => (
          <div key={kind} style={{ marginTop: 14 }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 14 }}>{KIND_LABELS[kind] ?? kind}</h3>
            <div className="tpl-list">
              {blocks.filter(b => b.kind === kind).map(b => (
                <div className="tpl" key={b.code} style={{ display: "block" }}>
                  <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                    <div className="name">{b.label}</div>
                    {editing !== b.code && !error && (
                      <button className="btn small" type="button" onClick={() => { setEditing(b.code); setDraft(b.body); }}>Modifier</button>
                    )}
                  </div>
                  {editing === b.code ? (
                    <form onSubmit={e => { e.preventDefault(); save(b.code); }}>
                      <textarea aria-label={`Texte du bloc ${b.label}`} maxLength={2000} required value={draft} onChange={e => setDraft(e.target.value)} />
                      <div className="row" style={{ justifyContent: "flex-end" }}>
                        {original(b.code) && original(b.code) !== draft && (
                          <button className="btn small" type="button" onClick={() => setDraft(original(b.code) ?? draft)}>Texte d&apos;origine</button>
                        )}
                        <button className="btn small" type="button" onClick={() => setEditing(null)}>Annuler</button>
                        <button className="btn small primary" type="submit" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
                      </div>
                    </form>
                  ) : (
                    <div className="hint" style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{b.body}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </details>
    </section>
  );
}
