# Vivier Boond

Webapp personnelle de sourcing de Corentin Barczyk (WeFiiT). Elle lit le vivier Boond (LN+, Vivier +++ par défaut), vérifie l'historique de chaque fiche et propose les candidats contactables, avec des messages types à copier sur LinkedIn. Elle n'écrit jamais dans Boond : le contact se fait depuis LinkedIn avec l'extension « Sourcing LinkedIn — WeFiiT ».

```
Navigateur ─► Next.js sur Vercel ─┬─► Supabase (messages types, candidats masqués / reportés)
                                  └─► N8N « VIVIER BOOND - Webapp sourcing » ─► API Boond (lecture)
```

## Mise en route

1. Vercel, projet `monassistantsourcing`, Settings, Environment Variables : renseigner les 6 variables de `.env.example` (détail dans `docs/DECISIONS.md`).
2. Redéployer.
3. Ouvrir `/login`, saisir `APP_PASSWORD`, lancer une recherche.

Sans les variables N8N, la recherche affiche des données d'exemple et un bandeau l'indique.

## Développement

```
npm install
npm test           # règles de contactabilité (35 cas)
npm run typecheck
npm run build
```

## Documents

- `docs/DECISIONS.md` : cadrage, règles, sécurité, variables, résultats des tests Boond.
- `docs/NOTES.md` : questions ouvertes, difficultés et bugs, idées.
- `n8n/README.md` : le workflow N8N étape par étape, et comment changer la clé.
- `supabase/migrations/` : schéma de la base.
