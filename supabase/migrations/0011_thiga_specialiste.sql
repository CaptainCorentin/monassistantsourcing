-- Thiga reste uniquement dans « Conseil spécialiste ».
update public.campaigns set filters = jsonb_set(filters, '{companies}', (select coalesce(jsonb_agg(x), '[]'::jsonb) from jsonb_array_elements(filters->'companies') x where x <> '"Thiga"'::jsonb)), updated_at = now() where preset = 'conseil_generaliste';
