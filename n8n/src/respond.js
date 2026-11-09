// Complète la réponse du classement : compteurs de lecture (fiches lues, non vérifiées) et paramètres
// renvoyés sans les listes d'ids (fiches masquées, ajoutées, mes contacts récents).
const out = { ...$input.all()[0].json };
const meta = $('Lister les candidats à vérifier').first().json.meta || {};
const { excludeIds, extraIds, searchQuery, myLastContact, ...params } = out.params || {};
out.params = params;
out.searchTotal = meta.searchTotal ?? out.searchTotal;
out.read = meta.read ?? null;
out.notChecked = meta.notChecked ?? 0;
out.actionsTruncated = meta.actionsTruncated === true;
out.candidates = (out.candidates || []).map(({ meta, ...c }) => c);
return [{ json: out }];
