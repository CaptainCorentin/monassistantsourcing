-- Campagnes prêtes à lancer (tuiles). Clé fixe dans « preset » ; message et ciblage restent modifiables.
-- Les 6 campagnes de départ du 20/10, jamais modifiées, sont archivées : les tuiles les remplacent.
alter table public.campaigns add column preset text unique check (preset is null or preset ~ '^[a-z_]{1,40}$');

update public.campaigns set archived = true, updated_at = now() where preset is null and updated_at = created_at and not archived;

insert into public.campaigns (preset, name, channel, target, filters, seniority, discipline, message) values
  ('pepites', 'Pépites déjà validées', 'linkedin', 'a_contacter', '{"keywords":"","states":[0,5,11,13],"sort":"updateDate","order":"desc","scope":"mine","maxChecks":300,"titlePrefixes":[],"requirePhone":false,"evaluations":["A","A/A","A/B","A/C","A/D"],"segments":[]}', 'PO2', 'DIGITAL', ''),
  ('jamais', 'Jamais contactés', 'linkedin', 'a_contacter', '{"keywords":"","states":[11,13],"sort":"updateDate","order":"desc","scope":"mine","maxChecks":300,"titlePrefixes":[],"requirePhone":false,"evaluations":[],"segments":["jamais_contacte"]}', 'PO2', 'DIGITAL', ''),
  ('relance_campagne', 'Relance de campagne (plus de 6 mois)', 'linkedin', 'a_contacter', '{"keywords":"","states":[11,13],"sort":"updateDate","order":"desc","scope":"mine","maxChecks":300,"titlePrefixes":[],"requirePhone":false,"evaluations":[],"segments":["nouvelle_campagne"]}', 'PO2', 'DIGITAL', ''),
  ('repris', 'Repris d''un collègue (plus de 60 j)', 'linkedin', 'a_contacter', '{"keywords":"","states":[11,13],"sort":"updateDate","order":"desc","scope":"mine","maxChecks":300,"titlePrefixes":[],"requirePhone":false,"evaluations":[],"segments":["contacte_par_autre_ancien"]}', 'PO2', 'DIGITAL', ''),
  ('relances', 'Relances en cours', 'linkedin', 'a_relancer', '{"keywords":"","states":[0,5,11,13],"sort":"updateDate","order":"desc","scope":"mine","maxChecks":300,"titlePrefixes":[],"requirePhone":false,"evaluations":[],"segments":[]}', 'PO2', 'DIGITAL', ''),
  ('pepites_wefiit', 'Pépites du vivier WeFiiT', 'linkedin', 'a_contacter', '{"keywords":"","states":[11,13],"sort":"updateDate","order":"desc","scope":"all","maxChecks":300,"titlePrefixes":[],"requirePhone":false,"evaluations":["A","A/A","A/B","A/C","A/D"],"segments":[]}', 'PO2', 'DIGITAL', '')
on conflict (preset) do nothing;
