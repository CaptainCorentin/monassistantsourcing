// Prépare l'action Boond, au même format que l'extension (« Création Action 1er » / « Relance »).
// Anti-doublon : si Corentin a déjà tracé un contact (131 / 15 / 16) sur ce candidat dans les
// dernières 24 h (double clic, extension utilisée en plus), on n'écrit rien.
const ME = '15675';
const req = $('Valider la demande').first().json;
const history = $json;
const actions = Array.isArray(history.data) ? history.data : [];
const DAY_MS = 24 * 60 * 60 * 1000;
const recent = actions.find(a =>
  [131, 15, 16].includes(Number(a.attributes?.typeOf)) &&
  String(a.relationships?.mainManager?.data?.id) === ME &&
  Date.now() - new Date(a.attributes?.startDate).getTime() < DAY_MS);

const d = new Date();
const p = n => String(n).padStart(2, '0');
const startDate = `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}+0000`;
const body = {
  data: {
    type: 'action',
    attributes: { typeOf: req.typeOf, text: req.text, startDate },
    relationships: {
      dependsOn: { data: { id: req.candidateId, type: 'candidate' } },
      mainManager: { data: { id: ME, type: 'resource' } }
    }
  }
};
return [{ json: {
  create: !recent && !req.dryRun && !history.error,
  duplicate: !!recent,
  dryRun: req.dryRun,
  historyError: !!history.error,
  body
} }];
