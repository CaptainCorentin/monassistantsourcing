-- « Jamais contactés » cible « A traiter ! » : un LN+ ou Vivier +++ a forcément déjà échangé avec WeFiiT.
update public.campaigns set name = 'Jamais contactés (A traiter !)', filters = jsonb_set(filters, '{states}', '[0]'::jsonb), updated_at = now() where preset = 'jamais';
