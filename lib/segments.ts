// Segments de campagne calculés depuis l'historique renvoyé par N8N (motif, dernier contact, process).
// Aucun import : testé directement par Node (rules/segments.test.mjs).

export type SegmentCandidate = {
  category: string;
  reasons: string[];
  lastContact: { date: string; byMe: boolean } | null;
  pastProcessDate?: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const ageDays = (iso: string | null | undefined, now: number) => {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(t) ? null : (now - t) / DAY_MS;
};

export const SEGMENT_LABELS: Record<string, string> = {
  jamais_contacte: "Aucun message tracé",
  nouvelle_campagne: "Mon contact > 6 mois",
  contacte_par_autre_ancien: "Collègue > 60 j",
  relance_due: "Relance due",
  prise_actu: "Prise d'actu : collègue il y a 3 à 12 mois, process > 1 an",
  sans_process_3_mois: "Jamais de process, contacté il y a > 3 mois"
};
export const SEGMENTS = Object.keys(SEGMENT_LABELS);

// Ces segments lèvent, pour la campagne qui les utilise, la règle « vivier jusqu'à 6 mois après mon
// dernier contact » : un candidat en vivier peut y entrer. Les blocages (process, fin de process,
// pas intéressé, rappel, contact < 60 j d'un collègue, < 7 j de moi) restent appliqués par N8N.
export const SEGMENTS_OPENING_VIVIER = ["sans_process_3_mois"];

export function matchesSegment(c: SegmentCandidate, segment: string, now = Date.now()): boolean {
  if (!["a_contacter", "a_relancer", "vivier"].includes(c.category)) return false;
  switch (segment) {
    case "prise_actu": {
      // Le dernier contact vient d'un collègue, il y a 3 à 12 mois ; un process WeFiiT a eu lieu il y a plus d'un an.
      const contact = c.lastContact && !c.lastContact.byMe ? ageDays(c.lastContact.date, now) : null;
      const process = ageDays(c.pastProcessDate, now);
      return c.category === "a_contacter" && contact !== null && contact >= 90 && contact <= 365 && process !== null && process > 365;
    }
    case "sans_process_3_mois": {
      // Jamais de process chez WeFiiT, dernier contact (toi ou un collègue) il y a plus de 3 mois.
      const contact = c.lastContact ? ageDays(c.lastContact.date, now) : null;
      return c.category !== "a_relancer" && !c.pastProcessDate && contact !== null && contact > 90;
    }
    default:
      return c.category !== "vivier" && c.reasons[0] === segment;
  }
}

// Sans segment : tout candidat de la cible. Avec segments : au moins un doit correspondre.
export function inSegments(c: SegmentCandidate, segments: string[], now = Date.now()): boolean {
  return !segments.length || segments.some(s => matchesSegment(c, s, now));
}
