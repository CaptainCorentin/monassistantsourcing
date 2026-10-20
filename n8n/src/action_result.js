// Réponse à la webapp après l'écriture dans Boond.
const r = $json;
const id = r.data?.id;
return [{ json: id ? { ok: true, actionId: String(id) } : { ok: false, error: 'Boond a refusé l\'action.' } }];
