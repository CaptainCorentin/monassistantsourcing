# Workflows N8N

## VIVIER BOOND - Webapp sourcing (`KA7TDhTS5hhToZQz`)

Backend de la webapp. Publié, webhook de production :
`POST https://wefiit.app.n8n.cloud/webhook/vivier-boond-search`

| Étape | Nœuds | Rôle |
|---|---|---|
| 1. Entrée sécurisée | Webapp · Demande de recherche, Calculer l'empreinte de la clé, Clé valide ?, Refuser (401) | Compare le SHA-256 de l'en-tête `X-Vivier-Key` à l'empreinte stockée. Mauvaise clé : 401, aucun appel Boond. |
| 2. Recherche Boond | Préparer la recherche, Boond · Rechercher les candidats, Lister les candidats à vérifier, Des candidats à vérifier ?, Répondre (aucun candidat) | 1 appel `/candidates` filtré (périmètre, `candidateStates[]`, mots-clés, tri), 300 fiches max. |
| 3. Vérification et classement | Boond · Historique des actions, Classer selon les règles de contactabilité, Répondre à la webapp | 1 appel `/candidates/{id}/actions` par fiche (lots de 5), puis les règles de `rules/contactability.js`. |

Entrée (JSON) : `{ keywords, states: [11, 13], scope: "mine" | "all", sort: "updateDate" | "creationDate", order: "asc" | "desc", maxChecks: 100 | 200 | 300 }`.
Sortie : `{ searchTotal, checked, contactables, byCategory, excluded, params, candidates[] }`.

Lecture seule : aucun nœud n'écrit dans Boond. Exécutions réussies non conservées (`saveDataSuccessExecution: none`), délai max 150 s.

### Modifier le workflow

Le code des nœuds Code vit dans `n8n/src/` et `rules/contactability.js`. `n8n/build-sdk.py <empreinte>` régénère le code SDK complet (`vivier-webapp.sdk.js`). Modifier les fichiers, lancer `npm test`, puis reporter le code dans les nœuds.

### Changer la clé

1. `openssl rand -hex 32` → nouvelle clé.
2. `printf %s "<clé>" | sha256sum` → mettre l'empreinte dans le nœud « Clé valide ? ».
3. Mettre la clé dans Vercel (`N8N_WEBHOOK_KEY`) et redéployer.

## TEST LECTURE BOOND (`Gcv02j4UwyOdKeyz`, archivé)

Sondes en lecture seule de l'API Boond du 12/10/2026 (`probe-boond-lecture-seule.json`). Résultats dans `docs/DECISIONS.md`.
