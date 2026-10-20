// Transforme les réponses Boond en une ligne par candidat, avec uniquement les champs utiles.
// Recherche de campagne : périmètre « mine » (responsable principal = Corentin), profils PAD / TR
// écartés, préfixe de titre ciblé. Fiches ajoutées à la campagne : gardées sans ces filtres.
// Tout est écarté avant la lecture de l'historique, pour ne pas dépenser d'appel Boond.
const EXCLUDED_TITLE = /^\s*(PAD|TR)\s*\d*\s*([-–—:|]|$)/i;
const PREFIX = /^\s*((?:PO|QA)[0-3])\s*([-–—:|]|$)/i;
const prepared = $('Préparer la recherche').all().map(i => i.json);
const params = prepared[0].params;
const responses = $input.all().map(i => i.json);

const seen = new Set();
const extras = [];
const found = [];
const excludedCounts = { profil_pad_tr: 0, hors_cible: 0, sans_telephone: 0 };
responses.forEach((res, idx) => {
  const extra = prepared[idx]?.source === 'extra';
  const data = Array.isArray(res.data) ? res.data : [];
  for (const c of data) {
    if (seen.has(String(c.id))) continue;
    seen.add(String(c.id));
    const a = c.attributes || {};
    const managerId = c.relationships?.mainManager?.data?.id;
    if (!extra) {
      if (params.scope === 'mine' && String(managerId) !== '15675') continue;
      if (EXCLUDED_TITLE.test(a.title || '')) { excludedCounts.profil_pad_tr++; continue; }
      if (params.titlePrefixes.length) {
        const m = PREFIX.exec(a.title || '');
        if (!params.titlePrefixes.includes(m ? m[1].toUpperCase() : 'NONE')) { excludedCounts.hors_cible++; continue; }
      }
    }
    const phone = [a.phone1, a.phone2].map(p => String(p || '').trim()).find(Boolean) || null;
    if (params.requirePhone && !phone) { excludedCounts.sans_telephone++; continue; }
    const linkedin = (a.socialNetworks || []).find(n =>
      /linkedin/i.test(String(n.network || '')) || /linkedin\.com/i.test(String(n.url || '')));
    (extra ? extras : found).push({
      json: {
        id: String(c.id),
        firstName: a.firstName || '',
        lastName: a.lastName || '',
        title: a.title || '',
        town: a.town || '',
        state: Number(a.state),
        updateDate: a.updateDate || null,
        linkedinUrl: linkedin ? linkedin.url : null,
        phone,
        mainManagerId: managerId ? String(managerId) : null,
        addedToCampaign: extra
      }
    });
  }
});

const rows = [...extras, ...found.slice(0, params.maxChecks)];
if (!rows.length) {
  return [{ json: { empty: true, searchTotal: responses[0]?.meta?.totals?.rows ?? 0, excludedCounts, boondError: responses.some(r => Array.isArray(r.errors) || !!r.error) } }];
}
// Les compteurs ne sont connus qu'à la fin : on les reporte sur chaque ligne.
for (const r of rows) r.json.excludedCounts = excludedCounts;
return rows;
