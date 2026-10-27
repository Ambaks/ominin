-- Défauts relevés par la vérification indépendante : chacun rejoué ici, dans
-- l'ordre de son rapport (§3), corrigé.
begin;
\i /work/tests/fixtures.inc
update public.commercial_settings set signup_link_days = 30;

-- 1. Un client déjà en service (conditions acceptées avant la déclaration)
-- qui accepte de nouveau les CGV après avoir ouvert un lien n'est pas attribué.
\set gerant '00000000-0000-0000-0000-00000000ee01'
\set cgv '00000000-0000-0000-0000-0000000000c8'
insert into auth.users (id, email) values (:'gerant', 'gerant@chez-test.test');
insert into public.legal_versions (id, doc, version, effective_from, body_sha256, summary)
values (:'cgv', 'cgv', 'cgv-t', now() - interval '60 days', 'z', 'cgv');
insert into public.legal_acceptances (version_id, scope, etablissement_id, user_id, signatory_email, scope_label, terms, accepted_at)
values (:'cgv', 'etablissement', :'etab', :'gerant', 'g@x', 'x', '{}', now() - interval '50 days');
select pg_temp.act(:'a_user');
select (public.commercial_declare(:'r8', '{menu}', :'contact') ->> 'id') as d8 \gset
select pg_temp.act(:'admin');
select public.admin_decide_declaration(:'d8', 'confirm', null);
select pg_temp.act(:'a_user');
select public.commercial_signup_link(:'d8') as tok8 \gset
select pg_temp.act(:'gerant');
select public.signup_link_claim(:'tok8', 'menu');
select pg_temp.reset();
insert into public.legal_acceptances (version_id, scope, etablissement_id, user_id, signatory_email, scope_label, terms, accepted_at)
values (:'cgv', 'etablissement', :'etab', :'gerant', 'g@x', 'x', '{}', now());
select pg_temp.ok(not exists (select 1 from public.commercial_clients where etablissement_id = :'etab'),
  '§3-1. client déjà en service : pas de Client Apporté');
select pg_temp.ok((select status from public.commercial_declarations where id = :'d8') = 'confirmed',
  '§3-1. … et la déclaration reste confirmée, pas signée');
select pg_temp.ok(not exists (select 1 from public.commercial_emails where declaration_id = :'d8' and kind = 'signed'),
  '§3-1. … ni e-mail « signé »');
-- Client relié à une autre fiche mais inscrit après la déclaration : créé,
-- non validé, avec l'alerte.
\set shop2 '00000000-0000-0000-0000-00000005b0d2'
\set gerant2 '00000000-0000-0000-0000-00000000ee02'
insert into auth.users (id, email) values (:'gerant2', 'g2@x.test');
insert into public.shops (id, slug, name, order_prefix) values (:'shop2', 'neuf-lunes', 'Neuf Lunes', 'NL');
update public.crm_restaurants set shop_id = :'shop2' where id = :'r4';
select pg_temp.act(:'a_user');
select (public.commercial_declare(:'r9', '{shop}', :'contact') ->> 'id') as d9 \gset
select pg_temp.act(:'admin');
select public.admin_decide_declaration(:'d9', 'confirm', null);
select pg_temp.act(:'a_user');
select public.commercial_signup_link(:'d9') as tok9 \gset
select pg_temp.act(:'gerant2');
select public.signup_link_claim(:'tok9', 'shop');
select pg_temp.reset();
insert into public.legal_acceptances (version_id, scope, shop_id, user_id, signatory_email, scope_label, terms, accepted_at)
values (:'cgv', 'shop', :'shop2', :'gerant2', 'g2@x', 'x', '{}', now());
select pg_temp.ok(validated_at is null and alert like '%relié à la fiche « Quatre Vents »%',
  '§3-1. client relié à une autre fiche : en attente de l''admin, alerte')
from public.commercial_clients where shop_id = :'shop2';

-- 3. Déclaration reçue par e-mail refusée d'office : la concurrente plus
-- récente n'est pas refusée pour autant.
insert into public.commercial_declarations (restaurant_id, commercial_id, contract_version_id, status, confirm_deadline, declared_at)
values (:'r5', :'a', :'v1', 'pending', now() + interval '1 day', now() - interval '6 days') returning id as d5old \gset
update public.commercial_declarations set status = 'abandoned', end_reason = 'other', ended_at = now() - interval '2 days' where id = :'d5old';
select pg_temp.act(:'b_user');
select (public.commercial_declare(:'r5', '{menu}', :'contact') ->> 'id') as d5b \gset
select pg_temp.act(:'admin');
select pg_temp.ok((public.admin_record_email_declaration(:'a', :'r5', now() - interval '1 day', '{menu}', :'contact') ->> 'status') = 'refused',
  '§3-3. e-mail de A en carence : refusé d''office');
select pg_temp.reset();
select pg_temp.ok((select status from public.commercial_declarations where id = :'d5b') = 'pending',
  '§3-3. … la déclaration de B reste en attente');

-- 4b. Plafond : une réservation échue, pas encore écrite, ne compte plus.
-- (4a, la course entre deux déclarations, est dans concurrence.sh.) B a déjà
-- sa déclaration en attente sur r5 : plafond à 2.
update public.commercial_settings set declaration_cap = 2;
select pg_temp.act(:'b_user');
select (public.commercial_declare(:'r2', '{menu}', :'contact') ->> 'id') as d2 \gset
select pg_temp.act(:'admin');
select public.admin_decide_declaration(:'d2', 'confirm', null);
select pg_temp.reset();
update public.commercial_declarations set reserved_until = now() - interval '1 hour' where id = :'d2';
select pg_temp.act(:'b_user');
select pg_temp.ok((public.commercial_declare(:'r3', '{menu}', :'contact') ->> 'status') = 'pending',
  '§3-4. réservation échue hors plafond (13.2 n° 10)');
select pg_temp.ok((public.commercial_declare(:'r6', '{menu}', :'contact') ->> 'refusal_reason') = 'cap',
  '§3-4. … le plafond tient sur les déclarations actives');
select pg_temp.reset();
update public.commercial_settings set declaration_cap = 5;

-- 5. Fin de contrat : le deck du Kit et l'écran Clients ne sont plus servis.
insert into storage.objects (bucket_id, name) values ('commercial-docs', 'kit/deck.pdf');
select pg_temp.act(:'a_user');
select pg_temp.ok((select count(*) from storage.objects where name = 'kit/deck.pdf') = 1, '§3-5. contrat en cours : deck lisible');
select pg_temp.act(:'d_user');
select pg_temp.ok((select count(*) from storage.objects where name = 'kit/deck.pdf') = 0, '§3-5. contrat terminé : deck fermé');
select pg_temp.ok(pg_temp.fails('select public.commercial_my_clients()'), '§3-5. contrat terminé : Clients fermé');
select pg_temp.ok(not pg_temp.fails('select public.commercial_money()'), '§3-5. contrat terminé : Argent ouvert');
select pg_temp.reset();

-- 6. Opposition : par le titulaire d'une déclaration active ou l'auteur d'un
-- passage sur une fiche libre, jamais sur un client.
select pg_temp.act(:'b_user');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_opt_out(%L)', :'r7')), '§3-6. sans déclaration ni passage : refusée');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_opt_out(%L)', :'rc_link')), '§3-6. sur un client : refusée');
select pg_temp.act(:'a_user');
select public.commercial_passage(:'r7', '{"interest": "froid"}', 'not_interested');
select pg_temp.act(:'b_user');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_opt_out(%L)', :'r7')), '§3-6. sur le passage d''un autre : refusée');
select pg_temp.act(:'a_user');
select public.commercial_opt_out(:'r7');
select pg_temp.act(:'b_user');
select public.commercial_opt_out(:'r3');
select pg_temp.reset();
select pg_temp.ok((select count(*) from public.crm_restaurants where id in (:'r7', :'r3') and outreach_opted_out_at is not null) = 2,
  '§3-6. auteur du passage et titulaire : opposition posée');

-- 7. Le lien d'inscription ne se rattache ni à un commercial ni à un admin.
select pg_temp.act(:'b_user');
select (public.commercial_declare(:'r1', '{menu}', :'contact') ->> 'id') as d1 \gset
select pg_temp.act(:'admin');
select public.admin_decide_declaration(:'d1', 'confirm', null);
select pg_temp.act(:'b_user');
select public.commercial_signup_link(:'d1') as tok1 \gset
select pg_temp.ok(pg_temp.fails(format('select public.signup_link_claim(%L, ''menu'')', :'tok1')), '§3-7. le commercial ne capture pas son lien');
select pg_temp.act(:'admin');
select pg_temp.ok(pg_temp.fails(format('select public.signup_link_claim(%L, ''menu'')', :'tok1')), '§3-7. l''admin non plus');
select pg_temp.reset();
select pg_temp.ok((select signup_user_id from public.commercial_declarations where id = :'d1') is null, '§3-7. lien toujours libre');

-- 11. Quota : rendre une fiche Google existante compte une recherche.
update public.crm_restaurants set source = 'google_places', external_id = 'ChIJ-existant' where id = :'r4';
select pg_temp.act(:'a_user');
select pg_temp.ok(public.commercial_create_restaurant('{"name": "x", "external_id": "ChIJ-existant"}') = :'r4'::uuid,
  '§3-11. la fiche Google existante est rendue');
select pg_temp.reset();
select pg_temp.ok((select searches from public.commercial_quota_usage
                   where commercial_id = :'a' and day = (now() at time zone 'Europe/Paris')::date) = 1,
  '§3-11. … et compte une recherche');
update public.commercial_settings set search_daily_quota = 1;
select pg_temp.act(:'a_user');
select pg_temp.ok(pg_temp.fails('select public.commercial_create_restaurant(''{"name": "x", "external_id": "ChIJ-existant"}'')'),
  '§3-11. … dans la limite du quota');
select pg_temp.reset();

-- 12. Notifications du matin : relances dues avant la fin de la journée à
-- Paris, pas dans les 24 heures.
select pg_temp.act(:'b_user');
select public.commercial_task_upsert(:'d1', jsonb_build_object('title', 'Ce soir',
  'due_at', (date_trunc('day', now() at time zone 'Europe/Paris') + interval '23 hours 59 minutes') at time zone 'Europe/Paris'));
select public.commercial_task_upsert(:'d1', jsonb_build_object('title', 'Demain',
  'due_at', (date_trunc('day', now() at time zone 'Europe/Paris') + interval '1 day 1 minute') at time zone 'Europe/Paris'));
select pg_temp.act_service();
select pg_temp.ok((select tasks from public.commercial_morning() where commercial_id = :'b') = 1,
  '§3-12. relances du jour : jusqu''à minuit à Paris');
select pg_temp.reset();

-- 13. Échéances calculées en base : rappel de l'option, une fois, pour les
-- seuls contrats signés en cours (ni C, jamais signé, ni D, terminé).
update public.commercial_settings set option_reminder_days = 10000;
select pg_temp.act_service();
select pg_temp.ok((select array_agg(id order by id) from public.commercial_option_reminders()) = array[:'a', :'b']::uuid[],
  '§3-13. rappel de l''option calculé en base, contrats en cours seulement');
select pg_temp.ok(not exists (select 1 from public.commercial_option_reminders()), '§3-13. … une fois');
select pg_temp.reset();

-- 13.2 n° 2, chemins que la vérification a isolés : passage sans suite et
-- déclaration reçue par e-mail (confirmée de droit à la saisie).
select pg_temp.act(:'a_user');
select public.commercial_passage(:'r6', '{"interest": "froid"}', 'not_interested');
select pg_temp.reset();
select pg_temp.ok((select bool_and(coalesce((metadata ->> 'reflect')::boolean, false))
                   from public.crm_activities where restaurant_id = :'r6' and type = 'status_change'),
  '13.2 n° 2. passage sans suite : reflet sous drapeau');
\set r10 '00000000-0000-0000-0000-000000000f10'
insert into public.crm_restaurants (id, name, slug, address, city) values (:'r10', 'Dix Tables', 'r10', '10 rue Libre', 'Montpellier');
select pg_temp.act(:'admin');
select pg_temp.ok((public.admin_record_email_declaration(:'b', :'r10', now() - interval '10 days', '{menu}', :'contact') ->> 'status') = 'confirmed',
  '13.2 n° 2. déclaration reçue par e-mail datée de 10 jours : confirmée de droit');
select pg_temp.reset();
select pg_temp.ok((select l.status from public.crm_leads l where l.restaurant_id = :'r10') = 'to_contact'
  and (select bool_and(coalesce((metadata ->> 'reflect')::boolean, false))
       from public.crm_activities where restaurant_id = :'r10' and type = 'status_change'),
  '13.2 n° 2. déclaration reçue par e-mail : reflet to_contact sous drapeau');

rollback;
