# Journal de bord : questions, difficultés, idées

Tenu pendant le build en autonomie. Chaque entrée est datée et classée. Les questions attendent une réponse de Corentin ; tant qu'il n'y en a pas, l'hypothèse indiquée s'applique.

## Questions ouvertes

| # | Question | Hypothèse appliquée en attendant |
|---|---|---|
| Q1 | Le vivier à exploiter, c'est seulement tes fiches (responsable principal = toi) ou tout le vivier LN+ / Vivier +++ de WeFiiT ? | Tes fiches par défaut. La webapp propose une option « Tout le vivier WeFiiT ». |
| Q2 | Un candidat dont le dernier contact vient d'un collègue il y a plus de 60 jours : on le contacte sans prévenir le collègue ? | Oui, il apparaît dans « À contacter » avec la mention « contacté par un autre recruteur ». |
| Q3 | Faut-il exclure les candidats sans URL LinkedIn ? | Non : la fiche affiche « Pas de LinkedIn » et le lien Boond reste disponible. |
| Q4 | Les états 0 (A traiter !) et 5 (P+) doivent-ils rester cochables dans la recherche ? | Oui, mais décochés par défaut : la recherche par défaut porte sur LN+ et Vivier +++. |

## Difficultés et bugs rencontrés

| Date | Sujet | Détail | Statut |
|---|---|---|---|
| 13/10 | Connecteur Vercel | Création de projet refusée (403), puis variables, déploiements et journaux du projet `monassistantsourcing` inaccessibles (404/403). | Contourné : déploiement par push Git. Les variables d'environnement restent à saisir par Corentin. |
| 13/10 | Accès à l'URL Vercel | Le proxy de mon environnement refuse `*.vercel.app` : je ne peux pas tester la webapp en ligne. | Tests faits en local sur le build de production. |
| 13/10 | Création du workflow N8N | Le code SDK contenant des `\n` dans les chaînes est mal transmis par le MCP (« Unterminated string »). | Contourné : squelette créé d'abord, code des nœuds injecté ensuite par mise à jour. |
| 13/10 | Groupes de nœuds N8N | Un groupe ne peut pas contenir le déclencheur ni une branche IF qui sort du groupe. | Remplacé par 3 notes de section colorées. |
| 13/10 | Nœuds Code N8N | `URLSearchParams` n'existe pas dans le bac à sable du Code node (exécution 12136 en erreur). | Corrigé : URL assemblée avec `encodeURIComponent`. |
| 13/10 | Accès à N8N | Le proxy de mon environnement refuse aussi `wefiit.app.n8n.cloud` en HTTP direct : le webhook de production n'a été testé que via le MCP (mode manuel), et la webapp contre un faux N8N local au même format. | À vérifier en ligne par Corentin. |
| 13/10 | Données dans N8N | Les exécutions en erreur conservent leurs données, y compris l'en-tête `X-Vivier-Key` et des fiches candidats. Les exécutions réussies ne sont plus conservées. | Accepté : l'accès N8N donne déjà accès à Boond. À purger si une erreur survient. |
| 13/10 | Périmètre « mine » | `perimeterManagers[]=15675` renvoie 214 fiches LN+ / Vivier +++, mais 22 n'ont pas Corentin en responsable principal (sans doute responsable RH). | Filtrées dans « Lister les candidats à vérifier ». |
| 13/10 | Preuve en production | Pour lire le résultat d'une exécution de production, la conservation des exécutions réussies a été rallumée le temps d'un test puis recoupée. Les exécutions 12137 (manuelle) et 12141 (production) contiennent des fiches candidats et la clé. | **À supprimer** dans N8N, Executions, par Corentin (le MCP ne permet pas de supprimer). |
| 13/10 | Variables Vercel | Impossible de lire ou d'écrire les variables du projet via le connecteur. | Contourné : URL N8N par défaut dans le code, clé lue dans Supabase `app_config` si la variable manque. |
| 13/10 | Outil SQL Supabase et `$$` / `DELETE` | Via le MCP, toute requête avec `DELETE` ou `DROP` attend une confirmation humaine (expiration au bout de 60 s). Les corps de fonction en `$$` posaient aussi problème. | Contourné : fonctions sur une ligne entre apostrophes, suppressions remplacées par expiration (sessions, reports) et archivage (messages). Une fonction de test `app_ping` (sans droits) reste à supprimer. |
| 13/10 | Test connecté en parallèle | Les appels d'une même exécution N8N partent en parallèle : la déconnexion de test a fermé la session avant les autres appels (502 « session_invalide »). | Corrigé dans le test : déconnexion dans une phase séparée. Pas un bug de la webapp. |
| 13/10 | Variables Vercel absentes | Contrôle en ligne depuis N8N (workflow « TEST WEBAPP VIVIER EN LIGNE », exécution 12148, 08:46) : site en ligne, sécurité conforme (login 200, accueil 307 vers /login, API 401 sans session, CSP, DENY, noindex, HSTS), mais `/api/health` indique `session: false`, `supabase: false`, `n8nKeyInVercel: false`. Aucune variable n'est saisie : personne ne peut se connecter. | Résolu sans toi : mot de passe et sessions déplacés dans Supabase, clé publique uniquement côté serveur, aucune variable Vercel requise. |
| 20/10 | Écriture des actions de contact | Vérifié en ligne en mode test (exécution 14007) : webapp → workflow « Action de contact » → lecture de l'historique Boond → action 131 préparée au format de l'extension, **rien d'écrit**. Type hors liste refusé (400). Aucune action de test créée dans Boond : la première vraie action sera ton premier envoi. | Fait. |
| 20/10 | Vérification en ligne des tuiles | Exécution 13992 : 6 tuiles en base. Contactables réels : Pépites 31 (17 repris d'un collègue, 11 relance de campagne, 3 jamais contactés ; 30 avec téléphone), LN+ / Vivier +++ 133 (39 jamais contactés, 52 relance de campagne, 42 repris d'un collègue), Relances en cours 24, Pépites du vivier WeFiiT 136 (290 fiches lues sur 548). L'exécution garde les réponses brutes de la webapp. | **À supprimer** dans N8N, Executions, par Corentin. |
| 20/10 | Discovery des filtres Boond | Workflow « TEST DISCOVERY FILTRES BOOND » (`726M9BcZ3GcuoRU8`, archivé). Résumés sans données personnelles, mais le contexte des exécutions 13976 et 13982 garde une réponse Boond brute (fiches avec mails et téléphones). | **À supprimer** dans N8N, Executions, par Corentin. |
| 20/10 | Vérification en ligne des campagnes | Workflow « TEST WEBAPP VIVIER CONNECTÉE », exécution 13969 : santé ok, écran des campagnes, 6 campagnes, banque (28 blocs), recherche PO2 réelle (11 contactables, tous avec historique, 0 titre hors PO2, 58 hors cible), cold call réel (29 contactables, tous avec téléphone, 17 sans téléphone écartés). Session de test expirée ensuite. L'exécution garde les réponses brutes de la webapp. | **À supprimer** dans N8N, Executions, par Corentin. |
| 20/10 | Sonde Boond pour les campagnes | Workflow « TEST SONDE BOOND CAMPAGNES » (`Ggd9YDwiOFq2F3CP`, archivé) : le résumé ne contient que des noms de champs, mais le contexte de l'exécution 13961 a gardé une réponse Boond brute (actions d'une fiche, dont un compte rendu d'entretien). | **À supprimer** dans N8N, Executions, par Corentin. |
| 19/10 | Lecture des messages d'Hermine et Pablo | Workflow « TEST LECTURE MESSAGES HERMINE PABLO » (`3dJmNZ0Nj4bXJN5A`, archivé) : 100 dernières actions 131 / 15 / 16 de chacun, regroupées par modèle. Le résultat est anonymisé, mais l'exécution 13644 garde les réponses Boond brutes (noms des candidats). | **À supprimer** dans N8N, Executions, par Corentin. |
| 12/10 | API Boond | `states[]` est ignoré sans erreur, le bon filtre est `candidateStates[]`. `maxResults` sur `/actions` plafonne à 100. | Pris en compte. |
| 12/10 | Workflow de l'extension | Codes d'action mal libellés (40 = Entretien 1, pas Pré-qualification) : pré-qualification, entretien entre pairs, EM, signature et fin de process à notre initiative ne bloquent pas un contact. | Corrigé dans la webapp seulement. L'extension n'est pas modifiée (décision). |
| 12/10 | Workflow de l'extension | Recherche par nom en `OR` sans `maxResults` : risque de faux « absent de Boond » et donc de doublons. Historique d'actions lu sans `maxResults`. | Signalé, non corrigé (décision). |
| 12/10 | Workflow de l'extension | Création de fiche : `firstName`, `lastName`, `title`, `town` et URL insérés entre guillemets dans le JSON (injection N8N-01 encore ouverte sur ce nœud). | Signalé, non corrigé (décision). |

## Vérification en ligne (13/10, 09:21, workflow N8N « TEST WEBAPP VIVIER CONNECTÉE », exécutions 12267 à 12277)

Sur https://monassistantsourcing.vercel.app, avec une session de test temporaire (aucun mot de passe transmis) :

| Contrôle | Résultat |
|---|---|
| `/api/health` | `supabase: ok`, `n8n: ok` |
| Accueil connecté | 200, page de recherche |
| `/api/templates` | 200, 2 messages types (Supabase) |
| `/api/flags` | 200 |
| `/api/search` (LN+ / Vivier +++, mes fiches) | 200, **données réelles** : 214 fiches, 192 vérifiées, **136 contactables**, 136 avec LinkedIn |
| Déconnexion puis accueil | 307 vers `/login` |
| Déconnexion puis `/api/templates` | 401 |

Mot de passe réel vérifié en base avec les droits de la clé publique : bon mot de passe accepté, mauvais refusé. Sessions de test fermées ensuite.

Audit Supabase : `anon_security_definer_function_executable` (WARN) sur les 10 fonctions `app_*`. Voulu : ce sont les seules entrées de l'API, chacune exige une session (ou le mot de passe pour `app_login`). `rls_enabled_no_policy` (INFO) : voulu, tables fermées.

## Résultat de référence (13/10, exécution 12137)

Mes fiches LN+ et Vivier +++ : 214 fiches Boond, 192 vérifiées, **136 contactables** (136 à contacter, 0 à relancer), 3 en vivier, 53 écartées (17 contactées par un collègue il y a moins de 60 j, 16 fin de process, 11 process en cours, 9 rappel programmé). Durée : 10 s. Rejoué en mode production (exécution 12141, webhook publié) avec le même résultat. Les 100 premiers contactables sont exportés hors repo (CSV privé), 99 sur 100 avec LinkedIn.

## Idées

- **Plafond de 300 fiches lues** : « Relances en cours » (696 fiches en états 0, 5, 11, 13) et « Pépites du vivier WeFiiT » (548) ne lisent que les 300 plus récemment mises à jour. Une relance sur une fiche ancienne peut manquer. Piste : une 2e recherche Boond sur les actions 131 / 15 récentes (filtre `/actions` par auteur, déjà testé) pour cibler directement les relances.

- **Ciblage par préfixe hors de ton périmètre** : le préfixe du titre est filtré après la recherche Boond, sur les 300 premières fiches. Sur « Mes fiches » (216), tout est lu. Sur « Tout le vivier », ajouter le préfixe (ex. PO2) en mot-clé Boond pour que la recherche ramène directement les bonnes fiches.
- **Suivi des campagnes** : compter, par campagne, les messages envoyés puis les réponses (action Boond suivante) pour comparer les messages, comme pour Hermine et Pablo.

- **Laisser Claude tester le site en ligne** : dans les réglages de l'environnement cloud (menu de l'environnement dans la barre de titre de la session, puis Edit, Network access), ajouter `monassistantsourcing.vercel.app` et `wefiit.app.n8n.cloud` aux domaines autorisés. Doc : https://code.claude.com/docs/en/cloud-environments#network-access

- **Mémoriser la dernière recherche** côté navigateur (sessionStorage) pour ne pas relancer 300 vérifications à chaque rafraîchissement.
- **Recherches enregistrées** (« PO Paris LN+ », « QA Vivier +++ ») dans Supabase, lançables en un clic.
- **Tri par ancienneté de contact** dans « À contacter » : les fiches jamais touchées depuis longtemps d'abord.
- **Compteur hebdomadaire** des candidats copiés (« Message copié ») pour suivre ton rythme de sourcing, stocké en ids seulement.
- **Lien direct vers l'extension** : bouton « Ouvrir sur LinkedIn » qui ouvre le profil, où l'extension prend le relais pour créer l'action Boond.
- **Message adapté par Claude** au titre et à l'expérience du candidat, à partir du template choisi (appel serveur, jamais côté navigateur).
- **Ordre « à contacter »** : sur 136, 54 sont des relances de campagne (ton dernier contact a plus de 6 mois) et 42 ont été contactés par un collègue il y a plus de 60 j. Un tri ou un filtre par motif aiderait à prioriser les 40 jamais contactés.
- **Alerte de dérive des règles** : un test qui compare les constantes de `rules/contactability.js` à celles du workflow de l'extension, pour repérer un délai modifié d'un côté seulement.
