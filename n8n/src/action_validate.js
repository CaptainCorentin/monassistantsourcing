// Valide la demande de la webapp : quel candidat, quelle action de contact, quel message.
// Toute valeur hors liste rend la demande invalide (rien n'est écrit dans Boond).
const body = $json.body || {};
const candidateId = String(body.candidateId ?? '');
const typeOf = Number(body.typeOf);
const text = typeof body.text === 'string'
  ? body.text.replace(/[\u0000-\u0008\u000b-\u001f]/g, ' ').trim().slice(0, 4000)
  : '';
const valid = /^\d{1,9}$/.test(candidateId) && [131, 15, 16].includes(typeOf) && text.length > 0;
return [{ json: { valid, candidateId, typeOf, text, dryRun: body.dryRun === true } }];
