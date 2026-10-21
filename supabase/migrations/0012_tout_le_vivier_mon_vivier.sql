-- Toutes les tuiles sur tout le vivier WeFiiT ; « Mon vivier » = mes fiches LN+ et Vivier +++.
update public.campaigns set filters = jsonb_set(filters, '{scope}', '"all"'::jsonb), updated_at = now() where preset is not null and not archived;
insert into public.campaigns (preset, name, channel, target, filters, seniority, discipline, message) values
  ('mon_vivier', 'Mon vivier', 'linkedin', 'tous', '{"keywords":"","states":[11,13],"sort":"updateDate","order":"desc","scope":"mine","maxChecks":300,"titlePrefixes":[],"requirePhone":false,"evaluations":[],"segments":[],"companies":[]}', 'PO2', 'DIGITAL', '')
on conflict (preset) do nothing;
