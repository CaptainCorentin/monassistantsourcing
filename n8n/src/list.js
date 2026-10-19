// Transforme la réponse Boond en une ligne par candidat, avec uniquement les champs utiles.
// Périmètre "mine" : on garde seulement les fiches dont Corentin est le responsable principal.
// Profils PAD / TR (préfixe du titre Boond, ex. « PAD1 - … », « TR - … ») : écartés avant
// la lecture de l'historique, pour ne pas dépenser d'appel Boond.
const EXCLUDED_TITLE = /^\s*(PAD|TR)\s*\d*\s*([-–—:|]|$)/i;
const params = $('Préparer la recherche').first().json.params;
const res = $json;
const data = Array.isArray(res.data) ? res.data : [];

const rows = [];
let excludedTitles = 0;
for (const c of data) {
  const a = c.attributes || {};
  const managerId = c.relationships?.mainManager?.data?.id;
  if (params.scope === 'mine' && String(managerId) !== '15675') continue;
  if (EXCLUDED_TITLE.test(a.title || '')) { excludedTitles++; continue; }
  const linkedin = (a.socialNetworks || []).find(n =>
    /linkedin/i.test(String(n.network || '')) || /linkedin\.com/i.test(String(n.url || '')));
  rows.push({
    json: {
      id: String(c.id),
      firstName: a.firstName || '',
      lastName: a.lastName || '',
      title: a.title || '',
      town: a.town || '',
      state: Number(a.state),
      updateDate: a.updateDate || null,
      linkedinUrl: linkedin ? linkedin.url : null,
      mainManagerId: managerId ? String(managerId) : null,
      excludedTitles
    }
  });
}

if (!rows.length) {
  return [{ json: { empty: true, searchTotal: res.meta?.totals?.rows ?? 0, excludedTitles, boondError: Array.isArray(res.errors) || !!res.error } }];
}
// Le compteur est connu une fois la liste parcourue : on le reporte sur chaque ligne.
for (const r of rows) r.json.excludedTitles = excludedTitles;
return rows.slice(0, params.maxChecks);
