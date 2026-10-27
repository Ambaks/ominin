-- Lot 2 : lien d'inscription, Client Apporté, Projet, inscription sans lien,
-- démos, quota Google, « Autour de moi », fusion de fiches.
begin;
\i /work/tests/fixtures.inc

\set g_user '00000000-0000-0000-0000-0000000000e1'
\set h_user '00000000-0000-0000-0000-0000000000e2'
\set etab_g '00000000-0000-0000-0000-0000000e7a01'
\set etab_h '00000000-0000-0000-0000-0000000e7a02'
\set cgv '00000000-0000-0000-0000-0000000000c9'
insert into auth.users (id, email) values (:'g_user', 'gerant@resto.test'), (:'h_user', 'autre@resto.test');
insert into public.legal_versions (id, doc, version, effective_from, body_sha256, summary)
values (:'cgv', 'cgv', 'test-cgv', now() - interval '30 days', 'z', 'cgv');

-- A déclare r1, Ominin confirme.
select pg_temp.act(:'a_user');
select public.commercial_declare(:'r1', '{collect}', :'contact') ->> 'id' as d1 \gset
select pg_temp.act(:'admin');
select public.admin_decide_declaration(:'d1', 'confirm', null);

-- Sans validité réglée, pas de lien ; B ne génère pas le lien de A.
select pg_temp.act(:'a_user');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_signup_link(%L)', :'d1')), '13.2 n° 15. lien fermé sans validité réglée');
select pg_temp.reset();
update public.commercial_settings set signup_link_days = 30;
select pg_temp.act(:'b_user');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_signup_link(%L)', :'d1')), '5.5. B ne génère pas le lien de A');
select pg_temp.act(:'a_user');
select public.commercial_signup_link(:'d1') as token \gset
select pg_temp.reset();
select pg_temp.ok(signup_token_hash = encode(extensions.digest(:'token', 'sha256'), 'hex')
  and signup_token_hash <> :'token' and signup_token_expires_at > now() + interval '29 days',
  '5.5. seule l''empreinte du jeton est gardée, valable SIGNUP_LINK_DAYS')
from public.commercial_declarations where id = :'d1';

-- La page publique lit le restaurant pour pré-remplir ; un jeton faux, rien.
select set_config('role', 'anon', true);
select pg_temp.ok((public.signup_link_info(:'token') ->> 'name') = 'Le Bistrot Libre', '5.5. nom et adresse pré-remplis');
select pg_temp.ok(public.signup_link_info('faux') is null, '5.5. jeton inconnu refusé');
select pg_temp.ok(pg_temp.fails(format('select public.signup_link_claim(%L, ''collect'')', :'token')), '5.5. un anonyme ne rattache rien');
select pg_temp.reset();

-- Le gérant G ouvre le lien : il est rattaché à son compte ; H ne le reprend pas.
select pg_temp.act(:'g_user');
select pg_temp.ok(public.signup_link_claim(:'token', 'collect'), '5.5 n° 1. lien rattaché au compte');
select pg_temp.act(:'h_user');
select pg_temp.ok(pg_temp.fails(format('select public.signup_link_claim(%L, ''menu'')', :'token')), '5.5. un lien sert un seul compte');
select pg_temp.reset();

-- G crée son établissement et accepte les CGV (ce qu'écrit acceptContract).
insert into public.etablissements (id, slug, name, tagline, address, phone, hours)
values (:'etab_g', 'bistrot-libre', 'Le Bistrot Libre', '', '1 rue Libre', '04 67 11 11 11', '');
insert into public.legal_acceptances (version_id, scope, etablissement_id, user_id, signatory_email, scope_label, terms)
values (:'cgv', 'etablissement', :'etab_g', :'g_user', 'gerant@resto.test', 'bistrot-libre', '{}');
select accepted_at as signed_at from public.legal_acceptances where etablissement_id = :'etab_g' \gset

select pg_temp.ok(status = 'signed' and signup_token_hash is null, '5.5 n° 2. déclaration signée, jeton consommé')
from public.commercial_declarations where id = :'d1';
select pg_temp.ok((select etablissement_id from public.crm_restaurants where id = :'r1') = :'etab_g', '5.5 n° 2. fiche reliée');
select pg_temp.ok(commission_from = :'signed_at' and validated_at is not null and alert is null,
  '5.5 n° 2. Client Apporté validé, commission depuis l''acceptation des CGV')
from public.commercial_clients where declaration_id = :'d1';
select pg_temp.ok((select status from public.crm_leads where restaurant_id = :'r1') = 'signed'
  and exists (select 1 from public.crm_activities where restaurant_id = :'r1' and metadata ->> 'to' = 'signed' and metadata ->> 'reflect' = 'true'),
  '5.5 / 13.2 n° 2. reflet signed sous drapeau');
select pg_temp.ok(c.product = 'collect' and c.restaurant_id = :'r1' and c.declaration_id = :'d1'
  and (select count(*) from public.projet_steps s where s.client_id = c.id and s.position <= 6 and s.status = 'done') = 6
  and (select count(*) from public.projet_steps s where s.client_id = c.id and s.position > 6 and s.status = 'done') = 0,
  '5.5 n° 2. client Projet créé, étapes 1 à 6 faites, produit du tunnel')
from public.projet_clients c where c.etablissement_id = :'etab_g';
select pg_temp.ok(exists (select 1 from public.commercial_emails where declaration_id = :'d1' and kind = 'signed'), '5.5. e-mail au commercial');
select set_config('role', 'anon', true);
select pg_temp.ok(public.signup_link_info(:'token') is null, '10 (lot 2). un lien consommé est refusé');
select pg_temp.reset();

-- Le commercial voit son client par sa fonction, jamais par la table ; B rien.
select pg_temp.act(:'a_user');
select pg_temp.ok(jsonb_array_length(public.commercial_my_clients()) = 1
  and (select count(*) from public.commercial_clients) = 0
  and (select count(*) from public.commercial_declarations) = 0, '7.2. le titulaire lit son Client Apporté par commercial_my_clients, aucune table en direct');
select pg_temp.act(:'b_user');
select pg_temp.ok(jsonb_array_length(public.commercial_my_clients()) = 0, '7.2. un autre ne le lit pas');
select pg_temp.reset();

-- Lien expiré : refusé.
select pg_temp.act(:'b_user');
select public.commercial_declare(:'r2', '{menu}', :'contact') ->> 'id' as d2 \gset
select pg_temp.act(:'admin');
select public.admin_decide_declaration(:'d2', 'confirm', null);
select pg_temp.act(:'b_user');
select public.commercial_signup_link(:'d2') as token2 \gset
select pg_temp.reset();
update public.commercial_declarations set signup_token_expires_at = now() - interval '1 second' where id = :'d2';
select pg_temp.act(:'h_user');
select pg_temp.ok(not public.signup_link_claim(:'token2', 'menu'), '10 (lot 2). un lien expiré est refusé');

-- Nom trop différent : l'inscription attend la validation.
select pg_temp.act(:'b_user');
select public.commercial_signup_link(:'d2') as token2 \gset
select pg_temp.act(:'h_user');
select public.signup_link_claim(:'token2', 'menu');
select pg_temp.reset();
insert into public.etablissements (id, slug, name, tagline, address, phone, hours)
values (:'etab_h', 'tout-autre', 'Tout Autre Chose', '', '', '0699999999', '');
insert into public.legal_acceptances (version_id, scope, etablissement_id, user_id, signatory_email, scope_label, terms)
values (:'cgv', 'etablissement', :'etab_h', :'h_user', 'autre@resto.test', 'tout-autre', '{}');
select pg_temp.ok(validated_at is null and alert like '%nom%' and alert like '%téléphone%',
  '10 (lot 2). nom et téléphone trop différents : en attente de validation')
from public.commercial_clients where declaration_id = :'d2';
select pg_temp.act(:'admin');
select public.admin_validate_client(id) from public.commercial_clients where declaration_id = :'d2';
select pg_temp.reset();
select pg_temp.ok(validated_at is not null, '6. l''admin valide l''inscription suspecte')
from public.commercial_clients where declaration_id = :'d2';

-- Inscription pendant l'attente : la signature confirme d'abord.
select pg_temp.act(:'a_user');
select public.commercial_declare(:'r3', '{menu}', :'contact') ->> 'id' as d3 \gset
select pg_temp.reset();
update public.commercial_declarations
set signup_token_hash = 'x', signup_token_expires_at = now() + interval '1 day', signup_user_id = :'h_user'
where id = :'d3';
insert into public.etablissements (id, slug, name, tagline, address, phone, hours)
values ('00000000-0000-0000-0000-0000000e7a03', 'trois', 'Trois Saveurs', '', '', '', '');
insert into public.legal_acceptances (version_id, scope, etablissement_id, user_id, signatory_email, scope_label, terms)
values (:'cgv', 'etablissement', '00000000-0000-0000-0000-0000000e7a03', :'h_user', 'autre@resto.test', 'trois', '{}');
select pg_temp.ok(status = 'signed' and confirmed_at is not null, '13.2 n° 11. confirmée puis signée')
from public.commercial_declarations where id = :'d3';

-- Inscription sans lien d'un restaurant réservé : proposée au rattachement.
select pg_temp.act(:'a_user');
select public.commercial_declare(:'r4', '{menu}', '{"role": "Gérant", "email": "chef@quatre.test"}') ->> 'id' as d4 \gset
select pg_temp.reset();
insert into public.etablissements (id, slug, name, tagline, address, phone, hours)
values ('00000000-0000-0000-0000-0000000e7a04', 'quatre', 'Quatre Vents SARL', '', '', '', '');
insert into public.memberships (user_id, etablissement_id, role, email)
values (:'h_user', '00000000-0000-0000-0000-0000000e7a04', 'gerant', 'chef@quatre.test');
select pg_temp.act(:'admin');
select pg_temp.ok((select reason from public.admin_signup_matches() where declaration_id = :'d4') = 'e-mail',
  '10 (lot 2). inscription sans lien proposée au rattachement');
select public.admin_mark_signed(:'d4', '00000000-0000-0000-0000-0000000e7a04');
select pg_temp.reset();
select pg_temp.ok(validated_at is not null, '6. rattachée par l''admin : Client Apporté validé')
from public.commercial_clients where declaration_id = :'d4';
select pg_temp.act(:'a_user');
select pg_temp.ok(jsonb_array_length(public.commercial_my_clients()) = 3, '5.6. trois Clients Apportés pour A (r1, r3, r4)');

-- Demande de démo, livrée : étape 2 cochée, e-mail au commercial.
select public.commercial_declare(:'r5', '{menu}', :'contact') ->> 'id' as d5 \gset
select pg_temp.ok(pg_temp.fails(format('select public.commercial_request_demo(%L, ''x'', array[''autre/demos/a.jpg''])', :'d5')),
  '5.4. photos hors de son dossier refusées');
select public.commercial_request_demo(:'d5', 'Carte au tableau', array[:'a' || '/demos/' || :'d5' || '/carte.jpg']) as q5 \gset
select pg_temp.act(:'admin');
select public.admin_deliver_demo(:'q5', 'https://menu.ominin.com/demo/cinq-sens');
select pg_temp.reset();
select pg_temp.ok(step_done_at ? '2', '5.4. étape 2 cochée à la livraison') from public.commercial_declarations where id = :'d5';
select pg_temp.ok(exists (select 1 from public.commercial_emails where declaration_id = :'d5' and kind = 'demo_ready'), '5.4. commercial prévenu');
select pg_temp.act(:'a_user');
select pg_temp.ok((select count(*) from jsonb_array_elements(public.commercial_today(now() - interval '1 hour') -> 'news') n
  where n ->> 'kind' = 'demo_ready') = 1, '5.1. démo prête parmi les nouveautés');

-- Quota Google : fermé sans réglage, puis compté.
select pg_temp.ok(pg_temp.fails('select public.commercial_count_places()'), '5.2. Google fermé sans quota');
select pg_temp.reset();
update public.commercial_settings set places_daily_quota = 1;
select pg_temp.act(:'a_user');
select public.commercial_count_places();
select pg_temp.ok(pg_temp.fails('select public.commercial_count_places()'), '5.2. quota Google par commercial et par jour');
-- Fiche venue de Google : pas de doublon exact.
select public.commercial_create_restaurant('{"name": "Chez Google", "external_id": "place-1"}') as g1 \gset
select pg_temp.ok(public.commercial_create_restaurant('{"name": "Chez Google bis", "external_id": "place-1"}') = :'g1'::uuid,
  '4.1. même identifiant Google : la fiche existante');
select pg_temp.reset();
select pg_temp.ok((select source from public.crm_restaurants where id = :'g1') = 'google_places', '4.1. source google_places');

-- Autour de moi.
update public.crm_restaurants set latitude = 43.6100, longitude = 3.8770 where id = :'r6';
update public.crm_restaurants set latitude = 43.7000, longitude = 3.9000 where id = :'r7';
select pg_temp.act(:'a_user');
select pg_temp.ok(pg_temp.fails('select * from public.commercial_nearby(43.61, 3.877)'), '13.2 n° 15. carte fermée sans rayon');
select pg_temp.reset();
update public.commercial_settings set nearby_radius_m = 1000;
select pg_temp.act(:'a_user');
select pg_temp.ok((select array_agg(id) from public.commercial_nearby(43.61, 3.877)) = array[:'r6'::uuid], '5.2. Autour de moi : dans le rayon seulement');
select pg_temp.reset();

-- Fusion : deux fiches du même restaurant déclarées par A puis B.
select pg_temp.act(:'a_user');
select public.commercial_declare(:'r8', '{menu}', :'contact') ->> 'id' as d8 \gset
select pg_temp.act(:'b_user');
select public.commercial_declare(:'r9', '{menu}', :'contact') ->> 'id' as d9 \gset
select pg_temp.act(:'admin');
select public.admin_decide_declaration(:'d8', 'confirm', null);
select public.admin_decide_declaration(:'d9', 'confirm', null);
select pg_temp.reset();
update public.commercial_declarations set confirmed_at = now() - interval '1 day' where id = :'d8';
select pg_temp.act(:'admin');
select pg_temp.ok(pg_temp.fails(format('select public.admin_merge_restaurants(%L, %L, '''')', :'r9', :'r8')), '6. une fusion se motive');
select public.admin_merge_restaurants(:'r9', :'r8', 'Même restaurant, deux fiches');
select pg_temp.reset();
select pg_temp.ok(deleted_at is not null and merged_into = :'r9', '6. fiche perdante retirée')
from public.crm_restaurants where id = :'r8';
select pg_temp.ok((select status from public.commercial_declarations where id = :'d8') = 'confirmed'
  and (select status || '/' || end_reason from public.commercial_declarations where id = :'d9') = 'abandoned/merged'
  and (select restaurant_id from public.commercial_declarations where id = :'d8') = :'r9',
  '4.2. la première confirmée l''emporte, l''autre est close (fusion)');
select pg_temp.ok(exists (select 1 from public.commercial_emails where declaration_id = :'d9' and kind = 'released' and detail = 'merged'),
  '4.2. l''autre commercial est informé');
select pg_temp.ok((select count(*) from public.crm_contacts where restaurant_id = :'r9') = 2, '6. les interlocuteurs suivent');

-- Préférences de notification : liste fermée.
select pg_temp.act(:'a_user');
select public.commercial_set_push_prefs('{"relance": false}');
select pg_temp.ok(pg_temp.fails('select public.commercial_set_push_prefs(''{"pub": true}'')'), '5.8. préférences : liste fermée');
select pg_temp.reset();

rollback;
