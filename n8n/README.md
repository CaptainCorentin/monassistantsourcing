# Workflows N8N

## VIVIER BOOND - Webapp sourcing (`KA7TDhTS5hhToZQz`)

Backend de la webapp. Publié, webhook de production :
`POST https://wefiit.app.n8n.cloud/webhook/vivier-boond-search`

| Étape | Nœuds | Rôle |
|---|---|---|
| 1. Entrée sécurisée | Webapp · Demande de recherche, Calculer l'empreinte de la clé, Clé valide ?, Refuser (401) | Compare le SHA-256 de l'en-tête `X-Vivier-Key` à l'empreinte stockée. Mauvaise clé : 401, aucun appel Boond. |
| 2. Recherche Boond | Préparer la recherche, Boond · Rechercher les candidats, Lister les candidats à vérifier, Des candidats à vérifier ?, Répondre (aucun candidat) | 1 appel `/candidates` filtré (périmètre, `candidateStates[]`, mots-clés, tri), 300 fiches max. |
| 3. Vérification et classement | Boond · Historique des actions, Classer selon les règles de contactabilité, Répondre à la webapp | 1 appel `/candidates/{id}/actions` par fiche (lots de 5), puis les règles de `rules/contactability.js`. |

Entrée (JSON) : `{ keywords, states: [11, 13], scope: "mine" | "all", sort, order, maxChecks: 100 | 200 | 300, titlePrefixes: ["PO2", "NONE"…], requirePhone, extraIds: ["12345"…] }`. `extraIds` = fiches déplacées vers la campagne : une 2e requête `keywords=CAND12345 CAND…`, sans filtre de ciblage.
Sortie : `{ searchTotal, checked, contactables, byCategory, excluded, params, candidates[] }`, chaque candidat avec `phone`, `addedToCampaign` et `history` (6 dernières actions : type, date, auteur, texte nettoyé de 320 caractères).

Le code des 3 nœuds Code est testé hors N8N par `rules/n8n.test.mjs`.

Lecture seule : aucun nœud n'écrit dans Boond. Exécutions réussies non conservées (`saveDataSuccessExecution: none`), délai max 150 s.

### Modifier le workflow

Le code des nœuds Code vit dans `n8n/src/` et `rules/contactability.js`. `n8n/build-sdk.py <empreinte>` régénère le code SDK complet (`vivier-webapp.sdk.js`). Modifier les fichiers, lancer `npm test`, puis reporter le code dans les nœuds.

### Changer la clé

1. `openssl rand -hex 32` → nouvelle clé.
2. `printf %s "<clé>" | sha256sum` → mettre l'empreinte dans le nœud « Clé valide ? ».
3. Mettre la clé dans Supabase : `update app_config set value = '<clé>' where key = 'n8n_webhook_key'` (ou dans Vercel, `N8N_WEBHOOK_KEY`, prioritaire).

## TEST WEBAPP VIVIER EN LIGNE (`vMwmlsis2fg6Fxpd`)

Contrôles en lecture seule du site déployé : page de connexion, redirection sans session, refus des API sans session, mauvais mot de passe, en-têtes de sécurité, et `/api/health` (présence des variables ; avec la clé, appels réels à Supabase et au ping N8N). La clé n'est pas stockée dans le workflow : à l'exécution, l'envoyer dans l'en-tête `x-health-key` du webhook de test.

Résultat attendu une fois les variables saisies : `sante_avec_cle` renvoie `config.session: true`, `config.supabase: true`, `supabase: "ok"`, `templates: 2`, `n8n: "ok"`.

## TEST WEBAPP VIVIER CONNECTÉE (`caPElLMkTkVWlPTR`)

Parcours connecté du site en ligne, avec une session de test créée en base (jamais le mot de passe) : en-têtes `x-test-session` (jeton) et `x-health-key` (clé N8N), corps `{ "phase": "connecte" | "deconnexion" | "apres" }`. Les appels d'une phase partent en parallèle, d'où la déconnexion dans sa propre phase. Résumé sans données candidats.

Créer une session de test d'une heure (SQL) : `insert into app_sessions (token_hash, expires_at) values (encode(extensions.digest('<jeton>', 'sha256'), 'hex'), now() + interval '1 hour')`.

## TEST LECTURE BOOND (`Gcv02j4UwyOdKeyz`, archivé)

Sondes en lecture seule de l'API Boond du 12/10/2026 (`probe-boond-lecture-seule.json`). Résultats dans `docs/DECISIONS.md`.
