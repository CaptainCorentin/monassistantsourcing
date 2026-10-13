# Vivier Boond

Webapp personnelle de sourcing de Corentin Barczyk (WeFiiT). Elle lit le vivier Boond (LN+, Vivier +++ par défaut), vérifie l'historique de chaque fiche et propose les candidats contactables, avec des messages types à copier sur LinkedIn. Elle n'écrit jamais dans Boond : le contact se fait depuis LinkedIn avec l'extension « Sourcing LinkedIn — WeFiiT ».

```
Navigateur ─► Next.js sur Vercel ─┬─► Supabase (mot de passe, sessions, banque de messages, messages types, masqués / reportés)
                                  └─► N8N « VIVIER BOOND - Webapp sourcing » ─► API Boond (lecture)
```

## Mise en route

Aucune variable Vercel n'est nécessaire. Ouvrir https://monassistantsourcing.vercel.app/login, saisir le mot de passe (transmis à part, empreinte bcrypt dans Supabase), lancer une recherche.

## Développement

```
npm install
npm test           # règles de contactabilité et banque de messages
npm run typecheck
npm run build
```

## Documents

- `docs/DECISIONS.md` : cadrage, règles, sécurité, variables, résultats des tests Boond.
- `docs/NOTES.md` : questions ouvertes, difficultés et bugs, idées.
- `docs/MESSAGES.md` : banque de messages matricielle et règles de choix des blocs.
- `n8n/README.md` : le workflow N8N étape par étape, et comment changer la clé.
- `supabase/migrations/` : schéma de la base.
