# Vivier Boond

Webapp personnelle de sourcing de Corentin Barczyk (WeFiiT), organisée en campagnes. Une campagne = un ciblage Boond (états, préfixe du titre, mots-clés, téléphone) + un canal (LinkedIn ou cold call) + un message unique. Une fois lancée, les candidats contactables défilent un par un, avec leur historique Boond et le message pré-rempli : « Envoyer sur LinkedIn » copie le message et ouvre le profil en 1 clic, « Passer » reporte, sort du vivier ou déplace vers une autre campagne. Elle n'écrit jamais dans Boond : le contact se fait depuis LinkedIn avec l'extension « Sourcing LinkedIn — WeFiiT ».

```
Navigateur ─► Next.js sur Vercel ─┬─► Supabase (mot de passe, sessions, campagnes, banque de messages, ids Boond reportés / sortis / déplacés)
                                  └─► N8N « VIVIER BOOND - Webapp sourcing » ─► API Boond (lecture)
```

## Mise en route

Aucune variable Vercel n'est nécessaire. Ouvrir https://monassistantsourcing.vercel.app/login, saisir le mot de passe (transmis à part, empreinte bcrypt dans Supabase), lancer une recherche.

## Développement

```
npm install
npm test           # règles, banque de messages, nœuds Code N8N (réponses Boond simulées)
npm run typecheck
npm run build
```

## Documents

- `docs/DECISIONS.md` : cadrage, règles, sécurité, variables, résultats des tests Boond.
- `docs/NOTES.md` : questions ouvertes, difficultés et bugs, idées.
- `docs/MESSAGES.md` : banque de messages matricielle et règles de choix des blocs.
- `n8n/README.md` : le workflow N8N étape par étape, et comment changer la clé.
- `supabase/migrations/` : schéma de la base.
