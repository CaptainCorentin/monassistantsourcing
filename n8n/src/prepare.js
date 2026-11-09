// Lit la demande de la webapp et prépare la lecture Boond, en 2 temps :
// 1. ici, mes actions de contact (131 / 15 / 16), les plus récentes d'abord (10 pages de 100) ;
// 2. « Préparer la lecture des fiches » construit ensuite les requêtes de fiches.
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
const maxChecks = Math.min(Math.max(Number(body.maxChecks) || 300, 10), 500);
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
// Entreprises ciblées (« Wavestone », « BAcceptance »…) : recherche Boond sur toute la fiche, en OU.
// Les majuscules internes séparent les mots (BAcceptance → B Acceptance) ; la variante à tiret
// rattrape les graphies « B-Acceptance ». N8N confirme ensuite le nom dans la fiche (« Lister »).
const companies = Array.isArray(body.companies)
  ? [...new Set(body.companies.map(c => String(c).trim()))].filter(c => /^[\p{L}\p{N} &.'-]{2,40}$/u.test(c)).slice(0, 30)
  : [];
const companyTokens = c => c.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const companyKeywords = companies.flatMap(c => {
  const t = companyTokens(c);
  return t.length > 1 ? [t.join(''), t.join('-')] : t;
});
const extraIds = Array.isArray(body.extraIds)
  ? [...new Set(body.extraIds.map(String))].filter(id => /^\d{1,9}$/.test(id)).slice(0, 100)
  : [];
// Fiches masquées ou reportées dans la webapp : écartées avant la lecture de l'historique.
const excludeIds = Array.isArray(body.excludeIds)
  ? [...new Set(body.excludeIds.map(String))].filter(id => /^\d{1,9}$/.test(id)).slice(0, 3000)
  : [];
// Segments (seul « mes_relances » change la lecture) et cible de la campagne.
const segments = Array.isArray(body.segments) ? body.segments.map(String).filter(x => /^[a-z0-9_]{1,40}$/.test(x)).slice(0, 10) : [];
const target = ['a_contacter', 'a_relancer', 'tous'].includes(body.target) ? body.target : 'tous';

// URLSearchParams n'existe pas dans le bac à sable des nœuds Code : on assemble à la main.
const encode = pairs => pairs.map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(String(v))).join('&');
// Recherche de campagne, sans pagination ni taille de page (ajoutées à l'étape suivante).
const searchQuery = encode([
  ['sort', sort],
  ['order', order],
  ...(companyKeywords.length ? [['keywords', companyKeywords.join(' ')]] : keywords ? [['keywords', keywords]] : []),
  ...(scope === 'mine' ? [['perimeterManagers[]', ME]] : []),
  ...states.map(s => ['candidateStates[]', s]),
  ...evaluations.map(e => ['evaluations[]', e])
]);

const params = { keywords, states, scope, sort, order, maxChecks, titlePrefixes, requirePhone, evaluations, companies, extraIds, excludeIds, segments, target, searchQuery };
// /actions + perimeterManagers = actions dont je suis l'auteur ; triées de la plus récente à la plus ancienne.
const ACTIONS_PAGES = 10;
return Array.from({ length: ACTIONS_PAGES }, (_, i) => ({ json: {
  params,
  url: 'https://ui.boondmanager.com/api/actions?' + encode([['maxResults', 100], ['page', i + 1], ['perimeterManagers[]', ME],
    ['actionTypes[]', 131], ['actionTypes[]', 15], ['actionTypes[]', 16]])
} }));
