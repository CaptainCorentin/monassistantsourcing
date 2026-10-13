// Lit la demande de la webapp et construit l'URL de recherche Boond.
// Toute valeur hors liste est remplacée par une valeur par défaut sûre.
const body = $json.body || {};
const ALLOWED_STATES = [0, 5, 11, 13]; // A traiter !, P+, LN+ (vivier), Vivier +++
const ME = '15675'; // Corentin Barczyk

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

// URLSearchParams n'existe pas dans le bac à sable des nœuds Code : on assemble à la main.
const query = [
  ['maxResults', maxChecks],
  ['page', 1],
  ['sort', sort],
  ['order', order],
  ...(keywords ? [['keywords', keywords]] : []),
  ...(scope === 'mine' ? [['perimeterManagers[]', ME]] : []),
  ...states.map(s => ['candidateStates[]', s])
].map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(String(v))).join('&');

return [{
  json: {
    params: { keywords, states, scope, sort, order, maxChecks },
    url: 'https://ui.boondmanager.com/api/candidates?' + query
  }
}];
