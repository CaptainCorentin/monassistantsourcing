-- Réglages serveur (ex. clé du webhook N8N), lisibles par la seule clé service_role.
-- La valeur de la clé n'est pas versionnée : elle est insérée directement dans la base.
create table public.app_config (
  key text primary key check (key ~ '^[a-z0-9_]{1,60}$'),
  value text not null check (char_length(value) <= 2000),
  updated_at timestamptz not null default now()
);
alter table public.app_config enable row level security;
revoke all on public.app_config from anon, authenticated;
