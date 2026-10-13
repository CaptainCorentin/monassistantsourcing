import { workflow, node, trigger, ifElse, sticky, expr } from '@n8n/workflow-sdk';

// 1. Entrée : la webapp appelle ce webhook avec sa clé dans l'en-tête X-Vivier-Key.
const webhook = trigger({
  type: 'n8n-nodes-base.webhook', version: 2.1,
  config: { name: 'Webapp · Demande de recherche', parameters: {
    httpMethod: 'POST', path: 'vivier-boond-search', responseMode: 'responseNode', options: {}
  } }
});

const hashKey = node({
  type: 'n8n-nodes-base.crypto', version: 2,
  config: { name: 'Calculer l\'empreinte de la clé', parameters: {
    action: 'hash', type: 'SHA256', encoding: 'hex', dataPropertyName: 'keyHash',
    value: expr("{{ $json.headers['x-vivier-key'] || '' }}")
  } }
});

const keyOk = ifElse({
  version: 2.2,
  config: { name: 'Clé valide ?', parameters: { conditions: {
    options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
    conditions: [{ leftValue: expr('{{ $json.keyHash }}'), operator: { type: 'string', operation: 'equals' }, rightValue: '6aee6335d2e1cf1e4669d2ed73f9bd53c76b7eea87df0aeab36edd051df59a53' }],
    combinator: 'and'
  } } }
});

const deny = node({
  type: 'n8n-nodes-base.respondToWebhook', version: 1.5,
  config: { name: 'Refuser (401)', parameters: {
    respondWith: 'json', responseBody: '{ "error": "Accès refusé." }', options: { responseCode: 401 }
  } }
});

// 2. Recherche Boond : une seule requête, filtrée sur le périmètre et les états.
const prepare = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Préparer la recherche', parameters: { mode: 'runOnceForAllItems', jsCode: "// Lit la demande de la webapp et construit l'URL de recherche Boond.\n// Toute valeur hors liste est remplac\u00e9e par une valeur par d\u00e9faut s\u00fbre.\nconst body = $json.body || {};\nconst ALLOWED_STATES = [0, 5, 11, 13]; // A traiter !, P+, LN+ (vivier), Vivier +++\nconst ME = '15675'; // Corentin Barczyk\n\nlet states = Array.isArray(body.states)\n  ? [...new Set(body.states.map(Number))].filter(s => ALLOWED_STATES.includes(s))\n  : [];\nif (!states.length) states = [11, 13];\n\nconst keywords = typeof body.keywords === 'string'\n  ? body.keywords.replace(/[\\u0000-\\u001f]/g, ' ').trim().slice(0, 120)\n  : '';\nconst scope = body.scope === 'all' ? 'all' : 'mine';\nconst sort = body.sort === 'creationDate' ? 'creationDate' : 'updateDate';\nconst order = body.order === 'asc' ? 'asc' : 'desc';\nconst maxChecks = Math.min(Math.max(Number(body.maxChecks) || 300, 10), 300);\n\n// URLSearchParams n'existe pas dans le bac \u00e0 sable des n\u0153uds Code : on assemble \u00e0 la main.\nconst query = [\n  ['maxResults', maxChecks],\n  ['page', 1],\n  ['sort', sort],\n  ['order', order],\n  ...(keywords ? [['keywords', keywords]] : []),\n  ...(scope === 'mine' ? [['perimeterManagers[]', ME]] : []),\n  ...states.map(s => ['candidateStates[]', s])\n].map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(String(v))).join('&');\n\nreturn [{\n  json: {\n    params: { keywords, states, scope, sort, order, maxChecks },\n    url: 'https://ui.boondmanager.com/api/candidates?' + query\n  }\n}];\n" } }
});

const search = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: { name: 'Boond · Rechercher les candidats', parameters: {
    method: 'GET', url: expr('{{ $json.url }}'),
    authentication: 'genericCredentialType', genericAuthType: 'httpBasicAuth', options: {}
  }, credentials: { httpBasicAuth: { id: '79iDzvM4hlzHzZqS', name: 'BOOND AUTH CORENTIN' } } }
});

const list = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Lister les candidats à vérifier', parameters: { mode: 'runOnceForAllItems', jsCode: "// Transforme la r\u00e9ponse Boond en une ligne par candidat, avec uniquement les champs utiles.\n// P\u00e9rim\u00e8tre \"mine\" : on garde seulement les fiches dont Corentin est le responsable principal.\nconst params = $('Pr\u00e9parer la recherche').first().json.params;\nconst res = $json;\nconst data = Array.isArray(res.data) ? res.data : [];\n\nconst rows = [];\nfor (const c of data) {\n  const a = c.attributes || {};\n  const managerId = c.relationships?.mainManager?.data?.id;\n  if (params.scope === 'mine' && String(managerId) !== '15675') continue;\n  const linkedin = (a.socialNetworks || []).find(n =>\n    /linkedin/i.test(String(n.network || '')) || /linkedin\\.com/i.test(String(n.url || '')));\n  rows.push({\n    json: {\n      id: String(c.id),\n      firstName: a.firstName || '',\n      lastName: a.lastName || '',\n      title: a.title || '',\n      town: a.town || '',\n      state: Number(a.state),\n      updateDate: a.updateDate || null,\n      linkedinUrl: linkedin ? linkedin.url : null,\n      mainManagerId: managerId ? String(managerId) : null\n    }\n  });\n}\n\nif (!rows.length) {\n  return [{ json: { empty: true, searchTotal: res.meta?.totals?.rows ?? 0, boondError: Array.isArray(res.errors) || !!res.error } }];\n}\nreturn rows.slice(0, params.maxChecks);\n" } }
});

const hasCandidates = ifElse({
  version: 2.2,
  config: { name: 'Des candidats à vérifier ?', parameters: { conditions: {
    options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
    conditions: [{ leftValue: expr('{{ $json.empty !== true }}'), operator: { type: 'boolean', operation: 'true', singleValue: true } }],
    combinator: 'and'
  } } }
});

const respondEmpty = node({
  type: 'n8n-nodes-base.respondToWebhook', version: 1.5,
  config: { name: 'Répondre (aucun candidat)', parameters: {
    respondWith: 'json',
    responseBody: expr('{{ JSON.stringify({ example: false, searchTotal: $json.searchTotal, checked: 0, contactables: 0, byCategory: { a_contacter: 0, a_relancer: 0, vivier: 0 }, excluded: {}, params: $(\'Préparer la recherche\').first().json.params, candidates: [], boondError: $json.boondError }) }}'),
    options: {}
  } }
});

// 3. Vérification : un appel par candidat pour lire son historique d'actions (lecture seule).
const history = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: { name: 'Boond · Historique des actions', onError: 'continueRegularOutput', parameters: {
    method: 'GET', url: expr('https://ui.boondmanager.com/api/candidates/{{ $json.id }}/actions?maxResults=500'),
    authentication: 'genericCredentialType', genericAuthType: 'httpBasicAuth',
    options: { batching: { batch: { batchSize: 5, batchInterval: 150 } } }
  }, credentials: { httpBasicAuth: { id: '79iDzvM4hlzHzZqS', name: 'BOOND AUTH CORENTIN' } } }
});

// 4. Classement avec les règles de rules/contactability.js, puis réponse à la webapp.
const classify = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Classer selon les règles de contactabilité', parameters: { mode: 'runOnceForAllItems', jsCode: "// R\u00e8gles de contactabilit\u00e9 d'un candidat Boond pour la webapp de sourcing.\n//\n// Source unique : ce fichier est test\u00e9 dans le repo (rules/contactability.test.js)\n// puis coll\u00e9 tel quel dans le n\u0153ud Code du workflow N8N \"SOURCING WEBAPP\".\n// Pas d'import, pas de d\u00e9pendance : uniquement du JS ex\u00e9cutable dans N8N.\n//\n// Les r\u00e8gles bloquantes reprennent celles du workflow de l'extension\n// (bZsfmIdulu88qB1Y, n\u0153ud \"Contactable en fct des actions pass\u00e9e ?\").\n// La r\u00e9partition \u00e0 contacter / \u00e0 relancer / vivier est propre \u00e0 la webapp.\n\nconst DAY_MS = 24 * 60 * 60 * 1000;\n\nconst CONFIG = {\n  meBoondId: \"15675\",\n  contactableStates: [0, 5, 11, 13],\n\n  // typeOf des actions Boond\n  firstContact: 131,\n  secondContact: 15,\n  thirdContact: 16,\n  notInterested: 18,\n  scheduledCallback: 1,\n  // Fin de process : 19 \u00e0 l'initiative du candidat (prod), 133 \u00e0 notre initiative (ajout webapp).\n  endOfProcessTypes: [19, 133],\n  // Process en cours. Prod : 40 Entretien 1, 45 Entretien 2, 130 Entretien 3, 134 Entretien en SUPPORT,\n  // 43 ED. Ajouts webapp (absents de la prod) : 12 Pr\u00e9-qualification, 14 Entre Pairs, 7 EM, 42 Signature.\n  processTypes: [40, 45, 130, 134, 43, 12, 14, 7, 42],\n\n  // Fen\u00eatres en jours\n  notInterestedDays: 90,\n  endOfProcessDays: 365,\n  processDays: 180,\n  otherRecruiterContactDays: 60, // contact\u00e9 par un autre recruteur : intouchable pendant 60 j\n  minDaysBeforeFollowUp: 7, // pas de relance moins de 7 j apr\u00e8s mon dernier contact\n  followUpWindowDays: 30, // l'extension ne propose la relance que < 30 j apr\u00e8s MON dernier contact\n  newCampaignDays: 180 // au-del\u00e0 de 6 mois apr\u00e8s mon dernier contact : nouvelle campagne\n};\n\nconst CONTACT_TYPES = [CONFIG.firstContact, CONFIG.secondContact, CONFIG.thirdContact];\nconst CONTACT_RANK = { [CONFIG.firstContact]: 1, [CONFIG.secondContact]: 2, [CONFIG.thirdContact]: 3 };\nconst NEXT_CONTACT = {\n  [CONFIG.firstContact]: CONFIG.secondContact,\n  [CONFIG.secondContact]: CONFIG.thirdContact\n};\n\nfunction addDays(ms, days) {\n  return new Date(ms + days * DAY_MS).toISOString();\n}\n\n// Normalise une action Boond brute (JSON:API) ou d\u00e9j\u00e0 aplatie.\nfunction normalizeAction(raw) {\n  const attrs = raw.attributes || raw;\n  const managerId = raw.relationships?.mainManager?.data?.id ?? raw.mainManagerId ?? null;\n  return {\n    typeOf: Number(attrs.typeOf),\n    time: new Date(attrs.startDate).getTime(),\n    startDate: attrs.startDate,\n    managerId: managerId === null ? null : String(managerId)\n  };\n}\n\n/**\n * @param {object} input\n * @param {number|string} input.state  \u00e9tat Boond du candidat\n * @param {Array} input.actions        actions Boond du candidat (brutes ou aplaties)\n * @param {number} [input.now]         timestamp ms, injectable pour les tests\n * @returns {{category: \"a_contacter\"|\"a_relancer\"|\"vivier\"|\"bloque\", reasons: string[],\n *            nextContactTypeOf: number|null, lastContact: object|null, contactCount: number,\n *            eligibleFrom: string|null, warnings: string[]}}\n */\nfunction classifyCandidate({ state, actions = [], now = Date.now() }, config = CONFIG) {\n  const warnings = [];\n  const parsed = [];\n  for (const raw of actions) {\n    const a = normalizeAction(raw);\n    // M\u00eame comportement que la prod : une date illisible ne bloque rien. On le signale.\n    if (Number.isNaN(a.time)) warnings.push(`date_invalide_action_${a.typeOf}`);\n    else parsed.push(a);\n  }\n\n  const contacts = parsed.filter(a => CONTACT_TYPES.includes(a.typeOf));\n  const result = (category, reasons, extra = {}) => ({\n    category,\n    reasons,\n    nextContactTypeOf: null,\n    lastContact: null,\n    contactCount: contacts.length,\n    eligibleFrom: null,\n    warnings,\n    ...extra\n  });\n\n  if (!config.contactableStates.includes(Number(state))) {\n    return result(\"bloque\", [\"etat_non_contactable\"]);\n  }\n\n  // R\u00e8gles bloquantes, tous auteurs confondus. On les cumule pour afficher tous les motifs,\n  // et on retient la date de d\u00e9blocage la plus lointaine.\n  const reasons = [];\n  let unblockAt = 0;\n  const block = (reason, untilMs) => {\n    if (!reasons.includes(reason)) reasons.push(reason);\n    unblockAt = Math.max(unblockAt, untilMs);\n  };\n  for (const a of parsed) {\n    if (a.typeOf === config.notInterested && a.time > now - config.notInterestedDays * DAY_MS) {\n      block(\"pas_interesse_90j\", a.time + config.notInterestedDays * DAY_MS);\n    }\n    if (a.typeOf === config.scheduledCallback && a.time > now) {\n      block(\"rappel_programme\", a.time);\n    }\n    if (config.endOfProcessTypes.includes(a.typeOf) && a.time > now - config.endOfProcessDays * DAY_MS) {\n      block(\"fin_process_365j\", a.time + config.endOfProcessDays * DAY_MS);\n    }\n    if (config.processTypes.includes(a.typeOf) && a.time > now - config.processDays * DAY_MS) {\n      block(\"process_180j\", a.time + config.processDays * DAY_MS);\n    }\n  }\n\n  // Dernier contact : le plus r\u00e9cent ; \u00e0 date \u00e9gale, le plus avanc\u00e9 (16 > 15 > 131).\n  const last = contacts.reduce((best, a) => {\n    if (!best) return a;\n    if (a.time !== best.time) return a.time > best.time ? a : best;\n    return CONTACT_RANK[a.typeOf] > CONTACT_RANK[best.typeOf] ? a : best;\n  }, null);\n  const lastContact = last && {\n    typeOf: last.typeOf,\n    date: last.startDate,\n    byMe: last.managerId === String(config.meBoondId),\n    managerId: last.managerId\n  };\n\n  if (reasons.length) {\n    return result(\"bloque\", reasons, { lastContact, eligibleFrom: new Date(unblockAt).toISOString() });\n  }\n\n  if (!last) {\n    return result(\"a_contacter\", [\"jamais_contacte\"], { nextContactTypeOf: config.firstContact });\n  }\n\n  const ageDays = (now - last.time) / DAY_MS;\n\n  if (!lastContact.byMe) {\n    if (ageDays < config.otherRecruiterContactDays) {\n      return result(\"bloque\", [\"contacte_par_autre_60j\"], {\n        lastContact,\n        eligibleFrom: addDays(last.time, config.otherRecruiterContactDays)\n      });\n    }\n    return result(\"a_contacter\", [\"contacte_par_autre_ancien\"], {\n      lastContact,\n      nextContactTypeOf: config.firstContact\n    });\n  }\n\n  if (ageDays > config.newCampaignDays) {\n    return result(\"a_contacter\", [\"nouvelle_campagne\"], {\n      lastContact,\n      nextContactTypeOf: config.firstContact\n    });\n  }\n\n  if (last.typeOf === config.thirdContact) {\n    return result(\"vivier\", [\"sequence_terminee\"], {\n      lastContact,\n      eligibleFrom: addDays(last.time, config.newCampaignDays)\n    });\n  }\n\n  // Au-del\u00e0 de 30 j, l'extension proposerait un nouveau 1er contact au lieu d'une relance :\n  // on ne propose rien jusqu'\u00e0 la nouvelle campagne.\n  if (ageDays >= config.followUpWindowDays) {\n    return result(\"vivier\", [\"relance_expiree\"], {\n      lastContact,\n      eligibleFrom: addDays(last.time, config.newCampaignDays)\n    });\n  }\n\n  if (ageDays < config.minDaysBeforeFollowUp) {\n    return result(\"bloque\", [\"contacte_recemment\"], {\n      lastContact,\n      nextContactTypeOf: NEXT_CONTACT[last.typeOf],\n      eligibleFrom: addDays(last.time, config.minDaysBeforeFollowUp)\n    });\n  }\n\n  return result(\"a_relancer\", [\"relance_due\"], {\n    lastContact,\n    nextContactTypeOf: NEXT_CONTACT[last.typeOf]\n  });\n}\n\nif (typeof module !== \"undefined\" && module.exports) {\n  module.exports = { classifyCandidate, CONFIG };\n}\n\n// ---------------------------------------------------------------------------\n// Application des r\u00e8gles \u00e0 chaque candidat. L'historique d'actions arrive dans\n// le m\u00eame ordre que la liste des candidats (un appel Boond par candidat).\nconst params = $('Pr\u00e9parer la recherche').first().json.params;\nconst searchTotal = $('Boond \u00b7 Rechercher les candidats').first().json.meta?.totals?.rows ?? null;\nconst candidates = $('Lister les candidats \u00e0 v\u00e9rifier').all().map(i => i.json);\nconst histories = $input.all().map(i => i.json);\nconst now = Date.now();\n\nconst kept = [];\nconst excluded = {};\nconst count = key => { excluded[key] = (excluded[key] || 0) + 1; };\n\ncandidates.forEach((c, i) => {\n  const h = histories[i];\n  if (!h || h.error || !Array.isArray(h.data)) return count('erreur_boond');\n  const r = classifyCandidate({ state: c.state, actions: h.data, now });\n  if (r.category === 'bloque') return count(r.reasons[0]);\n  kept.push({\n    ...c,\n    category: r.category,\n    reasons: r.reasons,\n    nextContactTypeOf: r.nextContactTypeOf,\n    lastContact: r.lastContact && { typeOf: r.lastContact.typeOf, date: r.lastContact.date, byMe: r.lastContact.byMe },\n    eligibleFrom: r.eligibleFrom\n  });\n});\n\nconst byCategory = { a_contacter: 0, a_relancer: 0, vivier: 0 };\nfor (const k of kept) byCategory[k.category]++;\n\nreturn [{\n  json: {\n    example: false,\n    searchTotal,\n    checked: candidates.length,\n    contactables: byCategory.a_contacter + byCategory.a_relancer,\n    byCategory,\n    excluded,\n    params,\n    candidates: kept\n  }\n}];\n" } }
});

const respond = node({
  type: 'n8n-nodes-base.respondToWebhook', version: 1.5,
  config: { name: 'Répondre à la webapp', parameters: { respondWith: 'firstIncomingItem', options: {} } }
});

const noteEntry = sticky('## 1. Entrée sécurisée\nLa webapp (Vercel) envoie sa clé dans l\'en-tête `X-Vivier-Key`. Seule l\'empreinte SHA-256 de la clé est stockée ici. Mauvaise clé : réponse 401, rien n\'est lu dans Boond.', [webhook, hashKey, keyOk, deny], { color: 7 });
const noteSearch = sticky('## 2. Recherche Boond (1 appel)\nPérimètre : responsable principal = Corentin (15675) par défaut. États par défaut : LN+ (11) et Vivier +++ (13). 300 candidats maximum.', [prepare, search, list, hasCandidates, respondEmpty], { color: 4 });
const noteCheck = sticky('## 3. Vérification et classement\nUn appel Boond par candidat (historique d\'actions, par lots de 5). Les règles sont la copie de `rules/contactability.js` (repo monassistantsourcing) : ne pas les modifier ici, modifier le fichier puis régénérer le workflow. **Aucune écriture dans Boond.**', [history, classify, respond], { color: 5 });

export default workflow('vivier-boond-webapp', 'VIVIER BOOND - Webapp sourcing')
  .add(webhook).to(hashKey).to(keyOk
    .onTrue(prepare.to(search).to(list).to(hasCandidates
      .onTrue(history.to(classify).to(respond))
      .onFalse(respondEmpty)))
    .onFalse(deny))
  .add(noteEntry).add(noteSearch).add(noteCheck);
