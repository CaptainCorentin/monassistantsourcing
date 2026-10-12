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
