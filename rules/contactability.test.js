const test = require("node:test");
const assert = require("node:assert/strict");
const { classifyCandidate } = require("./contactability");

const NOW = Date.parse("2026-10-12T10:00:00Z");
const ME = "15675";
const OTHER = "99999";

// Action au format brut renvoyé par Boond (/candidates/{id}/actions).
function action(typeOf, daysAgo, managerId = ME) {
  return {
    attributes: { typeOf, startDate: new Date(NOW - daysAgo * 86400000).toISOString() },
    relationships: { mainManager: { data: { id: managerId } } }
  };
}

const cases = [
  // --- État Boond ---
  { name: "état hors liste blanche", state: 3, actions: [], category: "bloque", reasons: ["etat_non_contactable"] },
  { name: "état en string accepté", state: "5", actions: [], category: "a_contacter" },

  // --- À contacter ---
  { name: "aucune action", state: 0, actions: [], category: "a_contacter", reasons: ["jamais_contacte"], next: 131 },
  { name: "actions sans contact (ex: note)", state: 0, actions: [action(2, 10)], category: "a_contacter", next: 131 },
  { name: "contacté par un autre il y a 61 j", state: 0, actions: [action(131, 61, OTHER)], category: "a_contacter", reasons: ["contacte_par_autre_ancien"], next: 131 },
  { name: "mon 2e contact il y a 200 j : nouvelle campagne", state: 0, actions: [action(131, 220), action(15, 200)], category: "a_contacter", reasons: ["nouvelle_campagne"], next: 131 },
  { name: "mon 3e contact il y a 181 j : nouvelle campagne", state: 0, actions: [action(16, 181)], category: "a_contacter", reasons: ["nouvelle_campagne"] },

  // --- À relancer ---
  { name: "mon 1er contact il y a 8 j", state: 0, actions: [action(131, 8)], category: "a_relancer", next: 15 },
  { name: "mon 2e contact il y a 20 j", state: 11, actions: [action(131, 60), action(15, 20)], category: "a_relancer", next: 16 },
  { name: "mon 1er contact il y a 29 j : encore relançable", state: 0, actions: [action(131, 29)], category: "a_relancer", next: 15 },
  { name: "un autre a fait le 1er, moi le 2e : c'est moi le dernier", state: 0, actions: [action(131, 90, OTHER), action(15, 20)], category: "a_relancer", next: 16 },

  // --- Vivier ---
  { name: "mon 3e contact il y a 30 j", state: 0, actions: [action(131, 80), action(15, 50), action(16, 30)], category: "vivier", reasons: ["sequence_terminee"] },
  { name: "mon 1er contact il y a 30 j : relance expirée", state: 0, actions: [action(131, 30)], category: "vivier", reasons: ["relance_expiree"] },
  { name: "mon 2e contact il y a 120 j : relance expirée", state: 0, actions: [action(15, 120)], category: "vivier", reasons: ["relance_expiree"] },
  { name: "mon 3e contact il y a 2 j : vivier même récent", state: 0, actions: [action(16, 2)], category: "vivier" },

  // --- Bloqués par le contact ---
  { name: "contacté par un autre il y a 45 j", state: 0, actions: [action(131, 45, OTHER)], category: "bloque", reasons: ["contacte_par_autre_60j"] },
  { name: "mon 1er contact il y a 3 j", state: 0, actions: [action(131, 3)], category: "bloque", reasons: ["contacte_recemment"], next: 15 },
  { name: "dernier contact d'un autre, plus récent que le mien", state: 0, actions: [action(131, 40), action(15, 10, OTHER)], category: "bloque", reasons: ["contacte_par_autre_60j"] },

  // --- Règles bloquantes héritées de la prod ---
  { name: "pas intéressé il y a 89 j", state: 0, actions: [action(18, 89)], category: "bloque", reasons: ["pas_interesse_90j"] },
  { name: "pas intéressé il y a 91 j", state: 0, actions: [action(18, 91)], category: "a_contacter" },
  { name: "rappel programmé dans le futur", state: 0, actions: [action(1, -5)], category: "bloque", reasons: ["rappel_programme"] },
  { name: "rappel programmé passé : ne bloque plus", state: 0, actions: [action(1, 5)], category: "a_contacter" },
  { name: "fin de process il y a 300 j", state: 0, actions: [action(19, 300)], category: "bloque", reasons: ["fin_process_365j"] },
  { name: "entretien il y a 100 j", state: 0, actions: [action(130, 100)], category: "bloque", reasons: ["process_180j"] },
  { name: "pré-qualification (12) il y a 60 j", state: 0, actions: [action(12, 60)], category: "bloque", reasons: ["process_180j"] },
  { name: "entretien entre pairs (14) il y a 60 j", state: 0, actions: [action(14, 60)], category: "bloque", reasons: ["process_180j"] },
  { name: "fin de process à notre initiative (133) il y a 100 j", state: 0, actions: [action(133, 100)], category: "bloque", reasons: ["fin_process_365j"] },
  { name: "entretien il y a 200 j", state: 0, actions: [action(130, 200)], category: "a_contacter" },
  { name: "motifs cumulés", state: 0, actions: [action(18, 10), action(43, 20)], category: "bloque", reasons: ["pas_interesse_90j", "process_180j"] },
  { name: "bloqué prime sur à relancer", state: 0, actions: [action(131, 20), action(18, 5)], category: "bloque", reasons: ["pas_interesse_90j"] },

  // --- Données dégradées ---
  { name: "date illisible : ignorée, signalée", state: 0, actions: [{ attributes: { typeOf: 18, startDate: "n/a" } }], category: "a_contacter", warnings: ["date_invalide_action_18"] },
  { name: "deux contacts à la même date : le plus avancé gagne", state: 0, actions: [action(131, 20), action(15, 20)], category: "a_relancer", next: 16 },
  { name: "action sans mainManager : traitée comme un autre recruteur", state: 0, actions: [{ attributes: { typeOf: 131, startDate: new Date(NOW - 20 * 86400000).toISOString() } }], category: "bloque", reasons: ["contacte_par_autre_60j"] }
];

for (const c of cases) {
  test(c.name, () => {
    const r = classifyCandidate({ state: c.state, actions: c.actions, now: NOW });
    assert.equal(r.category, c.category);
    if (c.reasons) assert.deepEqual(r.reasons, c.reasons);
    if (c.next !== undefined) assert.equal(r.nextContactTypeOf, c.next);
    if (c.warnings) assert.deepEqual(r.warnings, c.warnings);
  });
}

test("eligibleFrom : date de déblocage la plus lointaine", () => {
  const r = classifyCandidate({ state: 0, actions: [action(18, 80), action(130, 10)], now: NOW });
  // pas intéressé débloqué dans 10 j, entretien dans 170 j
  assert.equal(r.eligibleFrom, new Date(NOW + 170 * 86400000).toISOString());
});

test("contactCount et lastContact renseignés", () => {
  const r = classifyCandidate({ state: 0, actions: [action(131, 60, OTHER), action(15, 20)], now: NOW });
  assert.equal(r.contactCount, 2);
  assert.equal(r.lastContact.typeOf, 15);
  assert.equal(r.lastContact.byMe, true);
});

test("date du dernier process, quel que soit son âge", () => {
  const r = classifyCandidate({ state: 11, actions: [action(40, 700), action(133, 400), action(131, 10, OTHER)], now: NOW });
  assert.equal(r.pastProcessDate, new Date(NOW - 400 * 86400000).toISOString());
  assert.equal(classifyCandidate({ state: 11, actions: [action(131, 100, OTHER)], now: NOW }).pastProcessDate, null);
});
