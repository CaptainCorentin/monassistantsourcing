-- Appel à l'action : « cette semaine ou la semaine prochaine » au lieu de « aujourd'hui ou demain »,
-- dans la banque et dans les messages de campagne qui le reprenaient.
update public.message_blocks set body = replace(body, 'aujourd''hui ou demain', 'cette semaine ou la semaine prochaine'), updated_at = now() where body like '%aujourd''hui ou demain%';
update public.campaigns set message = replace(message, 'aujourd''hui ou demain', 'cette semaine ou la semaine prochaine'), updated_at = now() where message like '%aujourd''hui ou demain%';
