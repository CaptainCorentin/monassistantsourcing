// Transforme les réponses Boond en une ligne par candidat, avec uniquement les champs utiles.
// Recherche de campagne : périmètre « mine » (responsable principal = Corentin), profils PAD / TR
// écartés, préfixe de titre ciblé. Fiches ajoutées à la campagne : gardées sans ces filtres.
// Tout est écarté avant la lecture de l'historique, pour ne pas dépenser d'appel Boond.
const EXCLUDED_TITLE = /^\s*(PAD|TR)\s*\d*\s*([-–—:|]|$)/i;
const PREFIX = /^\s*((?:PO|QA)[0-3])\s*([-–—:|]|$)/i;
// Entreprises : le nom doit figurer dans la fiche (titre, compétences, expériences, diplômes),
// en mots entiers, espaces facultatifs (« TestIT » = « testit » ou « test it », pas « latest item »).
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const companyTokens = c => c.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const prepared = $('Préparer la recherche').all().map(i => i.json);
const params = prepared[0].params;
const companyRules = (params.companies || []).map(name => ({
  name, re: new RegExp('(?<![a-z0-9])' + companyTokens(name).join('\\s*') + '(?![a-z0-9])')
}));
const responses = $input.all().map(i => i.json);

const seen = new Set();
const extras = [];
const found = [];
const excludedCounts = { profil_pad_tr: 0, hors_cible: 0, sans_telephone: 0, hors_entreprise: 0 };
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
    let company = null;
    let companyInTitle = false;
    if (!extra && companyRules.length) {
      const refs = Array.isArray(a.references) ? a.references : [];
      const fiche = norm([a.title, a.skills, ...(a.diplomas || []), ...refs.flatMap(r => [r.company, r.title, r.description])].join(' '));
      const rule = companyRules.find(r => r.re.test(fiche));
      if (!rule) { excludedCounts.hors_entreprise++; continue; }
      company = rule.name;
      companyInTitle = rule.re.test(norm(a.title));
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
        company,
        companyInTitle,
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
