-- Contrat v3, art. 4.6 : le taux propre à chaque commercial. Relevé, jamais
-- baissé ; une hausse vaut pour les relevés à venir, pas pour ceux envoyés.
begin;
\i /work/tests/fixtures.inc

\set e '00000000-0000-0000-0000-0000000e7c01'
insert into public.etablissements (id, slug, name, tagline, address, phone, hours)
values (:'e', 'bistrot-taux', 'Bistrot Taux', '', '', '', '');
insert into public.commercial_signups (id, restaurant_id, commercial_id, etablissement_id, finished_at)
values ('00000000-0000-0000-0000-00000000519a', :'r1', :'a', :'e', '2026-07-01 08:00+02');
insert into public.commercial_clients (commercial_id, restaurant_id, signup_id, etablissement_id, commission_from, validated_at)
values (:'a', :'r1', '00000000-0000-0000-0000-00000000519a', :'e', '2026-07-01 08:00+02', '2026-07-01 08:00+02');
insert into public.ominin_invoice_payments (etablissement_id, eligible_ht_cents, paid_at, note) values
  (:'e', 10000, '2026-07-15 12:00+02', 'juillet'),
  (:'e', 10000, '2026-08-15 12:00+02', 'août'),
  (:'e', 10000, now(), 'ce mois-ci');

select (public.commercial_cfg()).commission_percent as base \gset
select pg_temp.ok(public.commercial_rate(:'a') = :base, 'sans taux propre : le taux de base');

-- Juillet relevé au taux de base.
select pg_temp.act(:'admin');
select public.admin_statement_draft(:'a', '2026-07-01') as st7 \gset
select public.admin_statement_send(:'st7');
select pg_temp.reset();
select pg_temp.ok(commission_percent = :base and total_cents = round(10000 * :base / 100), 'juillet : relevé au taux de base')
from public.commercial_statements where id = :'st7';

-- Ni le commercial ni personne ne baisse un taux.
select pg_temp.act(:'a_user');
select pg_temp.ok(pg_temp.fails(format('select public.admin_set_commission_percent(%L, 50)', :'a')), 'le commercial ne règle pas son taux');
select pg_temp.act(:'admin');
select pg_temp.ok(pg_temp.fails(format('select public.admin_set_commission_percent(%L, %s)', :'b', :base - 1)), 'jamais sous le taux de base');
select public.admin_set_commission_percent(:'a', :base + 5);
select pg_temp.ok(pg_temp.fails(format('select public.admin_set_commission_percent(%L, %s)', :'a', :base + 2)), 'une hausse ne se reprend pas');
select pg_temp.ok(pg_temp.fails(format('select public.admin_set_commission_percent(%L, null)', :'a')), 'retour à la base refusé après une hausse');
select pg_temp.ok(pg_temp.fails(format('update public.commerciaux set commission_percent = %s where id = %L', :base + 1, :'a')),
  'la RLS admin ne contourne pas la règle');
select pg_temp.ok(pg_temp.fails(format('select public.admin_set_commission_percent(%L, 101)', :'a')), 'au plus 100 %');
select pg_temp.reset();
select pg_temp.ok(public.commercial_rate(:'a') = :base + 5 and public.commercial_rate(:'b') = :base, 'la hausse ne touche que A');

-- Août au nouveau taux ; juillet, envoyé, ne bouge pas.
select pg_temp.act(:'admin');
select public.admin_statement_draft(:'a', '2026-08-01') as st8 \gset
select pg_temp.reset();
select pg_temp.ok(commission_percent = :base + 5 and adjustments = '[]' and total_cents = round(10000 * (:base + 5) / 100),
  'août : nouveau taux, aucune régularisation de juillet')
from public.commercial_statements where id = :'st8';

-- Un encaissement de juillet appris après l'envoi se régularise au taux de juillet.
insert into public.ominin_invoice_payments (etablissement_id, eligible_ht_cents, paid_at, note) values (:'e', 2000, '2026-07-20 12:00+02', 'tardif');
select pg_temp.act(:'admin');
select public.admin_statement_draft(:'a', '2026-08-01');
select pg_temp.reset();
select pg_temp.ok((select (a ->> 'cents')::bigint from public.commercial_statements, jsonb_array_elements(adjustments) a where id = :'st8')
  = round(2000 * :base / 100), 'régularisation de juillet au taux de son relevé');

-- Ce que voit A : son taux, au tableau et dans Argent.
select pg_temp.act(:'a_user');
select pg_temp.ok((public.commercial_dashboard() ->> 'percent')::numeric = :base + 5
  and (public.commercial_money() -> 'estimate' ->> 'percent')::numeric = :base + 5
  and not exists (select 1 from jsonb_array_elements(public.commercial_money() -> 'estimate' -> 'lines') l
                  where (l ->> 'commission_cents')::bigint <> round((l ->> 'base_cents')::bigint * (:base + 5) / 100)),
  'tableau et Argent au taux de A');
select pg_temp.reset();

-- Résiliation par Ominin avec préavis : un motif de fin.
update public.commerciaux set ended_at = now() + interval '3 months', end_reason = 'termination' where id = :'b';
select pg_temp.ok((select end_reason from public.commerciaux where id = :'b') = 'termination', 'motif : résiliation par Ominin');

rollback;
