-- Refonte (29/10), lot 5 : le tableau de bord, et la commission des
-- restaurants inscrits pendant la visite.
begin;
\i /work/tests/fixtures.inc

\set etab2 '00000000-0000-0000-0000-0000000e7ab2'
\set s1 '00000000-0000-0000-0000-00000000515a'
insert into public.etablissements (id, slug, name, tagline, address, phone, hours)
values (:'etab2', 'trois-saveurs', 'Trois Saveurs', '', '3 rue Libre', '', '');
insert into public.commercial_visits (restaurant_id, commercial_id, outcome, reason) values (:'r1', :'a', 'not_interested', 'price');
insert into public.commercial_visits (restaurant_id, commercial_id, outcome, contact_phone) values (:'r2', :'a', 'absent', '0600000000');
insert into public.commercial_signups (id, restaurant_id, commercial_id, etablissement_id, finished_at)
values (:'s1', :'r3', :'a', :'etab2', now());
insert into public.commercial_signups (restaurant_id, commercial_id) values (:'r4', :'a');
insert into public.payment_accounts (etablissement_id, stripe_account_id) values (:'etab2', 'acct_test');

select pg_temp.act(:'a_user');
select public.commercial_dashboard() as dash \gset
select pg_temp.ok(jsonb_array_length(:'dash'::jsonb -> 'restaurants') = 4, 'tableau : visites et inscriptions du commercial');
select pg_temp.ok((select x ->> 'status' from jsonb_array_elements(:'dash'::jsonb -> 'restaurants') x where x ->> 'id' = :'r1') = 'not_interested'
  and (select x ->> 'status' from jsonb_array_elements(:'dash'::jsonb -> 'restaurants') x where x ->> 'id' = :'r2') = 'absent',
  'tableau : la dernière visite donne l''état');
select pg_temp.ok((select x -> 'missing' from jsonb_array_elements(:'dash'::jsonb -> 'restaurants') x where x ->> 'id' = :'r3') = '["stripe", "hubrise"]'
  and (select x -> 'missing' from jsonb_array_elements(:'dash'::jsonb -> 'restaurants') x where x ->> 'id' = :'r4') = '["account"]',
  'tableau : une inscription en attente dit ce qui manque');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_signup_client(%L)', :'s1')), 'client : pas appelable par un commercial');

select pg_temp.act(:'b_user');
select pg_temp.ok(public.commercial_dashboard() -> 'restaurants' = '[]', 'tableau : vide pour un autre commercial');

select pg_temp.act_service();
select pg_temp.ok((select array_agg(id) from public.commercial_pending_signups()) = array[:'s1'::uuid], 'client : seule l''inscription finie attend');
update public.payment_accounts set charges_enabled = true where etablissement_id = :'etab2';
insert into public.hubrise_connections (etablissement_id, access_token, account_id, location_id) values (:'etab2', 't', 'acc', 'loc');
select pg_temp.ok(public.commercial_signup_client(:'s1'), 'client : devient Client Apporté');
select pg_temp.ok(not public.commercial_signup_client(:'s1'), 'client : une seule fois');
select pg_temp.ok((select etablissement_id from public.crm_restaurants where id = :'r3') = :'etab2', 'client : la fiche est reliée');
select pg_temp.ok(not exists (select 1 from public.commercial_pending_signups()), 'client : plus en attente');

insert into public.ominin_invoice_payments (etablissement_id, eligible_ht_cents, paid_at, note) values (:'etab2', 10000, now(), 'test');
select round(10000 * (public.commercial_cfg()).commission_percent / 100) as expected \gset
select pg_temp.ok((select commission_cents from public.commercial_month_lines(:'a', date_trunc('month', now() at time zone 'Europe/Paris')::date) where restaurant_id = :'r3')
  = :'expected', 'commission : le restaurant inscrit entre dans le relevé');

select pg_temp.act(:'a_user');
select pg_temp.ok((select (x ->> 'earned_cents')::bigint from jsonb_array_elements(public.commercial_dashboard() -> 'restaurants') x
                   where x ->> 'id' = :'r3' and x ->> 'status' = 'signed') = :'expected',
  'tableau : le client signé et ce qu''il a rapporté');

-- Un commercial dont le contrat est fini n'ouvre plus de commission.
select pg_temp.act_service();
insert into public.etablissements (id, slug, name, tagline, address, phone, hours)
values ('00000000-0000-0000-0000-0000000e7ab3', 'cinq-sens', 'Cinq Sens', '', '', '', '');
insert into public.commercial_signups (id, restaurant_id, commercial_id, etablissement_id, finished_at)
values ('00000000-0000-0000-0000-00000000515b', :'r5', :'d', '00000000-0000-0000-0000-0000000e7ab3', now());
select pg_temp.ok(not public.commercial_signup_client('00000000-0000-0000-0000-00000000515b'), 'client : contrat fini, pas de commission');
select pg_temp.ok((select etablissement_id from public.crm_restaurants where id = :'r5') is not null, 'client : contrat fini, la fiche est reliée quand même');
select pg_temp.reset();

rollback;
