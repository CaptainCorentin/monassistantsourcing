"use client";

import { useEffect, useMemo, useState } from "react";
import type { Candidate, Category, SearchResult, Template } from "@/lib/types";
import { exampleResult, exampleTemplates } from "@/lib/example";

const STATES: Record<number, string> = { 0: "A traiter !", 5: "P+", 11: "LN+ (vivier)", 13: "Vivier +++" };
const CATEGORIES: { key: Category; label: string }[] = [
  { key: "a_contacter", label: "À contacter" },
  { key: "a_relancer", label: "À relancer" },
  { key: "vivier", label: "Vivier" }
];
const ACTION_LABELS: Record<number, string> = { 131: "1er contact", 15: "2e contact", 16: "3e contact" };
const REASON_LABELS: Record<string, string> = {
  jamais_contacte: "Jamais contacté",
  contacte_par_autre_ancien: "Contacté par un autre recruteur il y a plus de 60 j",
  nouvelle_campagne: "Ton dernier contact date de plus de 6 mois",
  relance_due: "Relance due",
  sequence_terminee: "Séquence de 3 contacts terminée",
  relance_expiree: "Relance expirée (plus de 30 j)",
  etat_non_contactable: "État Boond non contactable",
  pas_interesse_90j: "Pas intéressé il y a moins de 90 j",
  rappel_programme: "Rappel programmé",
  fin_process_365j: "Fin de process il y a moins de 365 j",
  process_180j: "Process en cours ou récent (moins de 180 j)",
  contacte_par_autre_60j: "Contacté par un autre recruteur il y a moins de 60 j",
  contacte_recemment: "Contacté par toi il y a moins de 7 j",
  masque: "Masqués ou reportés par toi"
};
const INVITATION_LIMIT = 300;
const DAY = 86400000;

// Seuls les liens https vers linkedin.com sont rendus cliquables.
function safeLinkedin(url: string | null): string | null {
  try {
    const u = new URL(String(url || "").trim());
    return u.protocol === "https:" && /(^|\.)linkedin\.com$/i.test(u.hostname) ? u.href : null;
  } catch {
    return null;
  }
}

function boondUrl(id: string): string | null {
  return /^\d+$/.test(id) ? `https://ui.boondmanager.com/candidates/${id}/overview` : null;
}

function fillTemplate(body: string, c: Candidate) {
  const vars: Record<string, string> = { prenom: c.firstName, nom: c.lastName, titre: c.title, ville: c.town };
  const missing = new Set<string>();
  const text = body.replace(/\{\{\s*([a-zé]+)\s*\}\}/gi, (m, key: string) => {
    const k = key.toLowerCase().replace("é", "e");
    if (!(k in vars)) return m;
    const v = String(vars[k] || "").trim();
    if (!v) missing.add(k);
    return v;
  });
  return { text, missing: [...missing] };
}

type Flag = { kind: "masque" | "reporte"; until?: number };

// Appel aux routes de la webapp. Une session expirée renvoie vers la connexion.
async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Session expirée");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Erreur serveur");
  return data as T;
}

export default function Sourcing() {
  const [result, setResult] = useState<SearchResult>(() => exampleResult(100));
  const [tab, setTab] = useState<Category>("a_contacter");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesError, setTemplatesError] = useState("");
  const [flags, setFlags] = useState<Map<string, Flag>>(new Map());
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    api<Template[]>("/api/templates")
      .then(setTemplates)
      .catch((e: Error) => { setTemplates(exampleTemplates); setTemplatesError(`${e.message} Messages d'exemple affichés, non sauvegardés.`); });
    api<{ boondId: string; kind: Flag["kind"]; until: string | null }[]>("/api/flags")
      .then(rows => setFlags(new Map(rows.map(r => [r.boondId, { kind: r.kind, until: r.until ? Date.parse(r.until) : undefined }]))))
      .catch(() => notify("Impossible de charger les candidats masqués."));
  }, []);

  const [keywords, setKeywords] = useState("");
  const [sortOrder, setSortOrder] = useState("updateDate:asc");
  const [limit, setLimit] = useState("100");
  const [states, setStates] = useState<number[]>([0, 5, 11, 13]);

  function notify(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(t => (t === msg ? "" : t)), 2200);
  }

  const isFlagged = (id: string) => {
    const f = flags.get(id);
    return !!f && (f.kind === "masque" || (f.until ?? 0) > Date.now());
  };
  const visible = useMemo(() => result.candidates.filter(c => !isFlagged(c.id)), [result, flags]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!states.length) return notify("Choisis au moins un état");
    const [sort, order] = sortOrder.split(":");
    setPending(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords, states, sort, order, limit: Number(limit) })
      });
      if (res.status === 401) { window.location.href = "/login"; return; }
      if (!res.ok) throw new Error();
      const data: SearchResult = await res.json();
      setResult(data);
      const first = CATEGORIES.find(c => data.candidates.some(x => x.category === c.key && !isFlagged(x.id)));
      setTab(first ? first.key : "a_contacter");
    } catch {
      notify("La recherche a échoué. Réessaie dans un instant.");
    } finally {
      setPending(false);
    }
  }

  async function setFlag(id: string, kind: Flag["kind"], days?: number) {
    const before = flags;
    setFlags(prev => new Map(prev).set(id, { kind, until: days ? Date.now() + days * DAY : undefined }));
    try {
      await api("/api/flags", "POST", { boondId: id, kind, days });
      notify(kind === "masque" ? "Candidat masqué" : `Reporté de ${days} jours`);
    } catch (e) {
      setFlags(before);
      notify((e as Error).message);
    }
  }

  async function logout() {
    await api("/api/logout", "POST", {}).catch(() => {});
    window.location.href = "/login";
  }

  const hiddenByMe = result.candidates.length - visible.length;
  const excludedEntries = Object.entries(result.excluded).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  if (hiddenByMe) excludedEntries.push(["masque", hiddenByMe]);
  const excludedTotal = excludedEntries.reduce((a, [, n]) => a + n, 0);
  const inTab = visible.filter(c => c.category === tab);

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <h1>Vivier Boond</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>Ton périmètre Boond, trié en à contacter, à relancer et vivier.</p>
        </div>
        <div className="header-actions">
          {result.example && <span className="badge-example">Données d&apos;exemple</span>}
          <button className="btn small" type="button" onClick={logout}>Se déconnecter</button>
        </div>
      </header>

      <section className="panel">
        <form className="search" onSubmit={onSearch}>
          <div className="row">
            <div className="field grow">
              <label htmlFor="q-keywords">Mots-clés Boond</label>
              <input type="text" id="q-keywords" placeholder="Product Owner, QA, Data…" autoComplete="off"
                maxLength={120} value={keywords} onChange={e => setKeywords(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="q-sort">Ordre</label>
              <select id="q-sort" value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
                <option value="updateDate:asc">Moins récemment mis à jour</option>
                <option value="updateDate:desc">Plus récemment mis à jour</option>
                <option value="creationDate:desc">Plus récemment créés</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="q-limit">Vérifier</label>
              <select id="q-limit" value={limit} onChange={e => setLimit(e.target.value)}>
                <option value="25">25 candidats</option>
                <option value="50">50 candidats</option>
                <option value="100">100 candidats</option>
              </select>
            </div>
          </div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="field">
              <span className="label">États Boond</span>
              <div className="chips">
                {Object.entries(STATES).map(([v, label]) => (
                  <label className="chip-toggle" key={v}>
                    <input type="checkbox" id={`st-${v}`} checked={states.includes(Number(v))}
                      onChange={e => setStates(s => e.target.checked ? [...s, Number(v)] : s.filter(x => x !== Number(v)))} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <button className="btn primary" type="submit" disabled={pending}>{pending ? "Recherche en cours…" : "Lancer la recherche"}</button>
          </div>
          {pending && <div className="progress"><div /></div>}
        </form>
      </section>

      <section className="list" aria-live="polite">
        <div className="summary">
          <span><strong>{result.searchTotal}</strong> résultats Boond</span>
          <span><strong>{result.checked}</strong> vérifiés</span>
          <span><strong>{visible.length}</strong> proposés</span>
        </div>
        {excludedTotal > 0 && (
          <details className="excluded">
            <summary>{excludedTotal} écartés : voir pourquoi</summary>
            <ul>
              {excludedEntries.map(([k, n]) => (
                <li key={k}><span className="mono">{n}</span> · {REASON_LABELS[k] || k}</li>
              ))}
            </ul>
          </details>
        )}
        <div className="tabs" role="tablist">
          {CATEGORIES.map(c => (
            <button key={c.key} className="tab" role="tab" type="button" aria-selected={tab === c.key} onClick={() => setTab(c.key)}>
              {c.label}<span className="n">{visible.filter(x => x.category === c.key).length}</span>
            </button>
          ))}
        </div>
        <div className="list">
          {inTab.length ? inTab.map(c => (
            <CandidateCard key={c.id} c={c} templates={templates} onFlag={setFlag} onCopied={notify} />
          )) : <p className="empty">Aucun candidat dans cette catégorie pour cette recherche.</p>}
        </div>
      </section>

      <Templates templates={templates} setTemplates={setTemplates} notify={notify} error={templatesError} />

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function CandidateCard({ c, templates, onFlag, onCopied }: {
  c: Candidate;
  templates: Template[];
  onFlag: (id: string, kind: Flag["kind"], days?: number) => void;
  onCopied: (msg: string) => void;
}) {
  const options = templates.filter(t => t.category === c.category || t.category === "tous");
  const [chosen, setChosen] = useState(options[0]?.id ?? "");
  const tpl = options.find(t => t.id === chosen) ?? options[0];
  const filled = tpl ? fillTemplate(tpl.body, c) : null;
  const len = filled ? [...filled.text].length : 0;
  const over = tpl?.channel === "invitation" && len > INVITATION_LIMIT;
  const li = safeLinkedin(c.linkedinUrl);
  const bu = boondUrl(c.id);
  const name = `${c.firstName} ${c.lastName}`.trim() || "Sans nom";
  const warnings = [
    filled?.missing.length ? `Champ vide dans Boond : ${filled.missing.join(", ")}. Relis le message avant de l'envoyer.` : "",
    over ? "Trop long pour une note d'invitation." : ""
  ].filter(Boolean).join(" ");

  async function copy(e: React.MouseEvent<HTMLButtonElement>) {
    if (!filled) return;
    try {
      await navigator.clipboard.writeText(filled.text);
      onCopied("Message copié");
    } catch {
      const pre = e.currentTarget.closest(".composer")?.querySelector(".preview");
      if (pre) {
        const range = document.createRange();
        range.selectNodeContents(pre);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      onCopied("Texte sélectionné : Ctrl+C pour copier");
    }
  }

  const days = c.lastContact ? Math.round((Date.now() - Date.parse(c.lastContact.date)) / DAY) : 0;

  return (
    <article className="card">
      <div className="card-head">
        <div className="who">
          <h3>{name}</h3>
          <div className="title">{c.title || "Titre non renseigné"}</div>
          {c.town && <div className="meta">{c.town}</div>}
        </div>
        <div className="links">
          {li ? <a href={li} target="_blank" rel="noopener noreferrer">LinkedIn</a> : <span className="muted">Pas de LinkedIn</span>}
          {bu && <a href={bu} target="_blank" rel="noopener noreferrer">Fiche Boond</a>}
        </div>
      </div>
      <div className="context">
        <span className={`pill ${c.category}`}>{REASON_LABELS[c.reasons[0]] || c.category}</span>
        {STATES[c.state] && <span className="pill state">{STATES[c.state]}</span>}
        {c.lastContact && (
          <span className="muted">
            Dernier contact : {ACTION_LABELS[c.lastContact.typeOf] || "contact"} {c.lastContact.byMe ? "par toi" : "par un autre recruteur"}, il y a {days} j
          </span>
        )}
        {c.nextContactTypeOf && <span className="muted">Prochaine action : {ACTION_LABELS[c.nextContactTypeOf]}</span>}
        {c.category === "vivier" && c.eligibleFrom && (
          <span className="muted">Recontactable le {new Date(c.eligibleFrom).toLocaleDateString("fr-FR")}</span>
        )}
      </div>
      <div className="composer">
        {tpl && filled ? (
          <>
            <div className="row">
              <select aria-label={`Message pour ${name}`} value={tpl.id} onChange={e => setChosen(e.target.value)}>
                {options.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <span className={`counter mono${over ? " over" : ""}`}>
                {tpl.channel === "invitation" ? `${len} / ${INVITATION_LIMIT}` : `${len} caractères`}
              </span>
              <button className="btn small primary" type="button" onClick={copy}>Copier</button>
            </div>
            {warnings && <p className="warn">{warnings}</p>}
            <div className="preview">{filled.text}</div>
          </>
        ) : (
          <p className="hint">Aucun message type pour cette catégorie. Ajoute-en un dans « Messages types ».</p>
        )}
      </div>
      <div className="card-foot">
        <span className="hint mono">#{c.id}</span>
        <div className="later">
          <button className="btn small" type="button" onClick={() => onFlag(c.id, "reporte", 7)}>Reporter 7 j</button>
          <button className="btn small" type="button" onClick={() => onFlag(c.id, "reporte", 30)}>Reporter 30 j</button>
          <button className="btn small" type="button" onClick={() => onFlag(c.id, "masque")}>Masquer</button>
        </div>
      </div>
    </article>
  );
}

function Templates({ templates, setTemplates, notify, error }: {
  templates: Template[];
  setTemplates: React.Dispatch<React.SetStateAction<Template[]>>;
  notify: (msg: string) => void;
  error: string;
}) {
  const [editing, setEditing] = useState<Template | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Omit<Template, "id">>({ name: "", category: "a_contacter", channel: "invitation", body: "" });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  function edit(t: Template | null) {
    setEditing(t);
    setDraft(t ? { name: t.name, category: t.category, channel: t.channel, body: t.body } : { name: "", category: "a_contacter", channel: "invitation", body: "" });
    setConfirmDelete(false);
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const clean = { ...draft, name: draft.name.trim().slice(0, 80), body: draft.body.slice(0, 8000) };
    if (!clean.name || !clean.body.trim()) return;
    setSaving(true);
    try {
      const saved = editing
        ? await api<Template>(`/api/templates/${editing.id}`, "PUT", clean)
        : await api<Template>("/api/templates", "POST", clean);
      setTemplates(prev => editing ? prev.map(t => t.id === saved.id ? saved : t) : [...prev, saved]);
      setOpen(false);
      notify("Message enregistré");
    } catch (err) {
      notify((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!editing) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setSaving(true);
    try {
      await api(`/api/templates/${editing.id}`, "DELETE");
      setTemplates(prev => prev.filter(t => t.id !== editing.id));
      setOpen(false);
      notify("Message supprimé");
    } catch (err) {
      notify((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const catLabel = (k: string) => CATEGORIES.find(c => c.key === k)?.label ?? "Toutes catégories";
  const len = [...draft.body].length;
  const inv = draft.channel === "invitation";

  return (
    <section className="panel">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h2>Messages types</h2>
        <button className="btn small" type="button" onClick={() => edit(null)}>Nouveau message</button>
      </div>
      <p className="hint" style={{ margin: "6px 0 0" }}>
        Variables : <code>{"{{prenom}}"}</code> <code>{"{{nom}}"}</code> <code>{"{{titre}}"}</code> <code>{"{{ville}}"}</code>. Une note d&apos;invitation LinkedIn est limitée à 300 caractères.
      </p>
      {error && <p className="warn" style={{ marginTop: 10 }}>{error}</p>}
      <div className="tpl-list">
        {templates.length ? templates.map(t => (
          <div className="tpl" key={t.id}>
            <div>
              <div className="name">{t.name}</div>
              <div className="hint">{catLabel(t.category)} · {t.channel === "invitation" ? "Note d'invitation" : "Message"}</div>
            </div>
            <button className="btn small" type="button" onClick={() => edit(t)}>Modifier</button>
          </div>
        )) : <p className="hint">Aucun message type pour l&apos;instant. Crée le premier avec « Nouveau message ».</p>}
      </div>
      {open && (
        <form className="tpl-form" onSubmit={save}>
          <div className="row">
            <div className="field grow">
              <label htmlFor="tpl-name">Nom</label>
              <input type="text" id="tpl-name" maxLength={80} required value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="tpl-category">Pour</label>
              <select id="tpl-category" value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value as Template["category"] })}>
                {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                <option value="tous">Toutes catégories</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="tpl-channel">Canal</label>
              <select id="tpl-channel" value={draft.channel} onChange={e => setDraft({ ...draft, channel: e.target.value as Template["channel"] })}>
                <option value="invitation">Note d&apos;invitation (300)</option>
                <option value="message">Message / InMail</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="tpl-body">Texte</label>
            <textarea id="tpl-body" maxLength={8000} required value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} />
          </div>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <span className={`counter mono${inv && len > INVITATION_LIMIT ? " over" : ""}`}>
              {inv ? `${len} / ${INVITATION_LIMIT} avant remplacement des variables` : `${len} caractères`}
            </span>
            <div className="row">
              {editing && <button className="btn small" type="button" onClick={remove}>{confirmDelete ? "Confirmer la suppression" : "Supprimer"}</button>}
              <button className="btn small" type="button" onClick={() => setOpen(false)}>Annuler</button>
              <button className="btn small primary" type="submit" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
            </div>
          </div>
        </form>
      )}
    </section>
  );
}
