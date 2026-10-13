# Banque de messages matricielle

Version finalisée le 13/10, à valider avant intégration dans Supabase et dans l'outil.

## Assemblage d'un 1er message

`Bonjour {{prenom}},` → **Accroche** (historique) → **Positionnement** (séniorité) → **Phrase métier** (discipline) + **Ouverture** (commune) → **Drivers** (séniorité) → **Appel à l'action** (commun)

## Choix automatique des blocs

| Axe | Règle | Correction |
|---|---|---|
| Historique | Motif de classement : `jamais_contacte` → A1, `contacte_par_autre_ancien` → A2, `nouvelle_campagne` → A3, fin de process ou process de plus d'un an → A4 | Menu |
| Séniorité | Titre Boond : QA, Test, Qualité → QA ; Junior, Associate, Alternant → PO1 ; Senior, Lead, Head, Principal, Staff, Group, Director, VP → PO3 ; sinon PO2 | Menu |
| Discipline | Titre Boond : QA, Test → D-QA ; Data → D-DATA ; IA, AI, ML, GenAI → D-IA ; Builder, No-code, Automation → D-BUILD ; sinon D-DIGITAL | Menu |

Titre ambigu : le bloc par défaut est appliqué et le menu le signale.

## Accroche, selon l'historique

| Code | Cas | Texte |
|---|---|---|
| A1 | Jamais contacté | {{anciennete}} chez {{entreprise}}, c'est peut-être la fin d'un cycle… et le début d'un nouveau ? 😁 *(champs vides : « Ton parcours de {{titre}} a retenu mon attention. »)* |
| A2 | Contacté par un collègue il y a plus de 60 j | Beaucoup de choses ont bougé chez WeFiiT ces derniers mois, et ton profil colle pile à ce qu'on construit aujourd'hui. |
| A3 | Moi, sans réponse depuis plus de 6 mois | On dit souvent que la vie est une question de feeling et de timing… mon dernier message est sûrement arrivé au mauvais moment ! 😊 |
| A4 | Ex-candidat, process il y a plus d'un an | On s'était croisés en {{annee_process}} lors de ton process chez WeFiiT. Beaucoup de choses ont bougé depuis, de ton côté comme du nôtre. |

## Positionnement, selon la séniorité

| Code | Texte |
|---|---|
| PO1 / PO2 | Chez WeFiiT, on ne fait que du Product Management, et on cherche les meilleurs PM et PO de Paris pour devenir la référence du métier en France. |
| PO3 | Chez WeFiiT, on cherche les futurs leaders du Product Management digital, Data et IA : des profils qui font grandir nos clients autant que l'équipe. |
| QA | Chez WeFiiT, on cherche les meilleurs QA de Paris : des stratèges de la qualité produit, impliqués dès la conception (shift left), pas de simples exécutants de tests. |

## Phrase métier, selon la discipline

| Code | Texte | Version courte `{{argument_metier}}` |
|---|---|---|
| D-DIGITAL | Nos PM adressent des enjeux de conversion, d'acquisition, d'adoption et de conduite du changement, en Product Management fullstack (strategy, discovery, delivery) augmenté par l'IA. | du Product Management fullstack augmenté par l'IA, sur la conversion et l'adoption |
| D-DATA | On vient du produit : en Data Product, ce qu'on apporte d'abord, c'est de l'impact, avec une vraie vision Data as a Product. | du Data Product orienté impact, porté par des gens du produit |
| D-IA | Prendre en main des produits non déterministes, c'est un autre métier, et c'est exactement celui qu'on développe chez nos clients. | des produits IA non déterministes, un métier qu'on développe chez nos clients |
| D-BUILD | On cherche des PM qui buildent : prototypes, agents, workflows automatisés, choix techniques. On ne livre pas pour rien, on livre pour l'impact. | des PM qui buildent : prototypes, agents, workflows automatisés |
| D-QA | Chez nous, qualité et produit se nourrissent : nos QA sont intégrés aux squads et sont les premiers utilisateurs des features. | une QA intégrée aux squads, au cœur du produit |

**Ouverture, commune :** Et si demain tu veux explorer la Data, l'IA, le build ou le pur digital, c'est possible : pas de practice chez WeFiiT, chaque consultant choisit ses missions. 100 % des WeFiiTers ont Claude Code, et chacun dispose de 2 000 € de formation par an via l'Université WeFiiT.

## Drivers, selon la séniorité

| Code | Texte |
|---|---|
| PO1 | Tu pourras accélérer ta montée en compétences : formations sur mesure, plus de 50 mentors, et une communauté de pairs (Guildes, WeTalks). |
| PO2 | Tu pourras approfondir la discovery et la stratégie, être mentoré et accompagné, tout en co-construisant WeFiiT selon tes appétences. |
| PO3 | Tu pourras accompagner tes pairs dans leur carrière, coacher nos clients et peser sur la stratégie interne de WeFiiT. |
| QA | Tu pourras évoluer vers l'automatisation, la stratégie de test ou un rôle de PO, sur des missions 100 % QA et agiles. |

**Appel à l'action, commun :** Si ça te parle, je serais ravi d'en échanger par téléphone : serais-tu disponible aujourd'hui ou demain ? / Passe une excellente journée

## Relances

| Code | Action Boond | Texte |
|---|---|---|
| R1 | 15 (J+7 à J+30) | Hello {{prenom}}, le suspense est insoutenable… as-tu bien reçu mon dernier message ? Promis, je ne me vexe pas si la réponse est non 😉 |
| R2 | 16 (après R1) | Hello {{prenom}}, as-tu pu lire mon précédent message ? En bref, chez WeFiiT : 🎯 {{argument_metier}} 🎯 tu choisis tes missions, sans practice imposée 🎯 tu co-construis l'entreprise avec plus de 115 WeFiiTers. On se donne 15 min cette semaine ? |

## Note d'invitation LinkedIn (300 caractères max)

> Bonjour {{prenom}}, je suis Corentin, recruteur chez WeFiiT, cabinet 100 % Product Management. Chez nous : {{argument_metier}}. Pas de practice, chacun choisit ses missions. Ouvert à en discuter ?

Longueur avec un prénom de 15 lettres : 228 (D-QA) à 264 caractères (D-DIGITAL). L'outil affiche un compteur et alerte au-delà de 300.
