"use client";

import { useState } from "react";
import type { Campaign } from "@/lib/campaigns";
import { DEFAULT_FILTERS } from "@/lib/campaigns";
import { DISCIPLINES, SENIORITIES, campaignTemplate, type Block, type Discipline, type Seniority } from "@/lib/messages";
import { EVALUATION_GROUPS, PREFIX_LABELS, SEGMENT_LABELS, STATES, api } from "./shared";

type Draft = Omit<Campaign, "id" | "preset">;

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
    f.companies.length ? f.companies.join(", ") : f.keywords ? `« ${f.keywords} »` : "",
    f.scope === "all" ? "tout le vivier WeFiiT" : "mes fiches",
    f.evaluations.length ? `évaluation ${f.evaluations.join(", ")}` : "",
    f.segments.length ? f.segments.map(x => SEGMENT_LABELS[x]).join(", ") : "",
    f.requirePhone ? "avec téléphone" : "",
    TARGETS[c.target]
  ].filter(Boolean).join(" · ");
}

// Description des tuiles prêtes à lancer.
const PRESET_INFO: Record<string, string> = {
  mon_vivier: "Tes fiches LN+ et Vivier +++ : tout ce qui est contactable ou à relancer chez toi.",
  conseil_generaliste: "Tout le vivier WeFiiT, passés ou en poste chez MC2i, Wavestone, OnePoint, HeadMind, Adone, PwC, EY, Deloitte, Devoteam (titre, compétences ou expériences).",
  conseil_specialiste: "Tout le vivier WeFiiT, passés ou en poste chez Wivoo, Thiga, Hubvisory, Ikxo, Monsieur Guiz.",
  qa_conseil: "Tout le vivier WeFiiT, QA passés ou en poste chez BAcceptance, TestIT, Zenity, Aubay, Solutec.",
  prise_actu: "Tout le vivier WeFiiT : soft skills A, contactés par un collègue il y a 3 à 12 mois, process WeFiiT de plus d'un an : tu tentes ta chance.",
  jamais_process: "Tout le vivier WeFiiT : « A traiter ! », jamais de process chez WeFiiT, dernier contact il y a plus de 3 mois (vivier compris) : c'est le moment.",
  pepites: "Vus en entretien avec un A en soft skills, quelle que soit la note Product : l'occasion de voir si la partie Product a progressé.",
  jamais: "Tes fiches « A traiter ! » sans aucun message dans Boond : les seules vraiment jamais contactées (un LN+ ou Vivier +++ a déjà échangé avec WeFiiT).",
  relance_campagne: "Ton dernier message date de plus de 6 mois, sans suite : nouvelle campagne, nouvelle accroche.",
  repris: "Contactés par un collègue il y a plus de 60 jours : tu reprends le fil.",
  relances: "Tout le vivier WeFiiT : relance 1 ou 2 due sur tes messages, entre 7 et 30 jours après ton dernier message.",
  pepites_wefiit: "Option : mêmes pépites (soft skills A) sur tout le vivier WeFiiT, y compris les fiches de tes collègues. À utiliser avec tact."
};
const QUICK_PREFIXES: Record<string, string[]> = { PO1: ["PO1"], PO2: ["PO2"], PO3: ["PO3"], QA: ["QA0", "QA1", "QA2"] };

// Séniorité du message déduite des préfixes ciblés, quand ils sont homogènes.
function seniorityFromPrefixes(prefixes: string[], current: Seniority): Seniority {
  const set = new Set(prefixes.map(p => (p.startsWith("QA") ? "QA" : p)));
  if (set.size !== 1) return current;
  const only = [...set][0];
  return only === "PO1" || only === "PO2" || only === "PO3" || only === "QA" ? only : current;
}

// Tuile : séniorité en un clic (préfixes du titre) et canal, puis lancement.
function PresetTile({ c, onLaunch, onEdit }: { c: Campaign; onLaunch: (c: Campaign) => void; onEdit: () => void }) {
  const [quick, setQuick] = useState<string[]>([]);
  const [channel, setChannel] = useState(c.channel);
  function launch() {
    const prefixes = quick.flatMap(q => QUICK_PREFIXES[q]);
    onLaunch({
      ...c,
      channel,
      seniority: quick.length === 1 ? (quick[0] as Campaign["seniority"]) : c.seniority,
      discipline: quick.length === 1 && quick[0] === "QA" ? "QA" : c.discipline,
      filters: { ...c.filters, titlePrefixes: prefixes.length ? prefixes : c.filters.titlePrefixes, requirePhone: channel === "phone" || c.filters.requirePhone }
    });
  }
  return (
    <article className={`campaign preset${c.preset === "pepites_wefiit" ? " optional" : ""}`}>
      <div>
        <h3>{c.name}</h3>
        <p className="hint">{PRESET_INFO[c.preset ?? ""] ?? describe(c)}</p>
      </div>
      <div className="chips" role="group" aria-label={`Séniorité pour ${c.name}`}>
        {Object.keys(QUICK_PREFIXES).map(q => (
          <label className="chip-toggle" key={q}>
            <input type="checkbox" checked={quick.includes(q)} onChange={e => setQuick(v => (e.target.checked ? [...v, q] : v.filter(x => x !== q)))} />
            <span>{q}</span>
          </label>
        ))}
      </div>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div className="seg" role="group" aria-label={`Canal pour ${c.name}`}>
          <button type="button" aria-pressed={channel === "linkedin"} onClick={() => setChannel("linkedin")}>LinkedIn</button>
          <button type="button" aria-pressed={channel === "phone"} onClick={() => setChannel("phone")}>Cold call</button>
        </div>
        <div className="row">
          <button className="btn small" type="button" onClick={onEdit}>Message</button>
          <button className="btn primary" type="button" onClick={launch}>Lancer</button>
        </div>
      </div>
    </article>
  );
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
  const [companiesText, setCompaniesText] = useState("");

  function edit(c: Campaign | null) {
    setEditing(c);
    setDraft(c ? { name: c.name, channel: c.channel, target: c.target, filters: c.filters, seniority: c.seniority, discipline: c.discipline, message: c.message } : { ...EMPTY, filters: { ...DEFAULT_FILTERS } });
    setConfirmArchive(false);
    setCompaniesText(c ? c.filters.companies.join(", ") : "");
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
            <div className="field">
              <span className="label">Évaluation en entretien (soft skills)</span>
              <div className="chips">
                {Object.entries(EVALUATION_GROUPS).map(([label, values]) => (
                  <label className="chip-toggle" key={label}>
                    <input type="checkbox" checked={values.every(v => f.evaluations.includes(v))}
                      onChange={e => setFilter("evaluations", e.target.checked ? [...new Set([...f.evaluations, ...values])] : f.evaluations.filter(v => !values.includes(v)))} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <span className="hint">« Soft A » = A/A, A/B, A/C, A/D : quelle que soit la note Product. Aucun coché : évalués ou non.</span>
            </div>
            <div className="field">
              <span className="label">Historique de contact</span>
              <div className="chips">
                {Object.entries(SEGMENT_LABELS).map(([k, label]) => (
                  <label className="chip-toggle" key={k}>
                    <input type="checkbox" checked={f.segments.includes(k)}
                      onChange={e => setFilter("segments", e.target.checked ? [...f.segments, k] : f.segments.filter(x => x !== k))} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <span className="hint">Calculé depuis l&apos;historique Boond à chaque lancement. Aucun coché : tous les contactables.</span>
              {f.segments.includes("jamais_contacte") && f.states.some(s => s === 11 || s === 13) && (
                <span className="warn">Un LN+ ou Vivier +++ a déjà échangé avec WeFiiT : « aucun message tracé » y désigne un échange hors des actions 1er / 2e / 3e contact. Pour des candidats jamais contactés, cible « A traiter ! ».</span>
              )}
            </div>
            <div className="row">
              <div className="field grow">
                <label htmlFor="c-companies">Entreprises (séparées par des virgules)</label>
                <input type="text" id="c-companies" maxLength={600} placeholder="Wavestone, Devoteam, BAcceptance…" autoComplete="off"
                  value={companiesText} onChange={e => {
                    setCompaniesText(e.target.value);
                    setFilter("companies", e.target.value.split(",").map(x => x.trim()).filter(x => x.length >= 2).slice(0, 30));
                  }} />
              </div>
              <div className="field grow">
                <label htmlFor="c-keywords">Mots-clés Boond</label>
                <input type="text" id="c-keywords" maxLength={120} placeholder="Data, QA, IA…" autoComplete="off" disabled={f.companies.length > 0}
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
            {editing && !editing.preset ? <button className="btn small" type="button" onClick={archive}>{confirmArchive ? "Confirmer l'archivage" : "Archiver"}</button> : <span />}
            <button className="btn primary" type="submit" disabled={saving || !f.states.length}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
          </div>
        </form>
      </section>
    );
  }

  const order = ["mon_vivier", "conseil_generaliste", "conseil_specialiste", "qa_conseil", "prise_actu", "jamais_process", "relances"];
  const rank = (c: Campaign) => { const i = order.indexOf(c.preset ?? ""); return i < 0 ? order.length : i; };
  const presets = campaigns.filter(c => c.preset).sort((a, b) => rank(a) - rank(b));
  const own = campaigns.filter(c => !c.preset);
  return (
    <section className="campaigns">
      {error && <p className="warn">{error}</p>}
      {presets.length > 0 && (
        <>
          <h2>Prêtes à lancer</h2>
          <div className="campaign-grid">
            {presets.map(c => <PresetTile key={c.id} c={c} onLaunch={onLaunch} onEdit={() => edit(c)} />)}
          </div>
        </>
      )}
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
        <h2>Mes campagnes</h2>
        <button className="btn" type="button" onClick={() => edit(null)}>Nouvelle campagne</button>
      </div>
      {own.length ? (
        <div className="campaign-grid">
          {own.map(c => (
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
        <p className="hint" style={{ margin: 0 }}>Pour un ciblage sur mesure (mots-clés, états, évaluation, historique), crée ta propre campagne.</p>
      )}
    </section>
  );
}
