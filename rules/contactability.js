// Règles de contactabilité d'un candidat Boond pour la webapp de sourcing.
//
// Source unique : ce fichier est testé dans le repo (rules/contactability.test.js)
// puis collé tel quel dans le nœud Code du workflow N8N "SOURCING WEBAPP".
// Pas d'import, pas de dépendance : uniquement du JS exécutable dans N8N.
//
// Les règles bloquantes reprennent celles du workflow de l'extension
// (bZsfmIdulu88qB1Y, nœud "Contactable en fct des actions passée ?").
// La répartition à contacter / à relancer / vivier est propre à la webapp.

const DAY_MS = 24 * 60 * 60 * 1000;

const CONFIG = {
  meBoondId: "15675",
  contactableStates: [0, 5, 11, 13],

  // typeOf des actions Boond
  firstContact: 131,
  secondContact: 15,
  thirdContact: 16,
  notInterested: 18,
  scheduledCallback: 1,
  endOfProcess: 19,
  // Repris tel quel de la prod. Libellés Boond réels (dictionnaire) : 40 Entretien 1, 130 Entretien 3,
  // 45 Entretien 2, 134 Entretien en SUPPORT, 43 ED. Absents : 12 Pré-qualification, 14 Entre Pairs.
  processTypes: [40, 130, 45, 134, 43],

  // Fenêtres en jours
  notInterestedDays: 90,
  endOfProcessDays: 365,
  processDays: 180,
  otherRecruiterContactDays: 60, // contacté par un autre recruteur : intouchable pendant 60 j
  minDaysBeforeFollowUp: 7, // pas de relance moins de 7 j après mon dernier contact
  newCampaignDays: 180 // au-delà de 6 mois après mon dernier contact : nouvelle campagne
};

const CONTACT_TYPES = [CONFIG.firstContact, CONFIG.secondContact, CONFIG.thirdContact];
const CONTACT_RANK = { [CONFIG.firstContact]: 1, [CONFIG.secondContact]: 2, [CONFIG.thirdContact]: 3 };
const NEXT_CONTACT = {
  [CONFIG.firstContact]: CONFIG.secondContact,
  [CONFIG.secondContact]: CONFIG.thirdContact
};

function addDays(ms, days) {
  return new Date(ms + days * DAY_MS).toISOString();
}

// Normalise une action Boond brute (JSON:API) ou déjà aplatie.
function normalizeAction(raw) {
  const attrs = raw.attributes || raw;
  const managerId = raw.relationships?.mainManager?.data?.id ?? raw.mainManagerId ?? null;
  return {
    typeOf: Number(attrs.typeOf),
    time: new Date(attrs.startDate).getTime(),
    startDate: attrs.startDate,
    managerId: managerId === null ? null : String(managerId)
  };
}

/**
 * @param {object} input
 * @param {number|string} input.state  état Boond du candidat
 * @param {Array} input.actions        actions Boond du candidat (brutes ou aplaties)
 * @param {number} [input.now]         timestamp ms, injectable pour les tests
 * @returns {{category: "a_contacter"|"a_relancer"|"vivier"|"bloque", reasons: string[],
 *            nextContactTypeOf: number|null, lastContact: object|null, contactCount: number,
 *            eligibleFrom: string|null, warnings: string[]}}
 */
function classifyCandidate({ state, actions = [], now = Date.now() }, config = CONFIG) {
  const warnings = [];
  const parsed = [];
  for (const raw of actions) {
    const a = normalizeAction(raw);
    // Même comportement que la prod : une date illisible ne bloque rien. On le signale.
    if (Number.isNaN(a.time)) warnings.push(`date_invalide_action_${a.typeOf}`);
    else parsed.push(a);
  }

  const contacts = parsed.filter(a => CONTACT_TYPES.includes(a.typeOf));
  const result = (category, reasons, extra = {}) => ({
    category,
    reasons,
    nextContactTypeOf: null,
    lastContact: null,
    contactCount: contacts.length,
    eligibleFrom: null,
    warnings,
    ...extra
  });

  if (!config.contactableStates.includes(Number(state))) {
    return result("bloque", ["etat_non_contactable"]);
  }

  // Règles bloquantes, tous auteurs confondus. On les cumule pour afficher tous les motifs,
  // et on retient la date de déblocage la plus lointaine.
  const reasons = [];
  let unblockAt = 0;
  const block = (reason, untilMs) => {
    if (!reasons.includes(reason)) reasons.push(reason);
    unblockAt = Math.max(unblockAt, untilMs);
  };
  for (const a of parsed) {
    if (a.typeOf === config.notInterested && a.time > now - config.notInterestedDays * DAY_MS) {
      block("pas_interesse_90j", a.time + config.notInterestedDays * DAY_MS);
    }
    if (a.typeOf === config.scheduledCallback && a.time > now) {
      block("rappel_programme", a.time);
    }
    if (a.typeOf === config.endOfProcess && a.time > now - config.endOfProcessDays * DAY_MS) {
      block("fin_process_365j", a.time + config.endOfProcessDays * DAY_MS);
    }
    if (config.processTypes.includes(a.typeOf) && a.time > now - config.processDays * DAY_MS) {
      block("process_180j", a.time + config.processDays * DAY_MS);
    }
  }

  // Dernier contact : le plus récent ; à date égale, le plus avancé (16 > 15 > 131).
  const last = contacts.reduce((best, a) => {
    if (!best) return a;
    if (a.time !== best.time) return a.time > best.time ? a : best;
    return CONTACT_RANK[a.typeOf] > CONTACT_RANK[best.typeOf] ? a : best;
  }, null);
  const lastContact = last && {
    typeOf: last.typeOf,
    date: last.startDate,
    byMe: last.managerId === String(config.meBoondId),
    managerId: last.managerId
  };

  if (reasons.length) {
    return result("bloque", reasons, { lastContact, eligibleFrom: new Date(unblockAt).toISOString() });
  }

  if (!last) {
    return result("a_contacter", ["jamais_contacte"], { nextContactTypeOf: config.firstContact });
  }

  const ageDays = (now - last.time) / DAY_MS;

  if (!lastContact.byMe) {
    if (ageDays < config.otherRecruiterContactDays) {
      return result("bloque", ["contacte_par_autre_60j"], {
        lastContact,
        eligibleFrom: addDays(last.time, config.otherRecruiterContactDays)
      });
    }
    return result("a_contacter", ["contacte_par_autre_ancien"], {
      lastContact,
      nextContactTypeOf: config.firstContact
    });
  }

  if (ageDays > config.newCampaignDays) {
    return result("a_contacter", ["nouvelle_campagne"], {
      lastContact,
      nextContactTypeOf: config.firstContact
    });
  }

  if (last.typeOf === config.thirdContact) {
    return result("vivier", ["sequence_terminee"], {
      lastContact,
      eligibleFrom: addDays(last.time, config.newCampaignDays)
    });
  }

  if (ageDays < config.minDaysBeforeFollowUp) {
    return result("bloque", ["contacte_recemment"], {
      lastContact,
      nextContactTypeOf: NEXT_CONTACT[last.typeOf],
      eligibleFrom: addDays(last.time, config.minDaysBeforeFollowUp)
    });
  }

  return result("a_relancer", ["relance_due"], {
    lastContact,
    nextContactTypeOf: NEXT_CONTACT[last.typeOf]
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { classifyCandidate, CONFIG };
}
