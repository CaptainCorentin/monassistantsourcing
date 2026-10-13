-- Banque de messages matricielle (docs/MESSAGES.md). Un bloc = un morceau de message
-- (accroche, positionnement, phrase métier…) modifiable depuis l'interface.
-- Pas de création ni de suppression depuis l'interface : seul le texte change.

create table public.message_blocks (
  code text primary key check (code ~ '^[A-Z0-9-]{1,20}$'),
  kind text not null check (kind in ('accroche', 'positionnement', 'metier', 'argument', 'ouverture', 'driver', 'cta', 'relance', 'invitation')),
  label text not null,
  body text not null check (char_length(body) between 1 and 2000),
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.message_blocks enable row level security;
revoke all on public.message_blocks from anon, authenticated;

create function public.app_list_blocks(p_token text) returns setof public.message_blocks
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.app_require_session(p_token);
  return query select * from public.message_blocks order by sort_order;
end;
$$;

create function public.app_save_block(p_token text, p_code text, p_body text) returns public.message_blocks
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_row public.message_blocks;
begin
  perform public.app_require_session(p_token);
  update public.message_blocks set body = p_body, updated_at = now() where code = p_code returning * into v_row;
  return v_row;
end;
$$;

revoke execute on function public.app_list_blocks(text), public.app_save_block(text, text, text) from public, anon, authenticated;
grant execute on function public.app_list_blocks(text), public.app_save_block(text, text, text) to anon;

-- Textes de départ : générés par scripts/blocks-seed.mjs depuis lib/messages.ts.
insert into public.message_blocks (code, kind, label, body, sort_order) values
  ('A1', 'accroche', 'A1 · Jamais contacté', '{{anciennete}} chez {{entreprise}}, c''est peut-être la fin d''un cycle… et le début d''un nouveau ? 😁', 1),
  ('A1-REPLI', 'accroche', 'A1 · Si entreprise ou ancienneté inconnue', 'Ton parcours de {{titre}} a retenu mon attention.', 2),
  ('A2', 'accroche', 'A2 · Contacté par un collègue (+60 j)', 'Beaucoup de choses ont bougé chez WeFiiT ces derniers mois, et ton profil colle pile à ce qu''on construit aujourd''hui.', 3),
  ('A3', 'accroche', 'A3 · Sans réponse depuis 6 mois', 'On dit souvent que la vie est une question de feeling et de timing… mon dernier message est sûrement arrivé au mauvais moment ! 😊', 4),
  ('A4', 'accroche', 'A4 · Ex-candidat', 'On s''était croisés en {{annee_process}} lors de ton process chez WeFiiT. Beaucoup de choses ont bougé depuis, de ton côté comme du nôtre.', 5),
  ('POS-PO12', 'positionnement', 'PO1 / PO2', 'Chez WeFiiT, on ne fait que du Product Management, et on cherche les meilleurs PM et PO de Paris pour devenir la référence du métier en France.', 6),
  ('POS-PO3', 'positionnement', 'PO3', 'Chez WeFiiT, on cherche les futurs leaders du Product Management digital, Data et IA : des profils qui font grandir nos clients autant que l''équipe.', 7),
  ('POS-QA', 'positionnement', 'QA', 'Chez WeFiiT, on cherche les meilleurs QA de Paris : des stratèges de la qualité produit, impliqués dès la conception (shift left), pas de simples exécutants de tests.', 8),
  ('D-DIGITAL', 'metier', 'PM digital', 'Nos PM adressent des enjeux de conversion, d''acquisition, d''adoption et de conduite du changement, en Product Management fullstack (strategy, discovery, delivery) augmenté par l''IA.', 9),
  ('D-DATA', 'metier', 'Data Product', 'On vient du produit : en Data Product, ce qu''on apporte d''abord, c''est de l''impact, avec une vraie vision Data as a Product.', 10),
  ('D-IA', 'metier', 'IA Product', 'Prendre en main des produits non déterministes, c''est un autre métier, et c''est exactement celui qu''on développe chez nos clients.', 11),
  ('D-BUILD', 'metier', 'Product Builder', 'On cherche des PM qui buildent : prototypes, agents, workflows automatisés, choix techniques. On ne livre pas pour rien, on livre pour l''impact.', 12),
  ('D-QA', 'metier', 'QA', 'Chez nous, qualité et produit se nourrissent : nos QA sont intégrés aux squads et sont les premiers utilisateurs des features.', 13),
  ('ARG-DIGITAL', 'argument', 'PM digital', 'du Product Management fullstack augmenté par l''IA, sur la conversion et l''adoption', 14),
  ('ARG-DATA', 'argument', 'Data Product', 'du Data Product orienté impact, porté par des gens du produit', 15),
  ('ARG-IA', 'argument', 'IA Product', 'des produits IA non déterministes, un métier qu''on développe chez nos clients', 16),
  ('ARG-BUILD', 'argument', 'Product Builder', 'des PM qui buildent : prototypes, agents, workflows automatisés', 17),
  ('ARG-QA', 'argument', 'QA', 'une QA intégrée aux squads, au cœur du produit', 18),
  ('OUV', 'ouverture', 'Ouverture commune', 'Et si demain tu veux explorer la Data, l''IA, le build ou le pur digital, c''est possible : pas de practice chez WeFiiT, chaque consultant choisit ses missions. 100 % des WeFiiTers ont Claude Code, et chacun dispose de 2 000 € de formation par an via l''Université WeFiiT.', 19),
  ('DRV-PO1', 'driver', 'PO1', 'Tu pourras accélérer ta montée en compétences : formations sur mesure, plus de 50 mentors, et une communauté de pairs (Guildes, WeTalks).', 20),
  ('DRV-PO2', 'driver', 'PO2', 'Tu pourras approfondir la discovery et la stratégie, être mentoré et accompagné, tout en co-construisant WeFiiT selon tes appétences.', 21),
  ('DRV-PO3', 'driver', 'PO3', 'Tu pourras accompagner tes pairs dans leur carrière, coacher nos clients et peser sur la stratégie interne de WeFiiT.', 22),
  ('DRV-QA', 'driver', 'QA', 'Tu pourras évoluer vers l''automatisation, la stratégie de test ou un rôle de PO, sur des missions 100 % QA et agiles.', 23),
  ('CTA', 'cta', 'Appel à l''action', E'Si ça te parle, je serais ravi d''en échanger par téléphone : serais-tu disponible aujourd''hui ou demain ?\n\nPasse une excellente journée', 24),
  ('R1', 'relance', 'Relance 1 (2e contact)', 'Hello {{prenom}}, le suspense est insoutenable… as-tu bien reçu mon dernier message ? Promis, je ne me vexe pas si la réponse est non 😉', 25),
  ('R2', 'relance', 'Relance 2 (3e contact)', E'Hello {{prenom}}, as-tu pu lire mon précédent message ? En bref, chez WeFiiT :\n🎯 {{argument_metier}}\n🎯 tu choisis tes missions, sans practice imposée\n🎯 tu co-construis l''entreprise avec plus de 115 WeFiiTers\nOn se donne 15 min cette semaine ?', 26),
  ('INV', 'invitation', 'Note d''invitation (300 caractères)', 'Bonjour {{prenom}}, je suis Corentin, recruteur chez WeFiiT, cabinet 100 % Product Management. Chez nous : {{argument_metier}}. Pas de practice, chacun choisit ses missions. Ouvert à en discuter ?', 27)
on conflict (code) do nothing;
