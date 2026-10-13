# Décisions de cadrage

Outil personnel de Corentin Barczyk (boondId 15675). Propose une liste de candidats Boond déjà classés, avec des messages types à copier sur LinkedIn.

## Architecture

```
Navigateur ── mot de passe (cookie httpOnly signé) ──► Next.js sur Vercel (routes serveur uniquement)
                                                  ├─► Supabase : message_templates, candidate_flags (ids Boond seulement)
                                                  └─► Workflow N8N "SOURCING VIVIER" (secret en en-tête, 1 exécution par recherche)
                                                        └─► API Boond en lecture seule (recherche filtrée + actions par candidat)
```

- Aucun stockage de données candidat. Les candidats sont lus dans Boond à chaque recherche : 1 appel liste filtré, puis 1 appel historique par fiche (300 fiches max, 10 à 40 s).
- Supabase contient les templates et les statuts propres à l'interface (masqué, reporté), indexés par id Boond uniquement.
- Le workflow de l'extension (`bZsfmIdulu88qB1Y`) **n'est pas modifié ni appelé**. Les règles sont dupliquées dans `rules/contactability.js`, testé ici puis collé dans le nœud Code du nouveau workflow.
- La webapp est en **lecture seule** : aucune écriture dans Boond. Le contact se fait depuis LinkedIn avec l'extension.
- Une recherche = 1 exécution N8N (liste filtrée + vérification de chaque candidat par id, 100 maximum).
- "À relancer" est aligné sur l'extension : relance proposée seulement si le dernier contact est le mien et date de moins de 30 j.

## Règles de classement

Filtres préalables : état Boond ∈ {0, 5, 11, 13}, `mainManager = 15675`.

Règles bloquantes (tous auteurs) : pas intéressé (18) < 90 j, rappel (1) dans le futur, fin de process (19, + 133 ajouté) < 365 j, process (40, 45, 130, 134, 43, + 12, 14, 7, 42 ajoutés) < 180 j. Les ajouts corrigent des codes absents de la prod (libellés vérifiés dans le dictionnaire Boond).

L = dernière action de contact (131 / 15 / 16), tous auteurs.

| Situation | Catégorie | Action proposée |
|---|---|---|
| Aucun L | À contacter | 131 |
| L par un autre, < 60 j | Bloqué | aucune |
| L par un autre, ≥ 60 j | À contacter | 131 |
| L par moi, > 6 mois | À contacter (nouvelle campagne) | 131 |
| L par moi, type 16 | Vivier | aucune |
| L par moi, 131 ou 15, < 7 j | Bloqué (contact récent) | aucune |
| L par moi, 131 ou 15, 7 à 30 j | À relancer | 15 / 16 |
| L par moi, 131 ou 15, 30 j à 6 mois | Vivier (relance expirée) | aucune |

Hypothèses par défaut, à confirmer : l'état 0 correspond à "à traiter" ; un candidat jamais contacté en état 5 / 11 / 13 va aussi dans "À contacter" ; délai de 7 j avant relance ; 6 mois sans réponse à mon contact = nouvelle campagne.

## Sécurité

- Tout est fermé par défaut (`middleware.ts`) : sans session valide, les pages redirigent vers `/login` et les routes API répondent 401. Sans `APP_PASSWORD` ou `SESSION_SECRET` configurés, personne ne peut se connecter.
- Session : cookie `httpOnly`, `Secure`, `SameSite=strict`, 7 jours, signé HMAC-SHA256. Mot de passe comparé en temps constant, 800 ms de délai après un échec.
- En-têtes : CSP `default-src 'self'` (la page ne parle qu'à son serveur), `frame-ancestors 'none'`, `X-Robots-Tag: noindex`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store`.
- Paramètres de recherche validés côté serveur avant tout appel (`lib/search-params.ts`).
- Données Boond affichées en texte (React échappe tout), liens LinkedIn limités à `https://*.linkedin.com`, lien Boond construit à partir d'un id numérique.
- Aucun credential Boond, N8N ou Supabase côté navigateur.
- Réponse N8N filtrée champ par champ côté serveur (`app/api/search/route.ts`) avant d'atteindre le navigateur.
- Écritures API : refusées si l'en-tête `Origin` n'est pas celui de la webapp ou si le corps n'est pas du JSON (en plus du cookie `SameSite=strict`).
- Supabase (`lbrdtyxlkfeiaveuinux`, région Paris) : RLS activé sans policy, droits retirés à `anon` et `authenticated`. Seul le serveur y accède avec la clé `service_role`. Schéma : `supabase/migrations/0001_init.sql`.

## Variables d'environnement (Vercel)

| Variable | Rôle |
|---|---|
| `APP_PASSWORD` | Mot de passe de connexion, 12 caractères minimum |
| `SESSION_SECRET` | Secret de signature des sessions, 32 caractères minimum |
| `SUPABASE_URL` | `https://lbrdtyxlkfeiaveuinux.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé `service_role` (Supabase, Project Settings, API). Jamais préfixée `NEXT_PUBLIC_`. |
| `N8N_WEBHOOK_URL` | Facultatif. Par défaut `https://wefiit.app.n8n.cloud/webhook/vivier-boond-search`. |
| `N8N_WEBHOOK_KEY` | Facultatif. Par défaut, la clé est lue dans la table Supabase `app_config` (ligne `n8n_webhook_key`). N8N ne stocke que son empreinte SHA-256. |

Sans clé (ni variable, ni Supabase configuré), la recherche renvoie des données d'exemple avec un bandeau d'avertissement.

## Hors périmètre

- Candidats absents de Boond : c'est le rôle de l'extension.
- Corrections du workflow de l'extension (pagination, injection sur la création de fiche, nouveau 131 après 30 j) : décision de ne pas y toucher.

## Commandes

```
node --test rules/*.test.js
```

## API Boond : résultats des tests (12/10/2026, lecture seule)

| Point | Résultat |
|---|---|
| Base candidats | 21 547 |
| `perimeterManagers[]=15675` | 886 candidats (filtre actif) |
| États : `states[]` | **ignoré** |
| États : `candidateStates[]` | actif. Mon périmètre en 0/5/11/13 : **698**, dont 465 en "A traiter !" |
| `keywords` | actif (Product Owner : 420 sur 698) |
| `maxResults` sur `/candidates` | 500 accepté |
| `maxResults` sur `/actions` | 100 accepté, 500 retombe à 30 |
| `/actions` + `perimeterManagers` | filtre sur l'**auteur** de l'action, pas sur le propriétaire du candidat : inutilisable pour une lecture en masse |
| Historique `/candidates/{id}/actions` | pas de troncature observée (6 candidats, 3 à 20 actions). On passe `maxResults=500` par sécurité. |
| Format de date | `2027-10-25T12:00:00+0200`, lu correctement par `new Date()` |

Conséquence : une page de 50 candidats = 1 appel liste + 50 appels historique.

Dictionnaire Boond, états candidat : 0 A traiter !, 5 P+, 11 LN+ (vivier), 13 Vivier +++.

Dictionnaire Boond, actions candidat utiles : 131 1er Contact, 15 2ème Contact, 16 3ème Contact et +, 18 Retour Négatif / Pas Intéressé, 1 Relance à faire / Rappel, 19 Fin de process à l'initiative du candidat, 133 Fin de process à NOTRE initiative, 12 Pré-qualification, 40 Entretien 1, 45 Entretien 2, 130 Entretien 3, 14 Entretien Entre Pairs, 134 Entretien en SUPPORT, 43 ED, 7 EM, 42 Signature, 132 Reco Talent A CONTACTER.
