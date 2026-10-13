-- Authentification et accès aux données sans aucun secret côté Vercel.
-- Le serveur Next.js n'utilise que la clé publique (anon / publishable). Les tables restent fermées
-- (RLS sans policy) ; le seul accès passe par ces fonctions SECURITY DEFINER, qui exigent un jeton
-- de session valide. Mot de passe : empreinte bcrypt dans app_config (clé 'password_hash').

create extension if not exists pgcrypto with schema extensions;

create table public.app_sessions (
  token_hash text primary key,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create table public.app_login_attempts (
  id bigint generated always as identity primary key,
  ok boolean not null,
  at timestamptz not null default now()
);
alter table public.app_sessions enable row level security;
alter table public.app_login_attempts enable row level security;
revoke all on public.app_sessions, public.app_login_attempts from anon, authenticated;

-- Vérifie un jeton (empreinte SHA-256 stockée, jamais le jeton lui-même).
create function public.app_session_ok(p_token text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.app_sessions
    where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
      and expires_at > now()
  );
$$;

create function public.app_require_session(p_token text) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.app_session_ok(p_token) then
    raise exception 'session_invalide' using errcode = '28000';
  end if;
end;
$$;

-- Connexion : 10 échecs en 15 minutes bloquent toute tentative jusqu'à expiration de la fenêtre.
create function public.app_login(p_password text) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_hash text;
  v_token text;
begin
  if (select count(*) from public.app_login_attempts where not ok and at > now() - interval '15 minutes') >= 10 then
    raise exception 'trop_de_tentatives' using errcode = '28000';
  end if;
  select value into v_hash from public.app_config where key = 'password_hash';
  if v_hash is null or p_password is null or extensions.crypt(p_password, v_hash) is distinct from v_hash then
    insert into public.app_login_attempts (ok) values (false);
    return null;
  end if;
  insert into public.app_login_attempts (ok) values (true);
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.app_sessions (token_hash, expires_at)
    values (encode(extensions.digest(v_token, 'sha256'), 'hex'), now() + interval '7 days');
  return v_token;
end;
$$;

-- Déconnexion : la session expire immédiatement (pas de DELETE, voir docs/NOTES.md).
create function public.app_logout(p_token text) returns void
language sql volatile security definer set search_path = '' as $$
  update public.app_sessions set expires_at = now() where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
$$;

create function public.app_n8n_key(p_token text) returns text
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.app_require_session(p_token);
  return (select value from public.app_config where key = 'n8n_webhook_key');
end;
$$;

-- Messages types (suppression = archivage)
alter table public.message_templates add column archived boolean not null default false;

create function public.app_list_templates(p_token text) returns setof public.message_templates
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.app_require_session(p_token);
  return query select * from public.message_templates where not archived order by sort_order, name;
end;
$$;

create function public.app_save_template(p_token text, p_id uuid, p_name text, p_category text, p_channel text, p_body text)
returns public.message_templates
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_row public.message_templates;
begin
  perform public.app_require_session(p_token);
  if p_id is null then
    insert into public.message_templates (name, category, channel, body, sort_order)
      values (p_name, p_category, p_channel, p_body,
              coalesce((select max(sort_order) from public.message_templates), 0) + 1)
      returning * into v_row;
  else
    update public.message_templates
      set name = p_name, category = p_category, channel = p_channel, body = p_body
      where id = p_id and not archived returning * into v_row;
  end if;
  return v_row;
end;
$$;

create function public.app_archive_template(p_token text, p_id uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public.app_require_session(p_token);
  update public.message_templates set archived = true where id = p_id;
end;
$$;

-- Candidats masqués / reportés (ids Boond uniquement)
create function public.app_list_flags(p_token text) returns setof public.candidate_flags
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.app_require_session(p_token);
  return query select * from public.candidate_flags where kind = 'masque' or until > now();
end;
$$;

create function public.app_set_flag(p_token text, p_boond_id bigint, p_kind text, p_days integer)
returns public.candidate_flags
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_row public.candidate_flags;
begin
  perform public.app_require_session(p_token);
  if p_kind = 'reporte' and (p_days is null or p_days not in (7, 30)) then
    raise exception 'duree_invalide' using errcode = '22023';
  end if;
  insert into public.candidate_flags (boond_id, kind, until)
    values (p_boond_id, p_kind, case when p_kind = 'reporte' then now() + make_interval(days => p_days) end)
    on conflict (boond_id) do update set kind = excluded.kind, until = excluded.until, created_at = now()
    returning * into v_row;
  return v_row;
end;
$$;

-- Annulation d'un masquage / report : le report expire immédiatement.
create function public.app_clear_flag(p_token text, p_boond_id bigint) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public.app_require_session(p_token);
  update public.candidate_flags set kind = 'reporte', until = now() where boond_id = p_boond_id;
end;
$$;

-- Droits : seules les fonctions d'entrée sont appelables avec la clé publique.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.app_login(text),
  public.app_logout(text),
  public.app_session_ok(text),
  public.app_n8n_key(text),
  public.app_list_templates(text),
  public.app_save_template(text, uuid, text, text, text, text),
  public.app_archive_template(text, uuid),
  public.app_list_flags(text),
  public.app_set_flag(text, bigint, text, integer),
  public.app_clear_flag(text, bigint)
to anon;
