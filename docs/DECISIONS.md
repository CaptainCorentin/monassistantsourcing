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

## Campagnes (20/10)

Retour d'usage : trop de temps perdu à ouvrir les fiches. L'outil part désormais d'un ciblage et d'un message, plus d'une liste.

- **Écran 1, campagnes** : ciblage Boond (états, préfixe du titre PO1 à QA2 ou sans préfixe, mots-clés, périmètre, téléphone requis), canal (message LinkedIn ou cold call), cible (à contacter, à relancer, les deux), message unique avec `{{accroche}}` choisie fiche par fiche. Message vide = modèle de la banque (séniorité + discipline de la campagne). Les candidats à relancer reçoivent R1 ou R2.
- **Écran 2, session** : un candidat à la fois, historique Boond (6 dernières actions, auteur, texte tronqué) sans ouvrir le CRM, message modifiable. « Envoyer sur LinkedIn » : copie + ouverture du profil + suivant (reporté 7 j, le temps que l'extension crée l'action). Cold call : lien `tel:` + « Appel passé ». Raccourcis : Ctrl + Entrée, flèche droite.
- **Passer** : juste passer, plus tard (30 j), sortir du vivier à relancer (masqué, dans la webapp seulement : Boond n'est pas modifié), ou vers une autre campagne (`campaign_members`, id Boond seulement ; la fiche arrive en tête de cette campagne, lue en 1 requête Boond `keywords=CAND…`).
- Toujours 1 exécution N8N par lancement de campagne.

## Règles de classement

Filtres préalables : état Boond ∈ {0, 5, 11, 13}, `mainManager = 15675`, titre ne commençant pas par PAD ou TR (« PAD1 - … », « TR - … »), écartés avant la lecture de l'historique.

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

- **Aucun secret côté Vercel.** Le serveur n'utilise que la clé publique Supabase (`sb_publishable_…`), conçue pour être exposée. Les tables sont fermées (RLS sans policy, droits retirés à `anon` / `authenticated`) ; le seul accès passe par des fonctions `app_*` (`SECURITY DEFINER`, `search_path` vide) qui exigent un jeton de session valide (`supabase/migrations/0003_auth_rpc.sql`).
- **Mot de passe** : empreinte bcrypt dans `app_config` (`password_hash`). 10 échecs en 15 minutes bloquent toute connexion jusqu'à la fin de la fenêtre. Pour le changer : `update app_config set value = extensions.crypt('<nouveau>', extensions.gen_salt('bf', 10)) where key = 'password_hash'`.
- **Session** : jeton aléatoire de 256 bits en cookie `httpOnly`, `Secure`, `SameSite=strict`, 7 jours. Seule son empreinte SHA-256 est stockée (`app_sessions`). Déconnexion = expiration immédiate.
- **Middleware** (`middleware.ts`) : tout est fermé par défaut ; chaque page et chaque API vérifie la session en base. Écritures refusées hors JSON ou depuis une autre origine.
- **En-têtes** : CSP `default-src 'self'`, `frame-ancestors 'none'`, `X-Robots-Tag: noindex`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, HSTS (Vercel).
- **Clé N8N** : stockée dans `app_config`, délivrée par `app_n8n_key` à une session valide uniquement ; N8N ne stocke que son empreinte SHA-256.
- **Entrées** validées côté serveur (`lib/search-params.ts`, `lib/templates.ts`), réponse N8N filtrée champ par champ (`app/api/search/route.ts`), données Boond affichées en texte, liens LinkedIn limités à `https://*.linkedin.com`.
- **`/api/health`** (public) : indique seulement si Supabase répond ; avec l'en-tête `X-Health-Key`, pingue N8N qui valide lui-même la clé. Aucune donnée.

## Variables d'environnement (Vercel)

Aucune n'est requise. Surcharges possibles : `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_KEY` (voir `.env.example`).

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

## Filtres Boond utilisables pour des campagnes (discovery du 20/10, lecture seule)

Base : mes fiches LN+ et Vivier +++ = 216. Tout le vivier WeFiiT LN+ et Vivier +++ = 2 096. Mes « A traiter ! » = 461.

| Filtre | Paramètre `/candidates` | Actif ? | Répartition sur mes 216 |
|---|---|---|---|
| Évaluation globale | `evaluations[]=A/B` (valeur exacte) | oui | non évalués 140 ; A/B 29, B/B 16, A/A 12, B/A 10, A/C 4, B 3, B/C 2. A/A + A/B + B/A + B/B = 67 (756 sur tout le vivier) |
| Disponibilité | `availabilityTypes[]=0` | oui | Immédiate 14, < 1 mois 4, 1 à 3 mois 7, 3 mois 14, > 3 mois 7, date précise ~15, vide 156 |
| Expérience | `experiences[]=1` | oui | Débutant 14, Junior 35, Confirmé 42, Senior 13, Expert 1, vide 111 |
| Provenance | `sources[]=1` | oui | LinkedIn eMsg 49, KASPR 44, Annonces WTTJ 43, APEC CV 40, Cooptation 17, autres < 5 |
| Date de création | `period=created&startDate&endDate` | oui | 29 créées depuis le 01/01/2026 |
| Date de mise à jour | `period=updated` | oui | |
| Date de dernière action | `period=actions`, `lastAction`, `action` | **non** (ignoré) | calculé par N8N depuis l'historique : jamais contacté, mon contact > 6 mois, collègue > 60 j |
| Flags, `globalEvaluations[]` | | non (ignorés) | |
| Outils, domaines | | quasi vides (≤ 15 fiches renseignées) | |

Évaluations détaillées : chaque entretien porte 2 critères notés A à D et le recruteur (`evaluations[].notations`, `manager`). L'évaluation globale résume « critère 1 / critère 2 ».
