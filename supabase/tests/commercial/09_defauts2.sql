-- Second passage de vérification : chaque nouveau défaut (N1 à N10) rejoué,
-- corrigé.
begin;
\i /work/tests/fixtures.inc
update public.commercial_settings set signup_link_days = 30, declaration_cap = null, cooldown_days = null;

\set r10 '00000000-0000-0000-0000-000000000f10'
\set r11 '00000000-0000-0000-0000-000000000f11'
\set r12 '00000000-0000-0000-0000-000000000f12'
\set r13 '00000000-0000-0000-0000-000000000f13'
insert into public.crm_restaurants (id, name, slug, city) values
  (:'r10', 'Dix Doigts', 'r10', 'Montpellier'), (:'r11', 'Onze Heures', 'r11', 'Montpellier'),
  (:'r12', 'Douze Pommes', 'r12', 'Montpellier'), (:'r13', 'Treize Tables', 'r13', 'Montpellier');
\set cgv '00000000-0000-0000-0000-0000000000c8'
insert into public.legal_versions (id, doc, version, effective_from, body_sha256, summary)
values (:'cgv', 'cgv', 'cgv-t', now() - interval '400 days', 'z', 'cgv');
create function pg_temp.kind(p_restaurant uuid, p_user uuid) returns text language plpgsql as $$
declare v text;
begin
  perform pg_temp.act(p_user);
  select j -> 'state' ->> 'kind' into v from public.commercial_restaurant(p_restaurant) j;
  perform pg_temp.reset();
  return v;
end;
$$;

-- ===========================================================================
-- N1. Fusion de fiches : rien de ce que la fiche retirée savait ne se perd.
select pg_temp.act(:'admin');
select public.admin_merge_restaurants(:'r1', :'rc_link', 'doublon');
select pg_temp.reset();
select pg_temp.ok(pg_temp.kind(:'r1', :'b_user') = 'client', 'N1. retirée reliée au client : la gardée est cliente');
select pg_temp.act(:'b_user');
select pg_temp.ok((public.commercial_declare(:'r1', '{menu}', :'contact') ->> 'refusal_reason') = 'client',
  'N1. … et ne se déclare pas');
-- A réserve r2 ; la retirée était en opposition : la gardée l'est, A est libéré.
select pg_temp.act(:'a_user');
select (public.commercial_declare(:'r2', '{menu}', :'contact') ->> 'id') as d2 \gset
select pg_temp.act(:'admin');
select public.admin_merge_restaurants(:'r2', :'r_optout', 'doublon');
select pg_temp.reset();
select pg_temp.ok(pg_temp.kind(:'r2', :'b_user') = 'opted_out', 'N1. retirée en opposition : la gardée est en opposition');
select pg_temp.ok((select status::text || '/' || end_reason::text from public.commercial_declarations where id = :'d2') = 'abandoned/opposition',
  'N1. … la réservation de la gardée close pour opposition');
-- Client et opposition réunis : jamais « libre ».
insert into public.crm_restaurants (id, name, slug, city, outreach_opted_out_at)
values ('00000000-0000-0000-0000-000000000f14', 'Quatorze Opposé', 'r14', 'Montpellier', now());
select pg_temp.act(:'admin');
select public.admin_merge_restaurants(:'r1', '00000000-0000-0000-0000-000000000f14', 'doublon');
select pg_temp.reset();
select pg_temp.ok((select outreach_opted_out_at is not null and etablissement_id = :'etab' from public.crm_restaurants where id = :'r1')
  and pg_temp.kind(:'r1', :'b_user') <> 'free', 'N1. cliente + opposée : ni l''un ni l''autre ne se perd');
-- Client Projet de la retirée : la gardée est « en discussion ».
select pg_temp.act(:'admin');
select public.admin_merge_restaurants(:'r3', :'r_projet', 'doublon');
select pg_temp.reset();
select pg_temp.ok((select public.commercial_in_talks(r) from public.crm_restaurants r where id = :'r3')
  and (select restaurant_id from public.projet_clients where name = 'Client Projet') = :'r3',
  'N1. client Projet déplacé : la gardée est en discussion');
-- Fiche retirée ou absente, deux clients différents : refusé.
insert into public.shops (id, slug, name, order_prefix) values ('00000000-0000-0000-0000-00000005b009', 's9', 'S9', 'S9');
update public.crm_restaurants set shop_id = '00000000-0000-0000-0000-00000005b009' where id = :'r9';
select pg_temp.act(:'admin');
select pg_temp.ok(pg_temp.fails(format('select public.admin_merge_restaurants(%L, %L, ''x'')', :'r4', :'rc_link')), 'N1. fusion depuis une fiche retirée refusée');
select pg_temp.ok(pg_temp.fails(format('select public.admin_merge_restaurants(%L, %L, ''x'')', :'rc_link', :'r4')), 'N1. fusion vers une fiche retirée refusée');
select pg_temp.ok(pg_temp.fails(format('select public.admin_merge_restaurants(%L, %L, ''x'')', :'r1', :'r9')), 'N1. deux fiches de clients différents : refusé');
select pg_temp.reset();
-- Identifiant Google d'une fiche fusionnée : la fiche qui l'a absorbée.
update public.crm_restaurants set source = 'google_places', external_id = 'ChIJ-fusion' where id = :'r4';
select pg_temp.act(:'admin');
select public.admin_merge_restaurants(:'r5', :'r4', 'même restaurant');
select pg_temp.act(:'a_user');
select pg_temp.ok(public.commercial_create_restaurant('{"name": "Quatre Vents", "external_id": "ChIJ-fusion"}') = :'r5'::uuid,
  'N1. identifiant Google d''une fiche fusionnée : la fiche gardée est rendue');
select pg_temp.reset();

-- ===========================================================================
-- N2. Client parti puis revenu.
\set etab2 '00000000-0000-0000-0000-0000000e7ab2'
\set g2 '00000000-0000-0000-0000-00000000ee02'
insert into auth.users (id, email) values (:'g2', 'g2@resto.test');
insert into public.etablissements (id, slug, name, tagline, address, phone, hours)
values (:'etab2', 'dix-doigts', 'Dix Doigts', '', '', '', '');
-- B déclare r10 il y a 60 jours ; le gérant s'inscrit par son lien il y a 50 jours.
select pg_temp.act(:'b_user');
select (public.commercial_declare(:'r10', '{menu}', :'contact') ->> 'id') as db \gset
select pg_temp.reset();
update public.commercial_declarations set declared_at = now() - interval '60 days' where id = :'db';
select pg_temp.act(:'admin');
select public.admin_decide_declaration(:'db', 'confirm', null);
select pg_temp.act(:'b_user');
select public.commercial_signup_link(:'db') as tokb \gset
select pg_temp.act(:'g2');
select public.signup_link_claim(:'tokb', 'menu');
select pg_temp.reset();
insert into public.legal_acceptances (version_id, scope, etablissement_id, user_id, signatory_email, scope_label, terms, accepted_at)
values (:'cgv', 'etablissement', :'etab2', :'g2', 'g2@resto.test', 'x', '{}', now() - interval '50 days');
select id as cb from public.commercial_clients where declaration_id = :'db' \gset
-- Encaissements avant le départ (10 000), après le départ (20 000) ; le client revient.
select pg_temp.act(:'admin');
select public.admin_record_payment(:'etab2', null, 10000, now() - interval '40 days', 'avant départ');
select public.admin_set_client_ended(:'r10', now() - interval '30 days');
select public.admin_record_payment(:'etab2', null, 20000, now() - interval '20 days', 'après départ');
select public.admin_set_client_ended(:'r10', null);
select pg_temp.reset();
select pg_temp.ok((select b.invoice_cents from public.commercial_clients c, public.commercial_base(c, now() - interval '60 days', now()) b
                   where c.id = :'cb') = 10000, 'N2. client revenu : la commission de B s''arrête au départ, pas de reprise');
select pg_temp.ok((select ended_at from public.commercial_clients where id = :'cb') = now() - interval '30 days',
  'N2. … la fin du Client Apporté est figée au départ');
-- Il repart ; son Projet ne le garde pas « en discussion » ; A le redéclare.
select pg_temp.act(:'admin');
select public.admin_set_client_ended(:'r10', now() - interval '10 days');
select pg_temp.reset();
select pg_temp.ok(not (select public.commercial_in_talks(r) from public.crm_restaurants r where id = :'r10')
  and exists (select 1 from public.projet_clients where restaurant_id = :'r10'),
  'N2. le Projet d''un client parti ne le garde pas « en discussion »');
select pg_temp.act(:'a_user');
select (public.commercial_declare(:'r10', '{menu}', :'contact') ->> 'id') as da \gset
select pg_temp.ok((select status from public.commercial_declarations where id = :'da') is null
  and (public.commercial_restaurant(:'r10') -> 'mine' ->> 'status') = 'pending', 'N2. un client parti se redéclare');
select pg_temp.act(:'admin');
select public.admin_decide_declaration(:'da', 'confirm', null);
select pg_temp.act(:'a_user');
select public.commercial_signup_link(:'da') as toka \gset
select pg_temp.act(:'g2');
select public.signup_link_claim(:'toka', 'menu');
select pg_temp.reset();
insert into public.legal_acceptances (version_id, scope, etablissement_id, user_id, signatory_email, scope_label, terms, accepted_at)
values (:'cgv', 'etablissement', :'etab2', :'g2', 'g2@resto.test', 'x', '{}', now() + interval '1 minute');
select pg_temp.ok((select status from public.commercial_declarations where id = :'da') = 'signed',
  'N2. revenu par le lien de A : déclaration de A signée');
select pg_temp.ok((select commission_from = now() + interval '1 minute' and validated_at is not null and ended_at is null
                   from public.commercial_clients where declaration_id = :'da'),
  'N2. … nouveau Client Apporté de A, depuis l''acceptation postérieure à sa déclaration');
select pg_temp.ok((select ended_at from public.commercial_clients where id = :'cb') = now() - interval '30 days',
  'N2. … celui de B reste clos à son premier départ');
-- Un client encore apporté ne change pas de titulaire.
select pg_temp.act(:'b_user');
select (public.commercial_declare(:'r11', '{menu}', :'contact') ->> 'id') as d11 \gset
select pg_temp.act(:'admin');
select pg_temp.ok(pg_temp.fails(format('select public.admin_mark_signed(%L, %L)', :'d11', :'etab2')),
  'N2. marquer signé un client encore apporté à A : refusé');
select pg_temp.reset();

-- ===========================================================================
-- N3. Déclaration par e-mail déjà échue à la saisie : refusée, la concurrente reste.
insert into public.legal_versions (id, doc, version, effective_from, body_sha256, summary)
values ('00000000-0000-0000-0000-0000000000f0', 'commercial', 'test-0', now() - interval '400 days', 'x0', 'test0');
insert into public.legal_acceptances (version_id, scope, commercial_id, user_id, signatory_email, scope_label, terms, accepted_at)
values ('00000000-0000-0000-0000-0000000000f0', 'commercial', :'a', :'a_user', 'a@ominin.test', 'a', '{}', now() - interval '300 days');
select pg_temp.act(:'admin');
select pg_temp.ok(pg_temp.fails(format('select public.admin_record_email_declaration(%L, %L, now() - interval ''8 months'', ''{menu}'', ''{"role": "Gérant"}'')', :'a', :'r11')),
  'N3. e-mail daté de 8 mois : déjà échu, refusé à la saisie');
select pg_temp.reset();
select pg_temp.ok((select status from public.commercial_declarations where id = :'d11') = 'pending', 'N3. … la déclaration de B reste en attente');

-- ===========================================================================
-- N4. Lien régénéré après le rattachement du gérant : l'inscription reste attribuée.
\set etab3 '00000000-0000-0000-0000-0000000e7ab3'
\set g3 '00000000-0000-0000-0000-00000000ee03'
insert into auth.users (id, email) values (:'g3', 'g3@resto.test');
select pg_temp.act(:'b_user');
select (public.commercial_declare(:'r12', '{menu}', :'contact') ->> 'id') as d12 \gset
select pg_temp.act(:'admin');
select public.admin_decide_declaration(:'d12', 'confirm', null);
select pg_temp.act(:'b_user');
select public.commercial_signup_link(:'d12') as tok12 \gset
select pg_temp.act(:'g3');
select public.signup_link_claim(:'tok12', 'menu');
select pg_temp.act(:'b_user');
select public.commercial_signup_link(:'d12');
select pg_temp.reset();
select pg_temp.ok((select signup_user_id from public.commercial_declarations where id = :'d12') = :'g3', 'N4. le rattachement survit au nouveau lien');
insert into public.etablissements (id, slug, name, tagline, address, phone, hours)
values (:'etab3', 'douze-pommes', 'Douze Pommes', '', '', '', '');
insert into public.legal_acceptances (version_id, scope, etablissement_id, user_id, signatory_email, scope_label, terms, accepted_at)
values (:'cgv', 'etablissement', :'etab3', :'g3', 'g3@resto.test', 'x', '{}', now() + interval '1 minute');
select pg_temp.ok((select status from public.commercial_declarations where id = :'d12') = 'signed', 'N4. … et l''inscription est attribuée');

-- ===========================================================================
-- N5. Deck : réservé au contrat signé et en cours.
insert into storage.objects (bucket_id, name) values ('commercial-docs', 'kit/deck.pdf');
select pg_temp.act(:'c_user');
select pg_temp.ok((select count(*) from storage.objects where name = 'kit/deck.pdf') = 0, 'N5. invité non signé : pas de deck');
select pg_temp.act(:'a_user');
select pg_temp.ok((select count(*) from storage.objects where name = 'kit/deck.pdf') = 1, 'N5. contrat signé en cours : deck');
select pg_temp.reset();

-- N6. Une pièce déposée ne se réécrit pas.
insert into storage.objects (bucket_id, name) values ('commercial-docs', :'b' || '/factures/f1.pdf');
select pg_temp.act(:'b_user');
select pg_temp.ok((select count(*) from storage.objects where name = :'b' || '/factures/f1.pdf') = 1, 'N6. B lit sa facture');
with changed as (update storage.objects set metadata = '{"x": 1}' where name = :'b' || '/factures/f1.pdf' returning 1)
select pg_temp.ok((select count(*) from changed) = 0, 'N6. … mais ne la réécrit pas');
select pg_temp.reset();

-- ===========================================================================
-- N7. Deux demandes de détail sur le même relevé : chacune se marque envoyée.
insert into public.commercial_statements (commercial_id, month, status, sent_at)
values (:'b', '2026-09-01', 'sent', now()) returning id as st \gset
select pg_temp.act(:'b_user');
select public.commercial_request_detail(:'st');
select pg_temp.act(:'admin');
select public.admin_statement_detail_sent(:'st');
select pg_temp.reset();
update public.commercial_statements set detail_requested_at = now() - interval '4 months', detail_sent_at = now() - interval '4 months' where id = :'st';
select pg_temp.act(:'b_user');
select public.commercial_request_detail(:'st');
select pg_temp.act(:'admin');
select pg_temp.ok(not pg_temp.fails(format('select public.admin_statement_detail_sent(%L)', :'st')), 'N7. seconde demande de détail marquée envoyée');
select pg_temp.reset();

-- ===========================================================================
-- N8. Rien vers un commercial au contrat terminé (D).
select pg_temp.act(:'admin');
select pg_temp.ok(pg_temp.fails(format('select public.admin_record_email_declaration(%L, %L, now() - interval ''1 day'', ''{menu}'', ''{"role": "Gérant"}'')', :'d', :'r13')),
  'N8. déclaration par e-mail pour un contrat terminé refusée');
select pg_temp.act(:'b_user');
select (public.commercial_declare(:'r13', '{menu}', :'contact') ->> 'id') as d13 \gset
select pg_temp.act(:'admin');
select public.admin_decide_declaration(:'d13', 'confirm', null);
select pg_temp.ok(pg_temp.fails(format('select public.admin_reassign_declaration(%L, %L, ''accord'', ''b/accord.pdf'')', :'d13', :'d')),
  'N8. réattribution vers un contrat terminé refusée');
select pg_temp.reset();

-- ===========================================================================
-- N9. L'alerte « déjà client ? » ne se lit pas : pas de lecture directe des
-- déclarations, la déclaration ne rend qu'un booléen.
insert into public.etablissements (id, slug, name, tagline, address, phone, hours)
values ('00000000-0000-0000-0000-0000000e7ab9', 'treize-tables-bis', 'Treize Tables', '', '', '', '');
insert into public.crm_restaurants (id, name, slug, city) values ('00000000-0000-0000-0000-000000000f15', 'Treize Tables', 'r15', 'Montpellier');
select pg_temp.act(:'a_user');
select public.commercial_declare('00000000-0000-0000-0000-000000000f15', '{menu}', :'contact') as j9 \gset
select pg_temp.ok((:'j9'::jsonb ->> 'client_alert') = 'true', 'N9. la déclaration rend l''alerte en booléen');
select pg_temp.ok((select count(*) from public.commercial_declarations) = 0, 'N9. aucune lecture directe des déclarations (texte de l''alerte)');
select pg_temp.reset();
select pg_temp.ok((select client_alert from public.commercial_declarations where id = (:'j9'::jsonb ->> 'id')::uuid) like '%Treize Tables%',
  'N9. … le texte reste à l''admin');

-- ===========================================================================
-- N10. Contrat terminé : ses appareils ne reçoivent plus rien.
insert into public.commercial_push_subscriptions (commercial_id, endpoint, p256dh, auth) values
  (:'d', 'https://push.test/d', 'k', 'a'), (:'a', 'https://push.test/a', 'k', 'a');
select pg_temp.act_service();
select public.commercial_release_ended();
select pg_temp.reset();
select pg_temp.ok((select array_agg(commercial_id) from public.commercial_push_subscriptions) = array[:'a']::uuid[],
  'N10. abonnements push d''un contrat terminé retirés, les autres gardés');
-- (Les rappels de rendez-vous sont devenus des relances J+n : 10_defauts3.sql.)

rollback;
