
// ---------------------------------------------------------------------------
// Application des règles à chaque candidat. L'historique d'actions arrive dans
// le même ordre que la liste des candidats (un appel Boond par candidat).
const params = $('Préparer la recherche').first().json.params;
const searchTotal = $('Boond · Rechercher les candidats').first().json.meta?.totals?.rows ?? null;
const listed = $('Lister les candidats à vérifier').all().map(i => i.json);
const excludedCounts = listed[0]?.excludedCounts || {};
const candidates = listed.map(({ excludedCounts, ...c }) => c);
const histories = $input.all().map(i => i.json);
const now = Date.now();

const kept = [];
const excluded = {};
const count = key => { excluded[key] = (excluded[key] || 0) + 1; };
for (const [k, n] of Object.entries(excludedCounts)) if (n) excluded[k] = n;

// Historique affiché sur la fiche : 6 dernières actions, texte nettoyé et tronqué.
const plain = h => String(h || '')
  .replace(/<br\s*\/?>|<\/(p|div|li)>/gi, '\n').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"')
  .replace(/&gt;/g, '>').replace(/&lt;/g, '<')
  .replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').replace(/\n{2,}/g, '\n').trim();
const titleCase = s => String(s || '').toLowerCase().replace(/(^|[\s-])\S/g, m => m.toUpperCase());
function historyOf(h) {
  const names = {};
  for (const inc of h.included || []) {
    if (inc.type === 'resource') names[inc.id] = `${titleCase(inc.attributes?.firstName)} ${titleCase(inc.attributes?.lastName)}`.trim();
  }
  return h.data
    .map(a => {
      const by = a.relationships?.mainManager?.data?.id;
      return {
        typeOf: Number(a.attributes?.typeOf),
        date: a.attributes?.startDate || null,
        author: by ? names[by] || null : null,
        byMe: String(by) === CONFIG.meBoondId,
        text: plain(a.attributes?.text).slice(0, 320)
      };
    })
    .sort((x, y) => String(y.date).localeCompare(String(x.date)))
    .slice(0, 6);
}

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
    pastProcessDate: r.pastProcessDate,
    pastProcessByMe: r.pastProcessByMe,
    history: historyOf(h)
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
