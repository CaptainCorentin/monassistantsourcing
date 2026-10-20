"use client";

import { useState } from "react";
import type { Campaign } from "@/lib/campaigns";
import { DEFAULT_FILTERS } from "@/lib/campaigns";
import { DISCIPLINES, SENIORITIES, campaignTemplate, type Block, type Discipline, type Seniority } from "@/lib/messages";
import { PREFIX_LABELS, STATES, api } from "./shared";

type Draft = Omit<Campaign, "id">;

const EMPTY: Draft = {
  name: "", channel: "linkedin", target: "a_contacter", filters: DEFAULT_FILTERS,
  seniority: "PO2", discipline: "DIGITAL", message: ""
};
const TARGETS = { a_contacter: "À contacter", a_relancer: "À relancer", tous: "À contacter et à relancer" } as const;

// Résumé du ciblage d'une campagne, en une ligne.
function describe(c: Draft) {
  const f = c.filters;
  return [
    f.states.map(s => STATES[s]).join(" + "),
    f.titlePrefixes.length ? f.titlePrefixes.map(p => PREFIX_LABELS[p]).join(", ") : "tous les titres",
    f.keywords ? `« ${f.keywords} »` : "",
    f.scope === "all" ? "tout le vivier WeFiiT" : "mes fiches",
    f.requirePhone ? "avec téléphone" : "",
    TARGETS[c.target]
  ].filter(Boolean).join(" · ");
}

// Séniorité du message déduite des préfixes ciblés, quand ils sont homogènes.
function seniorityFromPrefixes(prefixes: string[], current: Seniority): Seniority {
  const set = new Set(prefixes.map(p => (p.startsWith("QA") ? "QA" : p)));
  if (set.size !== 1) return current;
  const only = [...set][0];
  return only === "PO1" || only === "PO2" || only === "PO3" || only === "QA" ? only : current;
}

export default function CampaignsScreen({ campaigns, setCampaigns, blocks, onLaunch, notify, error }: {
  campaigns: Campaign[];
  setCampaigns: React.Dispatch<React.SetStateAction<Campaign[]>>;
  blocks: Block[];
  onLaunch: (c: Campaign) => void;
  notify: (msg: string) => void;
  error: string;
}) {
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  function edit(c: Campaign | null) {
    setEditing(c);
    setDraft(c ? { ...c } : { ...EMPTY, filters: { ...DEFAULT_FILTERS } });
    setConfirmArchive(false);
  }
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft(d => (d ? { ...d, [k]: v } : d));
  const setFilter = <K extends keyof Draft["filters"]>(k: K, v: Draft["filters"][K]) =>
    setDraft(d => (d ? { ...d, filters: { ...d.filters, [k]: v } } : d));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft || !draft.name.trim() || !draft.filters.states.length) return;
    setSaving(true);
    try {
      const body = { ...draft, name: draft.name.trim().slice(0, 80), message: draft.message.slice(0, 4000) };
      const saved = editing
        ? await api<Campaign>(`/api/campaigns/${editing.id}`, "PUT", body)
        : await api<Campaign>("/api/campaigns", "POST", body);
      setCampaigns(prev => (editing ? prev.map(c => (c.id === saved.id ? saved : c)) : [...prev, saved]));
      setDraft(null);
      notify("Campagne enregistrée");
    } catch (err) {
      notify((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function archive() {
    if (!editing) return;
    if (!confirmArchive) { setConfirmArchive(true); return; }
    try {
      await api(`/api/campaigns/${editing.id}`, "DELETE");
      setCampaigns(prev => prev.filter(c => c.id !== editing.id));
      setDraft(null);
      notify("Campagne archivée");
    } catch (err) {
      notify((err as Error).message);
    }
  }

  if (draft) {
    const f = draft.filters;
    const togglePrefix = (p: string, on: boolean) => {
      const next = on ? [...f.titlePrefixes, p] : f.titlePrefixes.filter(x => x !== p);
      setDraft(d => (d ? { ...d, filters: { ...d.filters, titlePrefixes: next }, seniority: seniorityFromPrefixes(next, d.seniority) } : d));
    };
    return (
      <section className="panel">
        <form className="campaign-form" onSubmit={save}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <h2>{editing ? "Modifier la campagne" : "Nouvelle campagne"}</h2>
            <button className="btn small" type="button" onClick={() => setDraft(null)}>Retour</button>
          </div>

          <div className="row">
            <div className="field grow">
              <label htmlFor="c-name">Nom</label>
              <input type="text" id="c-name" maxLength={80} required placeholder="PO2 Data, LN+ et Vivier +++"
                value={draft.name} onChange={e => set("name", e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="c-channel">Canal</label>
              <select id="c-channel" value={draft.channel} onChange={e => {
                const phone = e.target.value === "phone";
                setDraft(d => (d ? { ...d, channel: phone ? "phone" : "linkedin", filters: { ...d.filters, requirePhone: phone || d.filters.requirePhone } } : d));
              }}>
                <option value="linkedin">Message LinkedIn</option>
                <option value="phone">Cold call (téléphone Boond)</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="c-target">Candidats</label>
              <select id="c-target" value={draft.target} onChange={e => set("target", e.target.value as Draft["target"])}>
                {Object.entries(TARGETS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
          </div>

          <fieldset className="group">
            <legend>Ciblage Boond</legend>
            <div className="field">
              <span className="label">États</span>
              <div className="chips">
                {Object.entries(STATES).map(([v, label]) => (
                  <label className="chip-toggle" key={v}>
                    <input type="checkbox" checked={f.states.includes(Number(v))}
                      onChange={e => setFilter("states", e.target.checked ? [...f.states, Number(v)] : f.states.filter(x => x !== Number(v)))} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="field">
              <span className="label">Préfixe du titre (séniorité)</span>
              <div className="chips">
                {Object.entries(PREFIX_LABELS).map(([p, label]) => (
                  <label className="chip-toggle" key={p}>
                    <input type="checkbox" checked={f.titlePrefixes.includes(p)} onChange={e => togglePrefix(p, e.target.checked)} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <span className="hint">Aucun coché : tous les titres. Les profils PAD et TR sont toujours écartés.</span>
            </div>
            <div className="row">
              <div className="field grow">
                <label htmlFor="c-keywords">Mots-clés Boond</label>
                <input type="text" id="c-keywords" maxLength={120} placeholder="Data, QA, IA…" autoComplete="off"
                  value={f.keywords} onChange={e => setFilter("keywords", e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="c-scope">Périmètre</label>
                <select id="c-scope" value={f.scope} onChange={e => setFilter("scope", e.target.value === "all" ? "all" : "mine")}>
                  <option value="mine">Mes fiches</option>
                  <option value="all">Tout le vivier WeFiiT</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="c-checks">Vérifier</label>
                <select id="c-checks" value={f.maxChecks} onChange={e => setFilter("maxChecks", Number(e.target.value) as 100 | 200 | 300)}>
                  <option value={100}>100 fiches</option>
                  <option value={200}>200 fiches</option>
                  <option value={300}>300 fiches</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="c-sort">Ordre</label>
                <select id="c-sort" value={`${f.sort}:${f.order}`} onChange={e => {
                  const [sort, order] = e.target.value.split(":");
                  setDraft(d => (d ? { ...d, filters: { ...d.filters, sort: sort === "creationDate" ? "creationDate" : "updateDate", order: order === "asc" ? "asc" : "desc" } } : d));
                }}>
                  <option value="updateDate:desc">Mis à jour récemment</option>
                  <option value="updateDate:asc">Mis à jour il y a longtemps</option>
                  <option value="creationDate:desc">Créés récemment</option>
                </select>
              </div>
            </div>
            <label className="check">
              <input type="checkbox" checked={f.requirePhone} disabled={draft.channel === "phone"}
                onChange={e => setFilter("requirePhone", e.target.checked)} />
              Seulement les fiches avec un téléphone dans Boond
            </label>
          </fieldset>

          <fieldset className="group">
            <legend>{draft.channel === "phone" ? "Pitch d'appel" : "Message"}</legend>
            <div className="row">
              <div className="field">
                <label htmlFor="c-seniority">Séniorité</label>
                <select id="c-seniority" value={draft.seniority} onChange={e => set("seniority", e.target.value as Seniority)}>
                  {SENIORITIES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="c-discipline">Discipline</label>
                <select id="c-discipline" value={draft.discipline} onChange={e => set("discipline", e.target.value as Discipline)}>
                  {DISCIPLINES.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                </select>
              </div>
              <button className="btn small" type="button"
                onClick={() => set("message", campaignTemplate(draft.seniority, draft.discipline, blocks))}>
                Pré-remplir depuis la banque
              </button>
            </div>
            <textarea aria-label="Message de la campagne" maxLength={4000} rows={12} value={draft.message}
              placeholder="Laisse vide pour utiliser le modèle de la banque (séniorité et discipline ci-dessus)."
              onChange={e => set("message", e.target.value)} />
            <p className="hint" style={{ margin: 0 }}>
              Variables : <code>{"{{prenom}}"}</code> <code>{"{{accroche}}"}</code> (choisie fiche par fiche selon l&apos;historique) <code>{"{{titre}}"}</code> <code>{"{{ville}}"}</code> <code>{"{{argument_metier}}"}</code>.
              Les candidats à relancer reçoivent la relance 1 ou 2 de la banque.
            </p>
          </fieldset>

          <div className="row" style={{ justifyContent: "space-between" }}>
            {editing ? <button className="btn small" type="button" onClick={archive}>{confirmArchive ? "Confirmer l'archivage" : "Archiver"}</button> : <span />}
            <button className="btn primary" type="submit" disabled={saving || !f.states.length}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className="campaigns">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h2>Campagnes</h2>
        <button className="btn primary" type="button" onClick={() => edit(null)}>Nouvelle campagne</button>
      </div>
      {error && <p className="warn">{error}</p>}
      {campaigns.length ? (
        <div className="campaign-grid">
          {campaigns.map(c => (
            <article className="campaign" key={c.id}>
              <div>
                <span className={`pill ${c.channel === "phone" ? "a_relancer" : "a_contacter"}`}>{c.channel === "phone" ? "Cold call" : "LinkedIn"}</span>
                <h3>{c.name}</h3>
                <p className="hint">{describe(c)}</p>
              </div>
              <div className="row">
                <button className="btn primary" type="button" onClick={() => onLaunch(c)}>Lancer</button>
                <button className="btn small" type="button" onClick={() => edit(c)}>Modifier</button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="panel empty">
          <h3>Aucune campagne</h3>
          <p style={{ margin: "8px auto 0", maxWidth: "52ch" }}>
            Une campagne = un ciblage Boond précis et un message unique. Crée la première, puis lance-la : les candidats défilent un par un.
          </p>
        </div>
      )}
    </section>
  );
}
