-- Campagnes : un ciblage Boond + un canal (LinkedIn ou téléphone) + un message.
-- campaign_members : candidats « passés » vers une autre campagne (id Boond seulement).
-- Corps de fonction sur une ligne et sans DELETE (contrainte de l'outil SQL, voir docs/NOTES.md).

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  channel text not null default 'linkedin' check (channel in ('linkedin', 'phone')),
  target text not null default 'a_contacter' check (target in ('a_contacter', 'a_relancer', 'tous')),
  filters jsonb not null default '{}'::jsonb,
  seniority text not null default 'PO2' check (seniority in ('PO1', 'PO2', 'PO3', 'QA')),
  discipline text not null default 'DIGITAL' check (discipline in ('DIGITAL', 'DATA', 'IA', 'BUILD', 'QA')),
  message text not null default '' check (char_length(message) <= 4000),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.campaign_members (
  boond_id bigint primary key check (boond_id > 0),
  campaign_id uuid not null references public.campaigns (id),
  done boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;
revoke all on public.campaigns, public.campaign_members from anon, authenticated;

create function public.app_list_campaigns(p_token text) returns setof public.campaigns language plpgsql stable security definer set search_path = '' as 'begin perform public.app_require_session(p_token); return query select * from public.campaigns where not archived order by created_at; end;';
create function public.app_save_campaign(p_token text, p_id uuid, p_name text, p_channel text, p_target text, p_filters jsonb, p_seniority text, p_discipline text, p_message text) returns public.campaigns language plpgsql volatile security definer set search_path = '' as 'declare v_row public.campaigns; begin perform public.app_require_session(p_token); if p_id is null then insert into public.campaigns (name, channel, target, filters, seniority, discipline, message) values (p_name, p_channel, p_target, p_filters, p_seniority, p_discipline, p_message) returning * into v_row; else update public.campaigns set name = p_name, channel = p_channel, target = p_target, filters = p_filters, seniority = p_seniority, discipline = p_discipline, message = p_message, updated_at = now() where id = p_id and not archived returning * into v_row; end if; return v_row; end;';
create function public.app_archive_campaign(p_token text, p_id uuid) returns void language plpgsql volatile security definer set search_path = '' as 'begin perform public.app_require_session(p_token); update public.campaigns set archived = true, updated_at = now() where id = p_id; end;';
create function public.app_campaign_members(p_token text, p_campaign uuid) returns setof bigint language plpgsql stable security definer set search_path = '' as 'begin perform public.app_require_session(p_token); return query select boond_id from public.campaign_members where campaign_id = p_campaign and not done order by created_at limit 100; end;';
create function public.app_assign_campaign(p_token text, p_boond_id bigint, p_campaign uuid) returns void language plpgsql volatile security definer set search_path = '' as 'begin perform public.app_require_session(p_token); insert into public.campaign_members (boond_id, campaign_id) values (p_boond_id, p_campaign) on conflict (boond_id) do update set campaign_id = excluded.campaign_id, done = false, created_at = now(); end;';
create function public.app_member_done(p_token text, p_boond_id bigint) returns void language plpgsql volatile security definer set search_path = '' as 'begin perform public.app_require_session(p_token); update public.campaign_members set done = true where boond_id = p_boond_id; end;';

revoke execute on function public.app_list_campaigns(text), public.app_save_campaign(text, uuid, text, text, text, jsonb, text, text, text), public.app_archive_campaign(text, uuid), public.app_campaign_members(text, uuid), public.app_assign_campaign(text, bigint, uuid), public.app_member_done(text, bigint) from public, anon, authenticated;
grant execute on function public.app_list_campaigns(text), public.app_save_campaign(text, uuid, text, text, text, jsonb, text, text, text), public.app_archive_campaign(text, uuid), public.app_campaign_members(text, uuid), public.app_assign_campaign(text, bigint, uuid), public.app_member_done(text, bigint) to anon;
