-- Accroches LN+ / Vivier +++ : vagues, selon l'auteur du dernier échange (docs/MESSAGES.md).
-- A4 (ex-candidat avec année) devient « déjà échangé avec toi » ; A5 « déjà échangé avec un collègue ».
update public.message_blocks set label = 'A4 · Déjà échangé avec toi (LN+, Vivier +++)', body = 'J''ai gardé un bon souvenir de nos derniers échanges, et beaucoup de choses ont bougé chez WeFiiT depuis.', updated_at = now() where code = 'A4';
insert into public.message_blocks (code, kind, label, body, sort_order) values ('A5', 'accroche', 'A5 · Déjà échangé avec un collègue (LN+, Vivier +++)', 'Tu avais marqué positivement WeFiiT lors de tes derniers échanges avec nous, et beaucoup de choses ont bougé depuis.', 5) on conflict (code) do nothing;
