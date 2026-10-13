-- Vivier Boond : messages types et statuts propres à l'interface.
-- Aucune donnée candidat : candidate_flags ne contient que l'id Boond.
-- RLS activé sans aucune policy : seul le serveur Next.js (clé service_role) lit et écrit.

create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  category text not null check (category in ('a_contacter', 'a_relancer', 'vivier', 'tous')),
  channel text not null check (channel in ('invitation', 'message')),
  body text not null check (char_length(body) between 1 and 8000),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.candidate_flags (
  boond_id bigint primary key check (boond_id > 0),
  kind text not null check (kind in ('masque', 'reporte')),
  until timestamptz,
  created_at timestamptz not null default now(),
  check (kind = 'masque' or until is not null)
);

create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger message_templates_updated_at
before update on public.message_templates
for each row execute function public.set_updated_at();

alter table public.message_templates enable row level security;
alter table public.candidate_flags enable row level security;

revoke all on public.message_templates from anon, authenticated;
revoke all on public.candidate_flags from anon, authenticated;
revoke execute on function public.set_updated_at() from anon, authenticated, public;
