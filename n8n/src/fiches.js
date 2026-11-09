// Construit les requêtes de fiches à partir de mes actions de contact récentes.
// « Mes relances » : les fiches viennent de ces actions (tout le vivier, sans dépendre de la date de mise à jour).
// Autres campagnes : recherche Boond paginée, jusqu'à 2 000 fiches lues (4 pages de 500).
// Dans les 2 cas, les fiches « passées » vers la campagne sont lues par référence (CAND123).
const params = $('Préparer la recherche').first().json.params;
const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const RELANCE_DAYS = 180;
const SEARCH_PAGES = 4;
const B = 'https://ui.boondmanager.com/api/candidates?';
const encode = pairs => pairs.map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(String(v))).join('&');

// Mon dernier contact par candidat, sur les 6 derniers mois.
const myLastContact = {};
let actionsRead = 0;
let actionsError = false;
let oldest = Infinity;
for (const item of $input.all()) {
  const r = item.json;
  if (!Array.isArray(r.data)) { actionsError = true; continue; }
  for (const a of r.data) {
    actionsRead++;
    const t = Date.parse(a.attributes?.startDate);
    if (Number.isNaN(t)) continue;
    oldest = Math.min(oldest, t);
    const dep = a.relationships?.dependsOn?.data;
    if (!dep || dep.type !== 'candidate' || !/^\d{1,9}$/.test(String(dep.id))) continue;
    if (now - t > RELANCE_DAYS * DAY) continue;
    const id = String(dep.id);
    if (!myLastContact[id] || t > myLastContact[id]) myLastContact[id] = t;
  }
}
// 1 000 actions lues sans atteindre 6 mois : les plus anciennes manquent.
const actionsTruncated = actionsRead >= 1000 && now - oldest < RELANCE_DAYS * DAY;
const relances = params.segments.includes('mes_relances');
const contactIds = Object.keys(myLastContact);

const out = { ...params, myLastContact, actionsRead, actionsError, actionsTruncated, relances };
const items = [];
const byRef = ids => encode([['maxResults', 100], ['keywords', ids.map(id => 'CAND' + id).join(' ')]]);
if (relances) {
  // Boond cherche « CAND1 CAND2 … » en OU : 100 fiches par requête, états contactables seulement.
  const states = params.states.map(s => ['candidateStates[]', s]);
  for (let i = 0; i < contactIds.length; i += 100) {
    items.push({ source: 'search', url: B + byRef(contactIds.slice(i, i + 100)) + '&' + encode(states) });
  }
} else {
  for (let page = 1; page <= SEARCH_PAGES; page++) {
    items.push({ source: 'search', url: B + encode([['maxResults', 500], ['page', page]]) + '&' + params.searchQuery });
  }
}
if (params.extraIds.length) items.push({ source: 'extra', url: B + byRef(params.extraIds) });
// Aucun contact récent pour « Mes relances » : une requête vide garde le flux en vie.
if (!items.length) items.push({ source: 'none', url: B + encode([['maxResults', 1], ['keywords', 'CAND0']]) });
return items.map(x => ({ json: { ...x, params: out } }));
