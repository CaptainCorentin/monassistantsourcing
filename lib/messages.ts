// Banque de messages matricielle (docs/MESSAGES.md).
// Un 1er message = accroche (historique) + positionnement (séniorité) + phrase métier (discipline)
// + ouverture commune + drivers (séniorité) + appel à l'action.
// Les textes vivent dans Supabase (table message_blocks) et se modifient depuis l'interface ;
// DEFAULT_BLOCKS sert de graine pour la migration et de repli si Supabase ne répond pas.
// Aucun import : testé directement par Node (rules/messages.test.mjs).

export type BlockKind =
  | "accroche" | "positionnement" | "metier" | "argument" | "ouverture" | "driver" | "cta" | "relance" | "invitation";

export type Block = { code: string; kind: BlockKind; label: string; body: string };

export type Seniority = "PO1" | "PO2" | "PO3" | "QA";
export type Discipline = "DIGITAL" | "DATA" | "IA" | "BUILD" | "QA";
export type Hook = "A1" | "A2" | "A3" | "A4" | "A5";
export type MessageKind = "premier" | "invitation" | "R1" | "R2";

export const SENIORITIES: { key: Seniority; label: string }[] = [
  { key: "PO1", label: "PO1 (junior)" },
  { key: "PO2", label: "PO2 (confirmé)" },
  { key: "PO3", label: "PO3 (senior, lead)" },
  { key: "QA", label: "QA" }
];
export const DISCIPLINES: { key: Discipline; label: string }[] = [
  { key: "DIGITAL", label: "PM digital" },
  { key: "DATA", label: "Data Product" },
  { key: "IA", label: "IA Product" },
  { key: "BUILD", label: "Product Builder" },
  { key: "QA", label: "QA" }
];
export const HOOKS: { key: Hook; label: string }[] = [
  { key: "A1", label: "A1 · Jamais contacté" },
  { key: "A2", label: "A2 · Contacté par un collègue (+60 j)" },
  { key: "A3", label: "A3 · Sans réponse depuis 6 mois" },
  { key: "A4", label: "A4 · Déjà échangé avec toi" },
  { key: "A5", label: "A5 · Déjà échangé avec un collègue" }
];
export const MESSAGE_KINDS: { key: MessageKind; label: string }[] = [
  { key: "premier", label: "1er message" },
  { key: "invitation", label: "Note d'invitation" },
  { key: "R1", label: "Relance 1" },
  { key: "R2", label: "Relance 2" }
];
export const KIND_LABELS: Record<BlockKind, string> = {
  accroche: "Accroches (historique)",
  positionnement: "Positionnement (séniorité)",
  metier: "Phrase métier (discipline)",
  argument: "Argument court (relance 2, invitation)",
  ouverture: "Ouverture commune",
  driver: "Drivers (séniorité)",
  cta: "Appel à l'action",
  relance: "Relances",
  invitation: "Note d'invitation"
};

export const DEFAULT_BLOCKS: Block[] = [
  { code: "A1", kind: "accroche", label: "A1 · Jamais contacté", body: "{{anciennete}} chez {{entreprise}}, c'est peut-être la fin d'un cycle… et le début d'un nouveau ? 😁" },
  { code: "A1-REPLI", kind: "accroche", label: "A1 · Si entreprise ou ancienneté inconnue", body: "Ton parcours de {{titre}} a retenu mon attention." },
  { code: "A2", kind: "accroche", label: "A2 · Contacté par un collègue (+60 j)", body: "Beaucoup de choses ont bougé chez WeFiiT ces derniers mois, et ton profil colle pile à ce qu'on construit aujourd'hui." },
  { code: "A3", kind: "accroche", label: "A3 · Sans réponse depuis 6 mois", body: "On dit souvent que la vie est une question de feeling et de timing… mon dernier message est sûrement arrivé au mauvais moment ! 😊" },
  { code: "A4", kind: "accroche", label: "A4 · Déjà échangé avec toi (LN+, Vivier +++)", body: "J'ai gardé un bon souvenir de nos derniers échanges, et beaucoup de choses ont bougé chez WeFiiT depuis." },
  { code: "A5", kind: "accroche", label: "A5 · Déjà échangé avec un collègue (LN+, Vivier +++)", body: "Tu avais marqué positivement WeFiiT lors de tes derniers échanges avec nous, et beaucoup de choses ont bougé depuis." },
  { code: "POS-PO12", kind: "positionnement", label: "PO1 / PO2", body: "Chez WeFiiT, on ne fait que du Product Management, et on cherche les meilleurs PM et PO de Paris pour devenir la référence du métier en France." },
  { code: "POS-PO3", kind: "positionnement", label: "PO3", body: "Chez WeFiiT, on cherche les futurs leaders du Product Management digital, Data et IA : des profils qui font grandir nos clients autant que l'équipe." },
  { code: "POS-QA", kind: "positionnement", label: "QA", body: "Chez WeFiiT, on cherche les meilleurs QA de Paris : des stratèges de la qualité produit, impliqués dès la conception (shift left), pas de simples exécutants de tests." },
  { code: "D-DIGITAL", kind: "metier", label: "PM digital", body: "Nos PM adressent des enjeux de conversion, d'acquisition, d'adoption et de conduite du changement, en Product Management fullstack (strategy, discovery, delivery) augmenté par l'IA." },
  { code: "D-DATA", kind: "metier", label: "Data Product", body: "On vient du produit : en Data Product, ce qu'on apporte d'abord, c'est de l'impact, avec une vraie vision Data as a Product." },
  { code: "D-IA", kind: "metier", label: "IA Product", body: "Prendre en main des produits non déterministes, c'est un autre métier, et c'est exactement celui qu'on développe chez nos clients." },
  { code: "D-BUILD", kind: "metier", label: "Product Builder", body: "On cherche des PM qui buildent : prototypes, agents, workflows automatisés, choix techniques. On ne livre pas pour rien, on livre pour l'impact." },
  { code: "D-QA", kind: "metier", label: "QA", body: "Chez nous, qualité et produit se nourrissent : nos QA sont intégrés aux squads et sont les premiers utilisateurs des features." },
  { code: "ARG-DIGITAL", kind: "argument", label: "PM digital", body: "du Product Management fullstack augmenté par l'IA, sur la conversion et l'adoption" },
  { code: "ARG-DATA", kind: "argument", label: "Data Product", body: "du Data Product orienté impact, porté par des gens du produit" },
  { code: "ARG-IA", kind: "argument", label: "IA Product", body: "des produits IA non déterministes, un métier qu'on développe chez nos clients" },
  { code: "ARG-BUILD", kind: "argument", label: "Product Builder", body: "des PM qui buildent : prototypes, agents, workflows automatisés" },
  { code: "ARG-QA", kind: "argument", label: "QA", body: "une QA intégrée aux squads, au cœur du produit" },
  { code: "OUV", kind: "ouverture", label: "Ouverture commune", body: "Et si demain tu veux explorer la Data, l'IA, le build ou le pur digital, c'est possible : pas de practice chez WeFiiT, chaque consultant choisit ses missions. 100 % des WeFiiTers ont Claude Code, et chacun dispose de 2 000 € de formation par an via l'Université WeFiiT." },
  { code: "DRV-PO1", kind: "driver", label: "PO1", body: "Tu pourras accélérer ta montée en compétences : formations sur mesure, plus de 50 mentors, et une communauté de pairs (Guildes, WeTalks)." },
  { code: "DRV-PO2", kind: "driver", label: "PO2", body: "Tu pourras approfondir la discovery et la stratégie, être mentoré et accompagné, tout en co-construisant WeFiiT selon tes appétences." },
  { code: "DRV-PO3", kind: "driver", label: "PO3", body: "Tu pourras accompagner tes pairs dans leur carrière, coacher nos clients et peser sur la stratégie interne de WeFiiT." },
  { code: "DRV-QA", kind: "driver", label: "QA", body: "Tu pourras évoluer vers l'automatisation, la stratégie de test ou un rôle de PO, sur des missions 100 % QA et agiles." },
  { code: "CTA", kind: "cta", label: "Appel à l'action", body: "Si ça te parle, je serais ravi d'en échanger par téléphone : serais-tu disponible cette semaine ou la semaine prochaine ?\n\nPasse une excellente journée" },
  { code: "R1", kind: "relance", label: "Relance 1 (2e contact)", body: "Hello {{prenom}}, le suspense est insoutenable… as-tu bien reçu mon dernier message ? Promis, je ne me vexe pas si la réponse est non 😉" },
  { code: "R2", kind: "relance", label: "Relance 2 (3e contact)", body: "Hello {{prenom}}, as-tu pu lire mon précédent message ? En bref, chez WeFiiT :\n🎯 {{argument_metier}}\n🎯 tu choisis tes missions, sans practice imposée\n🎯 tu co-construis l'entreprise avec plus de 115 WeFiiTers\nOn se donne 15 min cette semaine ?" },
  { code: "INV", kind: "invitation", label: "Note d'invitation (300 caractères)", body: "Bonjour {{prenom}}, je suis Corentin, recruteur chez WeFiiT, cabinet 100 % Product Management. Chez nous : {{argument_metier}}. Pas de practice, chacun choisit ses missions. Ouvert à en discuter ?" }
];

export const VARIABLES = ["prenom", "nom", "titre", "ville", "entreprise", "anciennete", "annee_process", "argument_metier", "accroche"];

// Détection depuis le titre Boond. sure = false : rien de reconnu, valeur par défaut.
// Bornes de mot faites à la main : \b ne reconnaît pas les lettres accentuées.
const word = (alternatives: string) => new RegExp(`(?<![a-zà-ÿ])(${alternatives})(?![a-zà-ÿ])`, "i");
const QA_RE = word("qa|tests?|testeur|testeuse|tester|testing|qualité|qualite|quality");
const JUNIOR_RE = word("junior|associate|alternant|alternante|alternance|apprenti|apprentie|stagiaire|intern");
const SENIOR_RE = word("senior|sr|lead|head|principal|staff|group|director|directeur|directrice|vp|chief|cpo");
const DATA_RE = word("data");
const IA_RE = word("ia|ai|ml|genai|llm|machine learning|intelligence artificielle");
const BUILD_RE = word("builder|no-?code|low-?code|automation|automatisation");

export function detectSeniority(title: string): { value: Seniority; sure: boolean } {
  const t = title || "";
  if (QA_RE.test(t)) return { value: "QA", sure: true };
  if (JUNIOR_RE.test(t)) return { value: "PO1", sure: true };
  if (SENIOR_RE.test(t)) return { value: "PO3", sure: true };
  return { value: "PO2", sure: false };
}

export function detectDiscipline(title: string): { value: Discipline; sure: boolean } {
  const t = title || "";
  if (QA_RE.test(t)) return { value: "QA", sure: true };
  if (DATA_RE.test(t)) return { value: "DATA", sure: true };
  if (IA_RE.test(t)) return { value: "IA", sure: true };
  if (BUILD_RE.test(t)) return { value: "BUILD", sure: true };
  return { value: "DIGITAL", sure: false };
}

// Déjà échangé (LN+, Vivier +++, ou un process dans Boond) : accroche volontairement vague,
// selon l'auteur du dernier échange. Sans échange tracé, on ne présume pas que c'était moi.
export function detectHook(c: { state: number; reasons: string[]; pastProcessDate?: string | null; pastProcessByMe?: boolean | null }): Hook {
  if (c.pastProcessDate || c.state === 11 || c.state === 13) return c.pastProcessByMe ? "A4" : "A5";
  const reason = c.reasons[0];
  if (reason === "contacte_par_autre_ancien") return "A2";
  if (reason === "nouvelle_campagne") return "A3";
  return "A1";
}

export function defaultMessageKind(category: string, nextContactTypeOf: number | null): MessageKind {
  if (category === "a_relancer") return nextContactTypeOf === 16 ? "R2" : "R1";
  return "premier";
}

export type Choice = { kind: MessageKind; hook: Hook; seniority: Seniority; discipline: Discipline };

// Remplace les variables ; une variable vide est signalée dans missing.
export function fillVariables(text: string, vars: Record<string, string>) {
  const missing = new Set<string>();
  const out = text.replace(/\{\{\s*([a-z_é]+)\s*\}\}/gi, (m, key: string) => {
    const k = key.toLowerCase().replace("é", "e");
    if (!VARIABLES.includes(k)) return m;
    const v = String(vars[k] ?? "").trim();
    if (!v) missing.add(k);
    return v;
  });
  return { text: out, missing: [...missing] };
}

export function assemble(choice: Choice, blocks: Block[], vars: Record<string, string>) {
  const get = (code: string) => blocks.find(b => b.code === code)?.body ?? DEFAULT_BLOCKS.find(b => b.code === code)?.body ?? "";
  const allVars = { ...vars, argument_metier: get(`ARG-${choice.discipline}`) };
  let text: string;
  if (choice.kind === "premier") {
    const hasA1Fields = String(vars.entreprise ?? "").trim() && String(vars.anciennete ?? "").trim();
    const hook = choice.hook === "A1" && !hasA1Fields ? "A1-REPLI" : choice.hook;
    const pos = choice.seniority === "PO3" ? "POS-PO3" : choice.seniority === "QA" ? "POS-QA" : "POS-PO12";
    text = [
      "Bonjour {{prenom}},",
      get(hook),
      [get(pos), get(`D-${choice.discipline}`), get("OUV")].filter(Boolean).join(" "),
      get(`DRV-${choice.seniority}`),
      get("CTA")
    ].filter(Boolean).join("\n\n");
  } else if (choice.kind === "invitation") {
    text = get("INV");
  } else {
    text = get(choice.kind);
  }
  return fillVariables(text, allVars);
}

// ---------------------------------------------------------------------------
// Campagnes : un message unique par campagne, avec {{accroche}} choisie fiche par fiche.

const blockBody = (blocks: Block[], code: string) =>
  blocks.find(b => b.code === code)?.body ?? DEFAULT_BLOCKS.find(b => b.code === code)?.body ?? "";

// Modèle de 1er message d'une campagne, pré-rempli depuis la banque. L'accroche reste une variable.
export function campaignTemplate(seniority: Seniority, discipline: Discipline, blocks: Block[]): string {
  const pos = seniority === "PO3" ? "POS-PO3" : seniority === "QA" ? "POS-QA" : "POS-PO12";
  return [
    "Bonjour {{prenom}},",
    "{{accroche}}",
    [blockBody(blocks, pos), blockBody(blocks, `D-${discipline}`), blockBody(blocks, "OUV")].filter(Boolean).join(" "),
    blockBody(blocks, `DRV-${seniority}`),
    blockBody(blocks, "CTA")
  ].filter(Boolean).join("\n\n");
}

type CampaignLike = { message: string; seniority: Seniority; discipline: Discipline };
type CandidateLike = {
  firstName: string; lastName: string; title: string; town: string; state: number; reasons: string[];
  category: string; nextContactTypeOf: number | null; pastProcessDate?: string | null; pastProcessByMe?: boolean | null;
};

// Message proposé pour un candidat dans une campagne : relance de la banque (R1 / R2) si le candidat
// est à relancer, sinon le message de la campagne (ou le modèle de la banque s'il est vide).
export function campaignMessage(campaign: CampaignLike, c: CandidateLike, blocks: Block[]) {
  const vars: Record<string, string> = {
    prenom: c.firstName, nom: c.lastName, titre: c.title, ville: c.town,
    argument_metier: blockBody(blocks, `ARG-${campaign.discipline}`)
  };
  if (c.category === "a_relancer") {
    const kind = c.nextContactTypeOf === 16 ? "R2" : "R1";
    return { kind, ...fillVariables(blockBody(blocks, kind), vars) };
  }
  const hook = detectHook(c);
  // Entreprise et ancienneté ne sont pas dans Boond : A1 passe à son repli.
  vars.accroche = fillVariables(blockBody(blocks, hook === "A1" ? "A1-REPLI" : hook), vars).text;
  const template = campaign.message.trim() ? campaign.message : campaignTemplate(campaign.seniority, campaign.discipline, blocks);
  return { kind: "premier", hook, ...fillVariables(template, vars) };
}
