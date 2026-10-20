"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Campaign } from "@/lib/campaigns";
import type { Candidate, SearchResult } from "@/lib/types";
import { campaignMessage, type Block } from "@/lib/messages";
import { ACTION_LABELS, DAY, REASON_LABELS, STATES, api, boondUrl, formatDate, safeLinkedin, telHref } from "./shared";

export type FlagKind = "masque" | "reporte";
type Stats = { sent: number; passed: number; later: number; out: number; moved: number };
const NO_STATS: Stats = { sent: 0, passed: 0, later: 0, out: 0, moved: 0 };
const INVITATION_LIMIT = 300;

// Candidats de la campagne, dans l'ordre de passage : fiches ajoutées à la main d'abord.
function queueOf(result: SearchResult, campaign: Campaign, isFlagged: (id: string) => boolean) {
  const wanted = campaign.target === "tous" ? ["a_contacter", "a_relancer"] : [campaign.target];
  const segments = campaign.filters.segments;
  const inSegment = (c: Candidate) => !segments.length || c.addedToCampaign || segments.includes(c.reasons[0]);
  const kept = result.candidates.filter(c => wanted.includes(c.category) && !isFlagged(c.id) && inSegment(c));
  return [...kept.filter(c => c.addedToCampaign), ...kept.filter(c => !c.addedToCampaign)];
}

export default function Session({ campaign, campaigns, blocks, isFlagged, recordFlag, onExit, notify }: {
  campaign: Campaign;
  campaigns: Campaign[];
  blocks: Block[];
  isFlagged: (id: string) => boolean;
  recordFlag: (id: string, kind: FlagKind, days?: number) => Promise<void>;
  onExit: () => void;
  notify: (msg: string) => void;
}) {
  const [result, setResult] = useState<SearchResult | null>(null);
  const [queue, setQueue] = useState<Candidate[]>([]);
  const [error, setError] = useState("");
  const [idx, setIdx] = useState(0);
  const [stats, setStats] = useState<Stats>(NO_STATS);

  const load = useCallback(async () => {
    setError("");
    setResult(null);
    try {
      const data = await api<SearchResult>("/api/search", "POST", { ...campaign.filters, campaignId: campaign.id });
      setResult(data);
      setQueue(queueOf(data, campaign, isFlagged));
      setIdx(0);
      setStats(NO_STATS);
    } catch (e) {
      setError((e as Error).message || "La recherche a échoué. Réessaie dans un instant.");
    }
  }, [campaign]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const current = queue[idx];
  const advance = (k: keyof Stats) => {
    setStats(s => ({ ...s, [k]: s[k] + 1 }));
    setIdx(i => i + 1);
    window.scrollTo({ top: 0 });
  };

  if (error) {
    return (
      <section className="panel empty">
        <p className="warn" role="alert">{error}</p>
        <div className="row" style={{ justifyContent: "center", marginTop: 12 }}>
          <button className="btn" type="button" onClick={onExit}>Retour aux campagnes</button>
          <button className="btn primary" type="button" onClick={load}>Réessayer</button>
        </div>
      </section>
    );
  }

  if (!result) {
    return (
      <section className="panel empty" aria-live="polite">
        <h2>{campaign.name}</h2>
        <div className="progress" style={{ margin: "16px auto", maxWidth: 360 }}><div /></div>
        <p className="hint">Lecture du ciblage et de l&apos;historique de chaque fiche dans Boond : compte 10 à 40 secondes.</p>
        <button className="btn small" type="button" onClick={onExit}>Annuler</button>
      </section>
    );
  }

  const excluded = Object.entries(result.excluded).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const flaggedCount = result.candidates.length - result.candidates.filter(c => !isFlagged(c.id)).length;
  if (flaggedCount) excluded.push(["deja_traite", flaggedCount]);
  const wanted = campaign.target === "tous" ? ["a_contacter", "a_relancer"] : [campaign.target];
  const outOfSegment = result.candidates.filter(c => !isFlagged(c.id) && wanted.includes(c.category)).length - queue.length;
  if (outOfSegment > 0) excluded.push(["hors_segment", outOfSegment]);
  const header = (
    <div className="session-head">
      <div>
        <button className="btn small" type="button" onClick={onExit}>← Campagnes</button>
        <h2>{campaign.name}</h2>
      </div>
      <div className="summary">
        <span><strong>{Math.min(idx + 1, queue.length)}</strong> / {queue.length}</span>
        <span><strong>{stats.sent}</strong> {campaign.channel === "phone" ? "appelés" : "envoyés"}</span>
        <span><strong>{stats.passed + stats.later + stats.out + stats.moved}</strong> passés</span>
      </div>
      {result.notice && <p className="warn">{result.notice}</p>}
      {excluded.length > 0 && (
        <details className="excluded">
          <summary>{result.checked} fiches vérifiées, {excluded.reduce((a, [, n]) => a + n, 0)} écartées : voir pourquoi</summary>
          <ul>{excluded.map(([k, n]) => <li key={k}><span className="mono">{n}</span> · {REASON_LABELS[k] || k}</li>)}</ul>
        </details>
      )}
    </div>
  );

  if (!current) {
    return (
      <>
        {header}
        <section className="panel empty">
          <h2>{queue.length ? "Campagne terminée" : "Personne à contacter"}</h2>
          <p style={{ margin: "8px auto 0", maxWidth: "52ch" }}>
            {queue.length
              ? `${stats.sent} ${campaign.channel === "phone" ? "appel(s)" : "message(s)"}, ${stats.moved} passé(s) vers une autre campagne, ${stats.later} reporté(s), ${stats.out} sorti(s) du vivier.`
              : "Aucun candidat contactable pour ce ciblage. Élargis les états, les préfixes ou les mots-clés."}
          </p>
          <div className="row" style={{ justifyContent: "center", marginTop: 14 }}>
            <button className="btn primary" type="button" onClick={onExit}>Retour aux campagnes</button>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      {header}
      <CandidateStep key={current.id} c={current} campaign={campaign} campaigns={campaigns} blocks={blocks}
        recordFlag={recordFlag} advance={advance} notify={notify} />
    </>
  );
}

function CandidateStep({ c, campaign, campaigns, blocks, recordFlag, advance, notify }: {
  c: Candidate;
  campaign: Campaign;
  campaigns: Campaign[];
  blocks: Block[];
  recordFlag: (id: string, kind: FlagKind, days?: number) => Promise<void>;
  advance: (k: keyof Stats) => void;
  notify: (msg: string) => void;
}) {
  const proposed = useMemo(() => campaignMessage(campaign, c, blocks), [campaign, c, blocks]);
  const [text, setText] = useState(proposed.text);
  const [passOpen, setPassOpen] = useState(false);
  const [moveTo, setMoveTo] = useState("");
  const [busy, setBusy] = useState(false);
  const phone = campaign.channel === "phone";
  const li = safeLinkedin(c.linkedinUrl);
  const bu = boondUrl(c.id);
  const tel = telHref(c.phone);
  const name = `${c.firstName} ${c.lastName}`.trim() || "Sans nom";
  const others = campaigns.filter(x => x.id !== campaign.id);
  const len = [...text].length;

  // Le candidat sort de la file d'attente « ajoutés à la main » une fois traité.
  const closeMember = () => {
    if (c.addedToCampaign) api("/api/members", "POST", { boondId: c.id, campaignId: null }).catch(() => {});
  };

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  // 1 clic : copie le message, ouvre LinkedIn, et passe au suivant. Reporté 7 j le temps que
  // l'extension crée l'action dans Boond.
  async function sendLinkedin() {
    const copied = await copy();
    if (li) window.open(li, "_blank", "noopener,noreferrer");
    else if (bu) window.open(bu, "_blank", "noopener,noreferrer");
    notify(copied ? "Message copié, LinkedIn ouvert : colle et envoie" : "Copie impossible : sélectionne le message à la main");
    if (!copied) return;
    recordFlag(c.id, "reporte", 7).catch(() => {});
    closeMember();
    advance("sent");
  }

  function called() {
    recordFlag(c.id, "reporte", 7).catch(() => {});
    closeMember();
    advance("sent");
  }

  async function pass(kind: "skip" | "later" | "out" | "move") {
    setBusy(true);
    try {
      if (kind === "later") await recordFlag(c.id, "reporte", 30);
      if (kind === "out") await recordFlag(c.id, "masque");
      if (kind === "move") {
        if (!moveTo) return;
        await api("/api/members", "POST", { boondId: c.id, campaignId: moveTo });
        notify(`Ajouté à « ${campaigns.find(x => x.id === moveTo)?.name} »`);
      } else if (kind !== "skip") closeMember();
      advance(kind === "skip" ? "passed" : kind === "later" ? "later" : kind === "out" ? "out" : "moved");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Raccourcis : Ctrl/Cmd + Entrée = action principale, flèche droite (hors champ texte) = passer.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const typing = (e.target as HTMLElement)?.closest("textarea, input, select");
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (phone && tel) called(); else sendLinkedin();
      } else if (!typing && e.key === "ArrowRight") {
        e.preventDefault();
        pass("skip");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const lastContactDays = c.lastContact ? Math.round((Date.now() - Date.parse(c.lastContact.date)) / DAY) : null;

  return (
    <article className="step">
      <div className="step-profile">
        <div className="who">
          <h3>{name}</h3>
          <div className="title">{c.title || "Titre non renseigné"}</div>
          <div className="meta">{[c.town, STATES[c.state]].filter(Boolean).join(" · ")}</div>
        </div>
        <div className="context">
          <span className={`pill ${c.category}`}>{REASON_LABELS[c.reasons[0]] || c.category}</span>
          {c.addedToCampaign && <span className="pill state">Ajouté à cette campagne</span>}
          {lastContactDays !== null && (
            <span className="muted">Dernier contact il y a {lastContactDays} j{c.lastContact?.byMe ? " (toi)" : ""}</span>
          )}
        </div>
        <div className="links">
          {li ? <a href={li} target="_blank" rel="noopener noreferrer">LinkedIn</a> : <span className="muted">Pas de LinkedIn</span>}
          {bu && <a href={bu} target="_blank" rel="noopener noreferrer">Fiche Boond</a>}
          {c.phone && <span className="mono">{c.phone}</span>}
        </div>
        <div className="history">
          <span className="label">Historique Boond</span>
          {c.history?.length ? (
            <ol>
              {c.history.map((h, i) => (
                <li key={i}>
                  <div className="h-head">
                    <span className="mono">{formatDate(h.date)}</span>
                    <strong>{ACTION_LABELS[h.typeOf] || `Action ${h.typeOf}`}</strong>
                    <span className="muted">{h.byMe ? "toi" : h.author || ""}</span>
                  </div>
                  {h.text && <p className="h-text">{h.text}</p>}
                </li>
              ))}
            </ol>
          ) : <p className="hint" style={{ margin: 0 }}>Aucune action dans Boond.</p>}
        </div>
      </div>

      <div className="step-message">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <span className="label">
            {phone ? "Pitch d'appel" : proposed.kind === "premier" ? "Message" : proposed.kind === "R2" ? "Relance 2" : "Relance 1"}
          </span>
          <span className={`counter mono${len > INVITATION_LIMIT && !phone ? " soft" : ""}`}>{len} caractères</span>
        </div>
        <textarea aria-label={`Message pour ${name}`} rows={14} value={text} onChange={e => setText(e.target.value)} />
        {proposed.missing.length > 0 && (
          <p className="warn">Champ vide dans Boond : {proposed.missing.join(", ")}. Relis avant d&apos;envoyer.</p>
        )}

        <div className="step-actions">
          <button className="btn" type="button" aria-expanded={passOpen} onClick={() => setPassOpen(o => !o)}>Passer ▾</button>
          {phone && tel ? (
            <>
              <a className="btn" href={tel}>Appeler {c.phone}</a>
              <button className="btn primary" type="button" onClick={called}>Appel passé, suivant</button>
            </>
          ) : (
            <button className="btn primary big" type="button" onClick={sendLinkedin}>
              {li ? "Envoyer sur LinkedIn" : "Copier et ouvrir Boond"}
            </button>
          )}
        </div>
        {passOpen && (
          <div className="pass-menu">
            <button className="btn small" type="button" disabled={busy} onClick={() => pass("skip")}>Juste passer</button>
            <button className="btn small" type="button" disabled={busy} onClick={() => pass("later")}>Plus tard (30 j)</button>
            <button className="btn small" type="button" disabled={busy} onClick={() => pass("out")}>Sortir du vivier à relancer</button>
            {others.length > 0 && (
              <span className="row">
                <select aria-label="Autre campagne" value={moveTo} onChange={e => setMoveTo(e.target.value)}>
                  <option value="">Vers une autre campagne…</option>
                  {others.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
                <button className="btn small" type="button" disabled={busy || !moveTo} onClick={() => pass("move")}>Déplacer</button>
              </span>
            )}
          </div>
        )}
        {phone && !tel && <p className="hint" style={{ margin: 0 }}>Pas de téléphone exploitable dans Boond : message LinkedIn à la place.</p>}
        <p className="hint" style={{ margin: 0 }}>Ctrl + Entrée : {phone && tel ? "appel passé" : "envoyer"} · → : passer</p>
      </div>
    </article>
  );
}
