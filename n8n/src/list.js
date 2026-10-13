// Transforme la réponse Boond en une ligne par candidat, avec uniquement les champs utiles.
// Périmètre "mine" : on garde seulement les fiches dont Corentin est le responsable principal.
const params = $('Préparer la recherche').first().json.params;
const res = $json;
const data = Array.isArray(res.data) ? res.data : [];

const rows = [];
for (const c of data) {
  const a = c.attributes || {};
  const managerId = c.relationships?.mainManager?.data?.id;
  if (params.scope === 'mine' && String(managerId) !== '15675') continue;
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
      mainManagerId: managerId ? String(managerId) : null
    }
  });
}

if (!rows.length) {
  return [{ json: { empty: true, searchTotal: res.meta?.totals?.rows ?? 0, boondError: Array.isArray(res.errors) || !!res.error } }];
}
return rows.slice(0, params.maxChecks);
