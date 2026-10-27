-- Critères 1, 2, 3, 4, 5 et 10 de l'acceptation du lot 1.
begin;
\i /work/tests/fixtures.inc

-- 1. A déclare un restaurant libre avec un interlocuteur réduit à sa fonction.
select pg_temp.act(:'a_user');
select public.commercial_declare(:'r1', '{menu}', :'contact') ->> 'id' as d1 \gset
select pg_temp.reset();
select pg_temp.ok(status = 'pending' and confirm_deadline = declared_at + interval '7 days'
  and contract_version_id = :'v1' and contact_id is not null, '1. déclaration en attente, échéance posée')
from public.commercial_declarations where id = :'d1';
select pg_temp.ok(first_name is null and role = 'Gérant', '1. interlocuteur réduit à sa fonction')
from public.crm_contacts c join public.commercial_declarations d on d.contact_id = c.id where d.id = :'d1';

select pg_temp.act(:'admin');
select public.admin_decide_declaration(:'d1', 'confirm', null);
select pg_temp.reset();
select pg_temp.ok(status = 'confirmed' and confirmed_by = :'admin'
  and reserved_until = confirmed_at + interval '6 months', '1. confirmée par l''admin, réservée six mois')
from public.commercial_declarations where id = :'d1';
select pg_temp.ok(exists (select 1 from public.commercial_emails
  where declaration_id = :'d1' and kind = 'confirmed' and sent_at is null), '1. e-mail de confirmation en file');
select pg_temp.ok((select status from public.crm_leads where restaurant_id = :'r1') = 'to_contact', '1. reflet to_contact');

-- 3. B ne peut pas déclarer le restaurant de A : refus « déclaré ».
select pg_temp.act(:'b_user');
select public.commercial_declare(:'r1', '{menu}', :'contact') ->> 'refusal_reason' as why \gset
select pg_temp.reset();
select pg_temp.ok(:'why' = 'declared', '3. B refusé : déjà déclaré');
select pg_temp.ok((select count(*) from public.commercial_declarations
  where restaurant_id = :'r1' and status in ('pending', 'confirmed')) = 1, '3. une seule déclaration active');
select pg_temp.ok(exists (select 1 from public.commercial_emails e join public.commercial_declarations d on d.id = e.declaration_id
  where d.commercial_id = :'b' and e.kind = 'refused'), '3. e-mail de refus pour B');

-- A ne redéclare pas le sien : message dédié, pas de refus.
select pg_temp.act(:'a_user');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_declare(%L, ''{menu}'', %L)', :'r1', :'contact')),
  '13.2 n° 11. redéclarer le sien est refusé');
select pg_temp.reset();

-- 4. Chaque refus d'office écrit une ligne refusée au bon motif.
select pg_temp.act(:'b_user');
select public.commercial_declare(:'rc_link', '{menu}', :'contact') ->> 'refusal_reason' as why_link \gset
select public.commercial_declare(:'rc_phone', '{menu}', :'contact') ->> 'refusal_reason' as why_phone \gset
select public.commercial_declare(:'r_lea', '{menu}', :'contact') ->> 'refusal_reason' as why_lea \gset
select public.commercial_declare(:'r_founder', '{menu}', :'contact') ->> 'refusal_reason' as why_founder \gset
select public.commercial_declare(:'r_projet', '{menu}', :'contact') ->> 'refusal_reason' as why_projet \gset
select public.commercial_declare(:'r_optout', '{menu}', :'contact') ->> 'refusal_reason' as why_optout \gset
select pg_temp.reset();
select pg_temp.ok(:'why_link' = 'client', '4. client par le lien');
select pg_temp.ok(:'why_phone' = 'client', '4. client par le téléphone');
select pg_temp.ok(:'why_lea' = 'in_talks', '4. réponse à Léa');
select pg_temp.ok(:'why_founder' = 'in_talks', '4. activité d''un fondateur');
select pg_temp.ok(:'why_projet' = 'in_talks', '4. client Projet');
select pg_temp.ok(:'why_optout' = 'opted_out', '4. opposition');
select pg_temp.ok((select count(*) from public.commercial_declarations
  where commercial_id = :'b' and status = 'refused') = 7, '4. une ligne refusée par refus');

-- Un client parti peut être redéclaré.
update public.crm_restaurants set client_ended_at = now() where id = :'rc_link';
-- Un fondateur qui a clos le dossier ne bloque plus.
insert into public.crm_activities (restaurant_id, type, metadata, created_by)
values (:'r_founder', 'status_change', '{"from": "contacted", "to": "lost"}', :'admin');
select pg_temp.act(:'b_user');
select public.commercial_declare(:'rc_link', '{menu}', :'contact') ->> 'status' as st_left \gset
select public.commercial_declare(:'r_founder', '{menu}', :'contact') ->> 'status' as st_closed \gset
select pg_temp.reset();
select pg_temp.ok(:'st_left' = 'pending', '4. client parti redéclarable');
select pg_temp.ok(:'st_closed' = 'pending', '13.2 n° 3. dossier clos par un fondateur : déclarable');

-- Un statut écrit par le reflet ne compte pas comme travail d'un fondateur.
select pg_temp.act(:'admin');
select public.admin_decide_declaration(d.id, 'confirm', null)
from public.commercial_declarations d where d.restaurant_id = :'r_founder' and d.status = 'pending';
select pg_temp.reset();
select pg_temp.ok(exists (select 1 from public.crm_activities
  where restaurant_id = :'r_founder' and type = 'status_change' and created_by = :'admin'
    and metadata ->> 'to' = 'to_contact' and metadata ->> 'reflect' = 'true'),
  '4.3. le changement de statut du reflet est marqué');
select pg_temp.ok(not public.commercial_in_talks(r), '13.2 n° 3. le reflet ne compte pas comme travail d''un fondateur')
from public.crm_restaurants r where id = :'r_founder';

-- Plafond : B a 2 déclarations actives ; plafond réglé à 2.
update public.commercial_settings set declaration_cap = 2;
select pg_temp.act(:'b_user');
select public.commercial_declare(:'r2', '{menu}', :'contact') ->> 'refusal_reason' as why_cap \gset
select pg_temp.reset();
select pg_temp.ok(:'why_cap' = 'cap', '4. plafond');
update public.commercial_settings set declaration_cap = null;

-- Carence : B abandonne r2… après l'avoir déclaré, puis redéclare.
select pg_temp.act(:'b_user');
select public.commercial_declare(:'r2', '{menu}', :'contact') ->> 'id' as d_r2 \gset
select public.commercial_abandon(:'d_r2', 'unreachable');
select public.commercial_declare(:'r2', '{menu}', :'contact') ->> 'refusal_reason' as why_cool \gset
select pg_temp.reset();
select pg_temp.ok(:'why_cool' = 'cooldown', '4. carence');
update public.commercial_settings set cooldown_days = null;
select pg_temp.act(:'b_user');
select public.commercial_declare(:'r2', '{menu}', :'contact') ->> 'status' as st_nocool \gset
select pg_temp.reset();
select pg_temp.ok(:'st_nocool' = 'pending', '13.2 n° 15. carence vide : désactivée');

-- 2. commercial_confirm_due confirme une déclaration échue au jour de son
-- échéance, et ne touche pas une déclaration non échue.
select pg_temp.act(:'a_user');
select public.commercial_declare(:'r3', '{menu}', :'contact') ->> 'id' as d_due \gset
select public.commercial_declare(:'r4', '{menu}', :'contact') ->> 'id' as d_notdue \gset
select pg_temp.reset();
update public.commercial_declarations
set declared_at = now() - interval '8 days', confirm_deadline = now() - interval '1 day'
where id = :'d_due';

-- Lue confirmée avant même la tâche (art. 4.3).
select pg_temp.ok(public.commercial_status_at(d) = 'confirmed', '2. une attente échue se lit confirmée')
from public.commercial_declarations d where id = :'d_due';

select pg_temp.act_service();
select public.commercial_confirm_due() as confirmed_count \gset
select pg_temp.reset();
select pg_temp.ok(:confirmed_count >= 1, '2. la tâche confirme');
select pg_temp.ok(status = 'confirmed' and confirmed_at = confirm_deadline and confirmed_by is null
  and reserved_until = confirm_deadline + interval '6 months', '2. confirmed_at = confirm_deadline')
from public.commercial_declarations where id = :'d_due';
select pg_temp.ok(status = 'pending' and confirmed_at is null, '2. la non-échue est intacte')
from public.commercial_declarations where id = :'d_notdue';
select pg_temp.ok(exists (select 1 from public.commercial_emails
  where declaration_id = :'d_due' and kind = 'confirmed' and detail = 'tacit'), '2. e-mail de confirmation tacite');

-- 5. Un refus est rejeté sur une déclaration confirmée ou échue ; aucun
-- retour depuis « confirmée ».
select pg_temp.act(:'admin');
select pg_temp.ok(pg_temp.fails(format('select public.admin_decide_declaration(%L, ''refuse'', ''non'')', :'d_due')),
  '5. refus rejeté sur une confirmée');
select pg_temp.reset();
update public.commercial_declarations set confirm_deadline = now() - interval '1 second' where id = :'d_notdue';
select pg_temp.act(:'admin');
select pg_temp.ok(pg_temp.fails(format('select public.admin_decide_declaration(%L, ''refuse'', ''non'')', :'d_notdue')),
  '5. refus rejeté sur une échue');
select pg_temp.reset();
select pg_temp.ok(pg_temp.fails(format('update public.commercial_declarations set status = ''refused'', refusal_reason = ''admin'' where id = %L', :'d_due')),
  '5. la base refuse confirmed → refused');
select pg_temp.ok(pg_temp.fails(format('update public.commercial_declarations set status = ''pending'' where id = %L', :'d_due')),
  '5. la base refuse confirmed → pending');
select pg_temp.ok(pg_temp.fails(format('update public.commercial_declarations set status = ''confirmed'' where id = %L', :'d_r2')),
  '5. une déclaration abandonnée reste close');

-- Un refus dans le délai passe, avec son motif écrit.
select pg_temp.act(:'a_user');
select public.commercial_declare(:'r5', '{menu}', :'contact') ->> 'id' as d_refuse \gset
select pg_temp.act(:'admin');
select pg_temp.ok(pg_temp.fails(format('select public.admin_decide_declaration(%L, ''refuse'', '''')', :'d_refuse')),
  '4.2. un refus se motive');
select public.admin_decide_declaration(:'d_refuse', 'refuse', 'Restaurant fermé');
select pg_temp.reset();
select pg_temp.ok(status = 'refused' and refusal_reason = 'admin' and decision_note = 'Restaurant fermé',
  '4.2. refus manuel dans le délai')
from public.commercial_declarations where id = :'d_refuse';

-- 10. Sans contrat signé, ou contrat terminé : rien des fonctions de travail.
select pg_temp.act(:'c_user');
select pg_temp.ok(pg_temp.fails('select public.commercial_search(''Bistrot'')'), '10. non signé : recherche refusée');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_restaurant(%L)', :'r6')), '10. non signé : fiche refusée');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_declare(%L, ''{menu}'', %L)', :'r6', :'contact')), '10. non signé : déclaration refusée');
select pg_temp.ok(pg_temp.fails('select public.commercial_today(null)'), '10. non signé : Aujourd''hui refusé');
select pg_temp.ok((select count(*) from public.commercial_declarations) = 0, '10. non signé : aucune déclaration lue');
select pg_temp.act(:'d_user');
select pg_temp.ok(pg_temp.fails('select public.commercial_search(''Bistrot'')'), '10. terminé : recherche refusée');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_declare(%L, ''{menu}'', %L)', :'r6', :'contact')), '10. terminé : déclaration refusée');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_passage(%L, ''{}'', ''other'')', :'r6')), '10. terminé : passage refusé');
select pg_temp.ok(pg_temp.fails('select public.commercial_my_restaurants()'), '10. terminé : mes restaurants refusés');
select pg_temp.act('00000000-0000-0000-0000-000000000999');
select pg_temp.ok(pg_temp.fails('select public.commercial_search(''Bistrot'')'), '10. inconnu : recherche refusée');
select pg_temp.reset();

-- Nouvelle version du contrat en vigueur, non signée : A travaille encore
-- ses restaurants mais ne déclare plus.
insert into public.legal_versions (doc, version, effective_from, body_sha256, summary)
values ('commercial', 'test-2', now() - interval '1 hour', 'y', 'v2');
select pg_temp.act(:'a_user');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_declare(%L, ''{menu}'', %L)', :'r6', :'contact')),
  '7.2. nouvelle version non signée : déclaration refusée');
select pg_temp.ok(jsonb_array_length(public.commercial_my_restaurants()) > 0, '7.2. nouvelle version : l''espace reste ouvert');
select pg_temp.reset();

rollback;
