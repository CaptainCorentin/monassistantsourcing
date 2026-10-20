// Lit la demande de la webapp et construit les URL de recherche Boond.
// Toute valeur hors liste est remplacée par une valeur par défaut sûre.
// 1 requête pour la campagne, + 1 requête pour les fiches « passées » vers cette campagne (par référence).
const body = $json.body || {};
const ALLOWED_STATES = [0, 5, 11, 13]; // A traiter !, P+, LN+ (vivier), Vivier +++
const ME = '15675'; // Corentin Barczyk
const B = 'https://ui.boondmanager.com/api/candidates?';

let states = Array.isArray(body.states)
  ? [...new Set(body.states.map(Number))].filter(s => ALLOWED_STATES.includes(s))
  : [];
if (!states.length) states = [11, 13];

const keywords = typeof body.keywords === 'string'
  ? body.keywords.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 120)
  : '';
const scope = body.scope === 'all' ? 'all' : 'mine';
const sort = body.sort === 'creationDate' ? 'creationDate' : 'updateDate';
const order = body.order === 'asc' ? 'asc' : 'desc';
const maxChecks = Math.min(Math.max(Number(body.maxChecks) || 300, 10), 300);
// Préfixes de titre Boond (« PO2 - … ») : ciblage par séniorité. NONE = titre sans préfixe.
const titlePrefixes = Array.isArray(body.titlePrefixes)
  ? [...new Set(body.titlePrefixes.map(String))].filter(p => /^(PO[0-3]|QA[0-3]|NONE)$/.test(p))
  : [];
const requirePhone = body.requirePhone === true;
// Évaluation globale (soft / hard skills), valeurs du dictionnaire Boond : filtrée par Boond.
const EVALUATIONS = ['A', 'B', 'C', 'D', 'A/A', 'A/B', 'A/C', 'A/D', 'B/A', 'B/B', 'B/C', 'B/D', 'C/A', 'C/B', 'C/C', 'C/D'];
const evaluations = Array.isArray(body.evaluations)
  ? [...new Set(body.evaluations.map(String))].filter(e => EVALUATIONS.includes(e))
  : [];
const extraIds = Array.isArray(body.extraIds)
  ? [...new Set(body.extraIds.map(String))].filter(id => /^\d{1,9}$/.test(id)).slice(0, 100)
  : [];

// URLSearchParams n'existe pas dans le bac à sable des nœuds Code : on assemble à la main.
const encode = pairs => pairs.map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(String(v))).join('&');
const query = encode([
  ['maxResults', maxChecks],
  ['page', 1],
  ['sort', sort],
  ['order', order],
  ...(keywords ? [['keywords', keywords]] : []),
  ...(scope === 'mine' ? [['perimeterManagers[]', ME]] : []),
  ...states.map(s => ['candidateStates[]', s]),
  ...evaluations.map(e => ['evaluations[]', e])
]);

const params = { keywords, states, scope, sort, order, maxChecks, titlePrefixes, requirePhone, evaluations, extraIds };
const items = [{ json: { params, source: 'search', url: B + query } }];
// Boond cherche « CAND123 CAND456 » en OU : une seule requête pour toutes les fiches ajoutées.
if (extraIds.length) {
  items.push({ json: { params, source: 'extra', url: B + encode([['maxResults', 100], ['keywords', extraIds.map(id => 'CAND' + id).join(' ')]]) } });
}
return items;
