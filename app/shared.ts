// Libellés et utilitaires partagés par l'écran des campagnes et la session.

export const STATES: Record<number, string> = { 0: "A traiter !", 5: "P+", 11: "LN+", 13: "Vivier +++" };

export const ACTION_LABELS: Record<number, string> = {
  131: "1er contact", 15: "2e contact", 16: "3e contact", 18: "Pas intéressé", 1: "Rappel",
  19: "Fin de process (candidat)", 133: "Fin de process (WeFiiT)", 12: "Pré-qualification",
  40: "Entretien 1", 45: "Entretien 2", 130: "Entretien 3", 14: "Entretien entre pairs",
  134: "Entretien support", 43: "ED", 7: "EM", 42: "Signature", 132: "Reco talent"
};

export const REASON_LABELS: Record<string, string> = {
  jamais_contacte: "Jamais contacté",
  contacte_par_autre_ancien: "Contacté par un collègue il y a plus de 60 j",
  nouvelle_campagne: "Ton dernier contact date de plus de 6 mois",
  relance_due: "Relance due",
  sequence_terminee: "Séquence de 3 contacts terminée",
  relance_expiree: "Relance expirée (plus de 30 j)",
  etat_non_contactable: "État Boond non contactable",
  pas_interesse_90j: "Pas intéressé il y a moins de 90 j",
  rappel_programme: "Rappel programmé",
  fin_process_365j: "Fin de process il y a moins de 365 j",
  process_180j: "Process en cours ou récent (moins de 180 j)",
  contacte_par_autre_60j: "Contacté par un collègue il y a moins de 60 j",
  contacte_recemment: "Contacté par toi il y a moins de 7 j",
  profil_pad_tr: "Profils PAD / TR",
  hors_cible: "Hors ciblage (préfixe du titre)",
  sans_telephone: "Sans téléphone dans Boond",
  erreur_boond: "Historique illisible dans Boond",
  deja_traite: "Déjà traités, reportés ou sortis par toi",
  hors_segment: "Contactables, mais hors du segment de la campagne"
};

export const PREFIX_LABELS: Record<string, string> = {
  PO1: "PO1", PO2: "PO2", PO3: "PO3", QA0: "QA0", QA1: "QA1", QA2: "QA2", NONE: "Sans préfixe"
};

// Historique de contact (motif de classement N8N), utilisable comme segment de campagne.
export const SEGMENT_LABELS: Record<string, string> = {
  jamais_contacte: "Jamais contacté",
  nouvelle_campagne: "Mon contact > 6 mois",
  contacte_par_autre_ancien: "Collègue > 60 j",
  relance_due: "Relance due"
};

// Évaluation globale Boond = soft skills / hard skills Product. On cible par note de soft skills.
export const EVALUATION_GROUPS: Record<string, string[]> = {
  "Soft A": ["A", "A/A", "A/B", "A/C", "A/D"],
  "Soft B": ["B", "B/A", "B/B", "B/C", "B/D"],
  "Soft C": ["C", "C/A", "C/B", "C/C", "C/D"]
};

export const DAY = 86400000;

// Seuls les liens https vers linkedin.com sont rendus cliquables.
export function safeLinkedin(url: string | null | undefined): string | null {
  try {
    const u = new URL(String(url || "").trim());
    return u.protocol === "https:" && /(^|\.)linkedin\.com$/i.test(u.hostname) ? u.href : null;
  } catch {
    return null;
  }
}

export function boondUrl(id: string): string | null {
  return /^\d+$/.test(id) ? `https://ui.boondmanager.com/candidates/${id}/overview` : null;
}

// Numéro composable : chiffres et + uniquement.
export function telHref(phone: string | null | undefined): string | null {
  const digits = String(phone || "").replace(/[^\d+]/g, "");
  return digits.length >= 8 ? `tel:${digits}` : null;
}

export function formatDate(iso: string | null | undefined): string {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(t) ? "" : new Date(t).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

// Appel aux routes de la webapp. Une session expirée renvoie vers la connexion.
export async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
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
