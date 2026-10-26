# Banque de messages matricielle

Validée le 13/10 et intégrée : textes dans Supabase (`message_blocks`, migration `0004`), modifiables depuis l'interface (section « Banque de messages »). Logique dans `lib/messages.ts`, testée par `rules/messages.test.mjs`. Les textes ci-dessous sont ceux de départ ; la version à jour est dans l'outil.

## Assemblage d'un 1er message

`Bonjour {{prenom}},` → **Accroche** (historique) → **Positionnement** (séniorité) → **Phrase métier** (discipline) + **Ouverture** (commune) → **Drivers** (séniorité) → **Appel à l'action** (commun)

## Choix automatique des blocs

| Axe | Règle | Correction |
|---|---|---|
| Historique | Motif de classement : `jamais_contacte` → A1, `contacte_par_autre_ancien` → A2, `nouvelle_campagne` → A3. Prioritaire : LN+ ou Vivier +++, ou un process tracé dans Boond (pré-qualification, entretien, fin de process), quel que soit son âge → A4 si j'ai fait le dernier échange, A5 sinon (collègue, ou aucun échange tracé) | Menu |
| Séniorité | Titre Boond : QA, Test, Qualité → QA ; Junior, Associate, Alternant → PO1 ; Senior, Lead, Head, Principal, Staff, Group, Director, VP → PO3 ; sinon PO2 | Menu |
| Discipline | Titre Boond : QA, Test → D-QA ; Data → D-DATA ; IA, AI, ML, GenAI → D-IA ; Builder, No-code, Automation → D-BUILD ; sinon D-DIGITAL | Menu |

Titre ambigu : le bloc par défaut est appliqué et la fiche le signale. Entreprise et ancienneté (A1) se saisissent sur la fiche, ne sont jamais enregistrées ; vides, l'accroche passe au repli.

## Accroche, selon l'historique

| Code | Cas | Texte |
|---|---|---|
| A1 | Jamais contacté | {{anciennete}} chez {{entreprise}}, c'est peut-être la fin d'un cycle… et le début d'un nouveau ? 😁 *(champs vides : « Ton parcours de {{titre}} a retenu mon attention. »)* |
| A2 | Contacté par un collègue il y a plus de 60 j | Beaucoup de choses ont bougé chez WeFiiT ces derniers mois, et ton profil colle pile à ce qu'on construit aujourd'hui. |
| A3 | Moi, sans réponse depuis plus de 6 mois | On dit souvent que la vie est une question de feeling et de timing… mon dernier message est sûrement arrivé au mauvais moment ! 😊 |
| A4 | LN+ / Vivier +++, dernier échange fait par moi | J'ai gardé un bon souvenir de nos derniers échanges, et beaucoup de choses ont bougé chez WeFiiT depuis. |
| A5 | LN+ / Vivier +++, dernier échange fait par un collègue ou non tracé | Tu avais marqué positivement WeFiiT lors de tes derniers échanges avec nous, et beaucoup de choses ont bougé depuis. |

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

**Appel à l'action, commun :** Si ça te parle, je serais ravi d'en échanger par téléphone : serais-tu disponible cette semaine ou la semaine prochaine ? / Passe une excellente journée

## Relances et note d'invitation

R1 (action 15), R2 (action 16) et la note d'invitation (INV, 300 caractères max, compteur dans l'outil) : voir la banque dans la section trame Blendy ci-dessous.

## Messages de campagne : trame Blendy (26/10)

100 % des messages suivent la trame en 10 points. Source unique : `scripts/messages-campagnes.json` (en base dans `campaigns.message` et `message_blocks`, migration 0014). `rules/messages.test.mjs` vérifie la trame sur chaque message de campagne.

| Point | Où dans le message |
|---|---|
| 1. Objet impactant | 1re ligne, avec `{{prenom}}` (c'est l'aperçu LinkedIn) |
| 2. Ultra-personnalisation | `{{accroche}}` selon l'historique, `{{poste}}` (titre Boond sans code PO1/QA…), `{{entreprise}}` en campagne conseil |
| 3. Humour ou compliment | accroches et 1re ligne |
| 4. Être direct | « Je vais droit au but » |
| 5. Aspirationnel | « devenir LA référence du Product à l'ère de l'IA » |
| 6. Objectifs chiffrés | top 3, plus de 120 WeFiiTers, plus de 400 missions, 2 sessions par semaine, 2 000 € de formation |
| 7. Perspectives d'évolution | puce 📈 |
| 8. Phrase filtre | « on ne sera pas faits l'un pour l'autre 😉 » |
| 9. FOMO | « les équipes se montent maintenant » |
| 10. CTA qui ne fait pas peur | 15 min de café virtuel cette semaine ou la suivante, sans engagement |

R1, R2 et la note d'invitation (300 caractères) sont en version compacte : ils gardent objet, personnalisation, chiffres, filtre et CTA. R2 propose une réponse par emoji (✅⏳❌).

À valider avant envoi en masse : les chiffres (120 WeFiiTers, 400 missions, 50 mentors, 2 000 €) et l'affirmation « les équipes Data & IA se montent maintenant ».

| Accroche | Cas | Texte |
|---|---|---|
| A1 | Jamais contacté | Ton parcours de {{poste}} m'a tout de suite interpellé, et je suis à peu près sûr que WeFiiT pourrait te correspondre. |
| A1-REPLI | Repli de A1 | Ton parcours de {{poste}} m'a tout de suite interpellé, et je suis à peu près sûr que WeFiiT pourrait te correspondre. |
| A2 | Contacté par un collègue (+60 j) | Tu as sans doute déjà reçu un message de mes collègues : s'ils ont insisté, c'est que ton profil de {{poste}} le vaut bien 😄 |
| A3 | Mon message sans réponse (+6 mois) | Mon dernier message est sûrement arrivé au mauvais moment (ça arrive aux meilleurs), mais ton profil de {{poste}} m'a trop marqué pour en rester là 😄 |
| A4 | Déjà échangé avec moi | Je garde un très bon souvenir de nos échanges, et ton profil de {{poste}} m'est revenu en tête en préparant nos prochaines missions. |
| A5 | Déjà échangé avec un collègue | On se souvient bien de ton profil chez WeFiiT, et ton parcours de {{poste}} m'est revenu en tête en préparant nos prochaines missions. |

### Banque

#### R1

```
{{prenom}}, le suspense est insoutenable 😄 As-tu vu passer mon message ?

En deux mots : un cabinet 100 % Product dans le top 3 en France, plus de 120 WeFiiTers, {{argument_metier}}, et de vraies perspectives (Lead PM, référent Data & IA).

On constitue en ce moment les équipes de nos offres Data & IA. Si ce n'est pas le bon moment, dis-le-moi simplement, je ne me vexe pas 😉

Sinon, 15 min de café virtuel cette semaine ou la suivante ?

Corentin
```

#### R2

```
{{prenom}}, dernier message promis (avant de passer en mode spam 😄)

Toujours convaincu que ton profil de {{poste}} a sa place chez nous : top 3 du Product en France, plus de 120 WeFiiTers, 100 % sur Claude Entreprise, {{argument_metier}}, et une évolution vers Lead PM ou référent Data & IA.

Les équipes Data & IA se montent maintenant. Pour nous faire gagner du temps, un emoji suffit :
✅ ok pour 15 min cette semaine ou la suivante
⏳ pas le bon timing
❌ pas un sujet pour moi

Corentin
```

#### INV

```
{{prenom}}, ton parcours de {{poste}} m'a interpellé 👀 WeFiiT : top 3 du Product en France, 100 % des équipes sur Claude, offres Data & IA en lancement. Pas pour toi si tu veux juste dérouler un backlog 😉 15 min pour en parler ?
```

### mon_vivier

```
{{prenom}}, question directe : et si ton prochain chapitre Product se jouait avec l'IA ? 🤖

{{accroche}}

Je vais droit au but : WeFiiT, c'est un cabinet 100 % Product Management, dans le top 3 en France, avec plus de 120 WeFiiTers et plus de 400 missions chez Louis Vuitton, Chanel, Accor, FDJ ou la SNCF. Notre objectif : devenir LA référence du Product à l'ère de l'IA.

🤖 100 % des WeFiiTers sur Claude Entreprise, et une communauté de builders
🎓 2 sessions de formation « PM augmenté » par semaine, 2 000 € de formation par an
📈 La suite pour toi : Lead PM, coach ou référent Data & IA, avec plus de 50 mentors pour t'y emmener

Par contre, si tu cherches à dérouler un backlog sans te poser de questions, on ne sera pas faits l'un pour l'autre 😉

On lance en ce moment nos offres Data & IA chez nos clients, et c'est maintenant que se constituent les équipes.

Partant pour 15 min de café virtuel cette semaine ou la suivante ? Sans engagement, promis 🙂

Corentin
Sales Lead chez @WeFiiT
```

### conseil_generaliste

```
{{prenom}}, et si tu passais du conseil généraliste au conseil 100 % Product ? 🚀

{{accroche}} Ton expérience chez {{entreprise}}, c'est exactement le bagage qu'on recherche.

Je vais droit au but : chez WeFiiT, on ne fait que du Product Management. Top 3 en France, plus de 120 WeFiiTers, plus de 400 missions chez Louis Vuitton, Chanel, Accor, FDJ ou la SNCF, et un objectif : devenir LA référence du Product à l'ère de l'IA.

🧭 Pas de practice imposée : tu choisis tes missions
🤖 100 % des WeFiiTers sur Claude Entreprise, 2 sessions « PM augmenté » par semaine
📈 La suite pour toi : Lead PM, coach ou référent Data & IA, avec plus de 50 mentors

Par contre, si tu veux garder un pied dans tous les sujets (SI, finance, transfo…), on ne sera pas faits l'un pour l'autre 😉

Nos offres Data & IA démarrent chez nos clients : les équipes se montent maintenant.

Partant pour 15 min de café virtuel cette semaine ou la suivante ? Sans engagement, promis 🙂

Corentin
Sales Lead chez @WeFiiT
```

### conseil_specialiste

```
{{prenom}}, entre gens du Product, je te dois un message honnête 😉

{{accroche}} Ton expérience chez {{entreprise}}, je la connais : pas besoin de te refaire le pitch du métier.

Je vais droit au but : ce qui fait la différence chez WeFiiT aujourd'hui, c'est le virage de l'IA. Top 3 du Product en France, plus de 120 WeFiiTers, et un objectif : devenir LA référence du Product à l'ère de l'IA.

🤖 100 % des WeFiiTers sur Claude Entreprise, et une communauté de builders
🎓 2 sessions « PM augmenté » par semaine, 2 000 € de formation par an
📈 La suite pour toi : porter nos offres Data & IA, devenir Lead PM ou coach

Par contre, si tu cherches un cabinet où l'IA reste un sujet de slides, on ne sera pas faits l'un pour l'autre 😉

Nos offres Data & IA démarrent chez Louis Vuitton, Chanel, Accor, FDJ ou la SNCF : les équipes se montent maintenant.

Partant pour 15 min de café virtuel cette semaine ou la suivante ? Sans engagement, promis 🙂

Corentin
Sales Lead chez @WeFiiT
```

### qa_conseil

```
{{prenom}}, une QA qui pèse sur le Produit (et pas seulement sur les tests), ça te parle ? 🎯

{{accroche}} Ton expérience chez {{entreprise}}, c'est exactement le bagage qu'on recherche.

Je vais droit au but : chez WeFiiT, nos QA sont intégrés aux squads, impliqués dès la conception, et premiers utilisateurs des features, chez Louis Vuitton, Chanel, Accor, FDJ ou la SNCF. Top 3 du Product en France, plus de 120 WeFiiTers.

🤖 100 % des WeFiiTers sur Claude Entreprise, et une communauté de builders
🎓 2 sessions « PM augmenté » par semaine, 2 000 € de formation par an
📈 La suite pour toi : test lead, automatisation, stratégie de test ou PO

Par contre, si tu préfères rester en fin de chaîne à dérouler des cahiers de recette, on ne sera pas faits l'un pour l'autre 😉

On lance nos offres Data & IA, et la qualité des produits IA est un sujet neuf : c'est maintenant que ça se joue.

Partant pour 15 min de café virtuel cette semaine ou la suivante ? Sans engagement, promis 🙂

Corentin
Sales Lead chez @WeFiiT
```

### prise_actu

```
{{prenom}}, ça fait un moment : je prends de tes nouvelles 👋

{{accroche}}

Je vais droit au but : l'IA rebat les cartes du Product, et WeFiiT a pris le virage. Top 3 en France, plus de 120 WeFiiTers, plus de 400 missions chez Louis Vuitton, Chanel, Accor, FDJ ou la SNCF, et un objectif : devenir LA référence du Product à l'ère de l'IA.

🤖 100 % des WeFiiTers sur Claude Entreprise, et une communauté de builders
🎓 2 sessions « PM augmenté » par semaine
📈 Des perspectives concrètes : Lead PM, coach, référent Data & IA

Si tu es pleinement épanoui là où tu es, dis-le-moi simplement : je ne t'embêterai pas 😉

Nos offres Data & IA démarrent en ce moment, et les équipes se montent maintenant.

Partant pour 15 min de café virtuel cette semaine ou la suivante, juste pour échanger sur l'actu Produit ? 🙂

Corentin
Sales Lead chez @WeFiiT
```

### jamais_process

```
{{prenom}}, on ne s'est jamais vraiment parlé, et c'est sans doute une erreur de notre part 😄

{{accroche}}

Je vais droit au but : le Product change vite avec l'IA, et c'est le bon moment pour en parler. WeFiiT, c'est le top 3 du Product en France, plus de 120 WeFiiTers, plus de 400 missions chez Louis Vuitton, Chanel, Accor, FDJ ou la SNCF, et un objectif : devenir LA référence du Product à l'ère de l'IA.

🤖 100 % des WeFiiTers sur Claude Entreprise, et une communauté de builders
🎓 2 sessions « PM augmenté » par semaine, 2 000 € de formation par an
📈 La suite pour toi : Lead PM, coach ou référent Data & IA, avec plus de 50 mentors

Par contre, si tu cherches à dérouler un backlog sans te poser de questions, on ne sera pas faits l'un pour l'autre 😉

Nos offres Data & IA démarrent chez nos clients : les équipes se montent maintenant.

Partant pour 15 min de café virtuel cette semaine ou la suivante ? Sans engagement, promis 🙂

Corentin
Sales Lead chez @WeFiiT
```
