-- 4.1 et 13.2 n° 5 : liens fiche ↔ client, outil de rattachement de l'admin.
begin;
\i /work/tests/fixtures.inc

insert into public.etablissements (id, slug, name, tagline, address, phone, hours, demo) values
  ('00000000-0000-0000-0000-0000000e7ab3', 'sans-fiche', 'Sans Fiche', '', '20 rue Neuve', '0467999999', '', false),
  ('00000000-0000-0000-0000-0000000e7ab4', 'demo-x', 'Démo X', '', '', '', '', true);
insert into public.shops (id, slug, name, order_prefix) values ('00000000-0000-0000-0000-00000005a0b1', 'boutique', 'Boutique', 'BQ');

-- Un commercial n'utilise pas l'outil de l'admin.
select pg_temp.act(:'a_user');
select pg_temp.ok(pg_temp.fails(format('select public.admin_link_client(%L, %L)', :'r9', '00000000-0000-0000-0000-0000000e7ab3')),
  '13.2 n° 5. réservé à l''admin');
select pg_temp.ok((select count(*) from public.admin_client_places()) = 0, '13.2 n° 5. la liste n''est pas servie hors admin');

select pg_temp.act(:'admin');
-- La liste : clients en service, hors démos, avec la fiche qui les porte.
select pg_temp.ok((select count(*) from public.admin_client_places() where name = 'Démo X') = 0
  and (select restaurant_id from public.admin_client_places() where id = :'etab') = :'rc_link'
  and (select restaurant_id from public.admin_client_places() where name = 'Sans Fiche') is null,
  '4.1. outil de rattachement : liens existants et clients sans fiche');

-- Un établissement sans fiche en reçoit une, créée depuis l'établissement.
select public.admin_link_client(null, '00000000-0000-0000-0000-0000000e7ab3') as created \gset
select pg_temp.reset();
select pg_temp.ok(name = 'Sans Fiche' and phone = '0467999999' and source = 'client'
  and etablissement_id = '00000000-0000-0000-0000-0000000e7ab3', '13.2 n° 5. fiche créée et reliée')
from public.crm_restaurants where id = :'created';

-- Relier une fiche existante à une boutique ; une boutique a une seule fiche.
select pg_temp.act(:'admin');
select public.admin_link_client(:'r9', null, '00000000-0000-0000-0000-00000005a0b1');
select pg_temp.ok(pg_temp.fails(format('select public.admin_link_client(%L, null, %L)', :'r8', '00000000-0000-0000-0000-00000005a0b1')),
  '4.1. une boutique déjà reliée est refusée');
select pg_temp.ok(pg_temp.fails(format('select public.admin_link_client(%L, %L, %L)', :'r8', :'etab', '00000000-0000-0000-0000-00000005a0b1')),
  '4.1. un seul client à la fois');
select pg_temp.act(:'b_user');
select pg_temp.ok((public.commercial_declare(:'r9', '{shop}', :'contact') ->> 'refusal_reason') = 'client', '4.2 n° 1. fiche reliée : déjà client');

-- Départ du client : la fiche redevient déclarable.
select pg_temp.act(:'admin');
select public.admin_set_client_ended(:'r9', now());
select pg_temp.act(:'b_user');
select pg_temp.ok((public.commercial_declare(:'r9', '{shop}', :'contact') ->> 'status') = 'pending', '4.1. client parti : déclarable');
select pg_temp.act(:'admin');
select pg_temp.ok(pg_temp.fails(format('select public.admin_set_client_ended(%L, now())', :'r8')),
  '4.1. une fiche sans client n''a pas de départ');
select pg_temp.reset();

-- Projet : le client relié à sa fiche est « en discussion ».
update public.projet_clients set restaurant_id = :'r8' where name = 'Client Projet';
select pg_temp.act(:'a_user');
select pg_temp.ok((public.commercial_declare(:'r8', '{menu}', :'contact') ->> 'refusal_reason') = 'in_talks',
  '4.3. client Projet relié par l''admin');
select pg_temp.reset();

rollback;
