
// ---------------------------------------------------------------------------
// Application des règles à chaque candidat. L'historique d'actions arrive dans
// le même ordre que la liste des candidats (un appel Boond par candidat).
const params = $('Préparer la recherche').first().json.params;
const searchTotal = $('Boond · Rechercher les candidats').first().json.meta?.totals?.rows ?? null;
const candidates = $('Lister les candidats à vérifier').all().map(i => i.json);
const histories = $input.all().map(i => i.json);
const now = Date.now();

const kept = [];
const excluded = {};
const count = key => { excluded[key] = (excluded[key] || 0) + 1; };

candidates.forEach((c, i) => {
  const h = histories[i];
  if (!h || h.error || !Array.isArray(h.data)) return count('erreur_boond');
  const r = classifyCandidate({ state: c.state, actions: h.data, now });
  if (r.category === 'bloque') return count(r.reasons[0]);
  kept.push({
    ...c,
    category: r.category,
    reasons: r.reasons,
    nextContactTypeOf: r.nextContactTypeOf,
    lastContact: r.lastContact && { typeOf: r.lastContact.typeOf, date: r.lastContact.date, byMe: r.lastContact.byMe },
    eligibleFrom: r.eligibleFrom,
    pastProcessDate: r.pastProcessDate
  });
});

const byCategory = { a_contacter: 0, a_relancer: 0, vivier: 0 };
for (const k of kept) byCategory[k.category]++;

return [{
  json: {
    example: false,
    searchTotal,
    checked: candidates.length,
    contactables: byCategory.a_contacter + byCategory.a_relancer,
    byCategory,
    excluded,
    params,
    candidates: kept
  }
}];
