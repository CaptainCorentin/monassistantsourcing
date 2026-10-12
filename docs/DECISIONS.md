# Décisions de cadrage

Outil personnel de Corentin Barczyk (boondId 15675). Propose une liste de candidats Boond déjà classés, avec des messages types à copier sur LinkedIn.

## Architecture

```
Navigateur ── mot de passe (cookie httpOnly) ──► Next.js sur Vercel (serveur uniquement)
                                                  ├─► Supabase : message_templates, candidate_flags (ids Boond seulement)
                                                  └─► Workflow N8N "SOURCING WEBAPP" (secret en en-tête)
                                                        ├─► API Boond en lecture (recherche filtrée + actions)
                                                        └─► Webhooks existants contact-existing-candidate / relaunch-candidate
```

- Aucun stockage de données candidat. Les candidats sont lus dans Boond à chaque recherche, filtrée et paginée (50 par page).
- Supabase contient les templates et les statuts propres à l'interface (masqué, reporté), indexés par id Boond uniquement.
- Le workflow de l'extension (`bZsfmIdulu88qB1Y`) **n'est pas modifié**. Les règles sont dupliquées dans `rules/contactability.js`, testé ici puis collé dans le nœud Code du nouveau workflow.
- "Marquer contacté" re-vérifie le candidat en direct, puis appelle le webhook existant avec le `nextContactTypeOf` calculé.

## Règles de classement

Filtres préalables : état Boond ∈ {0, 5, 11, 13}, `mainManager = 15675`.

Règles bloquantes (tous auteurs, reprises de la prod) : pas intéressé (18) < 90 j, rappel (1) dans le futur, fin de process (19) < 365 j, pré-qualif / entretiens (40, 130, 45, 134, 43) < 180 j.

L = dernière action de contact (131 / 15 / 16), tous auteurs.

| Situation | Catégorie | Action proposée |
|---|---|---|
| Aucun L | À contacter | 131 |
| L par un autre, < 60 j | Bloqué | aucune |
| L par un autre, ≥ 60 j | À contacter | 131 |
| L par moi, > 6 mois | À contacter (nouvelle campagne) | 131 |
| L par moi, type 16 | Vivier | aucune |
| L par moi, 131 ou 15, < 7 j | Bloqué (contact récent) | aucune |
| L par moi, 131 ou 15, ≥ 7 j | À relancer | 15 / 16 |

Hypothèses par défaut, à confirmer : l'état 0 correspond à "à traiter" ; un candidat jamais contacté en état 5 / 11 / 13 va aussi dans "À contacter" ; délai de 7 j avant relance ; 6 mois sans réponse à mon contact = nouvelle campagne.

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
