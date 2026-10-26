-- Lot 3 : l'assiette sur les cinq sources, recalculée à la main au centime,
-- matériel exclu ; le relevé s'envoie, se facture, se paie, se conteste ;
-- régularisation automatique d'un mois figé.
begin;
\i /work/tests/fixtures.inc

\set e '00000000-0000-0000-0000-0000000e7b01'
\set f '00000000-0000-0000-0000-0000000e7b02'
\set s '00000000-0000-0000-0000-00000005b001'
\set cgv '00000000-0000-0000-0000-0000000000c9'
insert into public.legal_versions (id, doc, version, effective_from, body_sha256, summary)
values (:'cgv', 'cgv', 'test-cgv', '2026-01-01', 'z', 'cgv');
insert into public.etablissements (id, slug, name, tagline, address, phone, hours) values
  (:'e', 'bistrot-e', 'Bistrot E', '', '', '', ''),
  (:'f', 'demo-f', 'Paiements simulés F', '', '', '', '');
insert into public.shops (id, slug, name, order_prefix) values (:'s', 'boutique-s', 'Boutique S', 'BS');

-- Trois Clients Apportés de A : E (Menu), S (Shop), F (paiements simulés).
create function pg_temp.bring(p_restaurant uuid, p_etab uuid, p_shop uuid, p_accepted timestamptz) returns uuid language plpgsql as $$
declare
  v uuid;
begin
  perform pg_temp.act('00000000-0000-0000-0000-0000000000a1');
  v := (public.commercial_declare(p_restaurant, '{menu}', '{"role": "Gérant"}') ->> 'id')::uuid;
  perform pg_temp.reset();
  update public.commercial_declarations set declared_at = '2026-08-01' where id = v;
  insert into public.legal_acceptances (version_id, scope, etablissement_id, shop_id, signatory_email, scope_label, terms, accepted_at)
  values ('00000000-0000-0000-0000-0000000000c9', case when p_shop is null then 'etablissement' else 'shop' end::public.legal_scope,
          p_etab, p_shop, 'g@resto.test', 'x', '{}', p_accepted);
  perform pg_temp.act('00000000-0000-0000-0000-0000000000a0');
  perform public.admin_mark_signed(v, p_etab, p_shop);
  perform pg_temp.reset();
  return v;
end;
$$;
select pg_temp.bring(:'r1', :'e', null, '2026-09-10 08:00+00') as de \gset
select pg_temp.bring(:'r2', null, :'s', '2026-09-15 08:00+00') as ds \gset
select pg_temp.bring(:'r3', :'f', null, '2026-09-10 08:00+00') as df \gset
select pg_temp.ok((select commission_from from public.commercial_clients where etablissement_id = :'e') = '2026-09-10 08:00+00',
  '4.4. début : première acceptation des CGV postérieure à la déclaration');

-- Encaissements de septembre 2026 (heure de Paris).
set local session_replication_role = replica;
update public.etablissements set payment_provider = 'demo' where id = :'f';
insert into public.orders (etablissement_id, type, status, paid_online, platform_fee_cents, created_at, order_number, customer_name, customer_phone) values
  (:'e', 'sur_place', 'servie', true, 250, '2026-09-12 12:00+02', 1, null, null),   -- compté
  (:'e', 'sur_place', 'annulee', true, 400, '2026-09-12 13:00+02', 2, null, null),  -- annulée
  (:'e', 'sur_place', 'servie', false, 300, '2026-09-12 14:00+02', 3, null, null),  -- payée au comptoir
  (:'e', 'sur_place', 'servie', true, 500, '2026-09-05 12:00+02', 4, null, null),   -- avant l'inscription
  (:'e', 'collect', 'retiree', true, 120, '2026-09-30 23:30+02', null, 'C', '06'),  -- collect, dernier soir du mois
  (:'e', 'sur_place', 'servie', true, 999, '2026-10-01 00:30+02', 5, null, null),   -- octobre à Paris
  (:'f', 'sur_place', 'servie', true, 800, '2026-09-12 12:00+02', 1, null, null);   -- paiement simulé
insert into public.shop_orders (shop_id, order_number, email, subtotal_cents, total_cents, platform_fee_cents, paid_at, payment_status) values
  (:'s', 'BS-1', 'c@x.test', 10000, 10000, 1000, '2026-09-20 10:00+02', 'refunded'),  -- remboursée, frais gardés : compté
  (:'s', 'BS-2', 'c@x.test', 7000, 7000, 700, null, 'unpaid');                         -- non payée
insert into public.club_payments (booking_id, etablissement_id, name, amount_cents, fee_cents, total_cents, method, status, paid_at, refunded_at) values
  (gen_random_uuid(), :'e', 'Invité', 2000, 200, 2200, 'en_ligne', 'payee', '2026-09-18 23:00+02', null),
  (gen_random_uuid(), :'e', 'Invité', 2000, 150, 2150, 'en_ligne', 'payee', '2026-09-18 23:00+02', '2026-09-19 10:00+02');
set local session_replication_role = origin;
insert into public.ominin_invoice_payments (etablissement_id, stripe_invoice_id, eligible_ht_cents, paid_at) values
  (:'e', 'in_ok', 2900, '2026-09-25 09:00+02'),
  (:'e', 'in_void', 4000, '2026-09-25 09:00+02');
update public.ominin_invoice_payments set voided_at = now() where stripe_invoice_id = 'in_void';

-- Recalcul à la main, septembre, frais Club exclus (réglage vide) :
--   E : Menu 250 + Collect 120 = 370 ; facture 2 900 ; Club 0 → 3 270 → 15 % = 490,5 → 491
--   S : Shop 1 000 → 150 ;  F : paiements simulés → 0.
select pg_temp.ok(
  (select jsonb_agg(jsonb_build_array(name, menu_cents, shop_cents, club_cents, invoice_cents, base_cents, commission_cents) order by name)
   from public.commercial_month_lines(:'a', '2026-09-01'))
  = '[["Bistrot E", 370, 0, 0, 2900, 3270, 491], ["Boutique S", 0, 1000, 0, 0, 1000, 150], ["Paiements simulés F", 0, 0, 0, 0, 0, 0]]'::jsonb,
  'lot 3. septembre recalculé à la main sur les cinq sources, au centime');

-- Frais Club inclus (décision n° 2) : + 200 sur E → 3 470 → 520,5 → 521.
update public.commercial_settings set club_fees_included = true;
select pg_temp.ok((select commission_cents from public.commercial_month_lines(:'a', '2026-09-01') where name = 'Bistrot E') = 521,
  'lot 3. frais Club inclus sur décision de l''admin');
update public.commercial_settings set club_fees_included = null;

-- Bornes : départ du client, fin des 24 mois, inscription non validée.
update public.crm_restaurants set client_ended_at = '2026-09-20 00:00+02' where id = :'r1';
select pg_temp.ok((select menu_cents from public.commercial_month_lines(:'a', '2026-09-01') where name = 'Bistrot E') = 250,
  '4.4. fin : bornée par le départ du client');
update public.crm_restaurants set client_ended_at = null where id = :'r1';
set local session_replication_role = replica;
insert into public.orders (etablissement_id, type, status, paid_online, platform_fee_cents, created_at, order_number) values
  (:'e', 'sur_place', 'servie', true, 11, '2028-09-09 12:00+02', 6),
  (:'e', 'sur_place', 'servie', true, 22, '2028-09-11 12:00+02', 7);
set local session_replication_role = origin;
select pg_temp.ok((select menu_cents from public.commercial_month_lines(:'a', '2028-09-01') where name = 'Bistrot E') = 11,
  '13.1. commission pendant 24 mois après l''inscription');
update public.commercial_clients set validated_at = null where shop_id = :'s';
select pg_temp.ok(not exists (select 1 from public.commercial_month_lines(:'a', '2026-09-01') where name = 'Boutique S'),
  '5.5. une inscription non validée ne compte dans aucun relevé');
update public.commercial_clients set validated_at = now() where shop_id = :'s';

-- Le relevé de septembre : brouillon, régularisation saisie, envoi.
select pg_temp.act(:'admin');
select public.admin_statement_draft(:'a', '2026-09-01') as st9 \gset
select public.admin_statement_adjust(:'st9', 'Remboursement d''une commande Menu', -15);
select public.admin_statement_send(:'st9');
select pg_temp.reset();
select pg_temp.ok(status = 'sent' and total_cents = 641 - 15 and jsonb_array_length(lines) = 3,
  '5.7. relevé envoyé, figé, régularisation comprise')
from public.commercial_statements where id = :'st9';
select pg_temp.ok(exists (select 1 from public.commercial_emails where statement_id = :'st9' and kind = 'statement' and sent_at is null),
  '8. envoi du relevé par e-mail (file)');
select pg_temp.act(:'admin');
select pg_temp.ok(pg_temp.fails(format('select public.admin_statement_adjust(%L, ''x'', 10)', :'st9')), '7.3. un relevé envoyé ne se modifie plus');
select public.admin_statement_draft(:'a', '2026-10-01') as st10 \gset
select pg_temp.reset();

-- Ce que voit le commercial : ses relevés envoyés, jamais un brouillon ; B rien.
select pg_temp.act(:'a_user');
select pg_temp.ok((select array_agg(id) from public.commercial_statements) = array[:'st9'::uuid], '7.2. A lit son relevé envoyé, pas le brouillon');
select pg_temp.ok((public.commercial_money() -> 'statements' -> 0 ->> 'total_cents')::int = 626, '5.7. Argent : relevé');
-- Facture, détail, contestation.
select pg_temp.ok(pg_temp.fails(format('select public.commercial_statement_invoice(%L, ''autre/factures/f.pdf'')', :'st9')), '5.7. facture hors de son dossier refusée');
select public.commercial_statement_invoice(:'st9', :'a' || '/factures/septembre.pdf');
select public.commercial_request_detail(:'st9');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_request_detail(%L)', :'st9')), '5.7. détail : une fois par trimestre');
select public.commercial_contest(:'st9', 'La commande du 12 manque');
select pg_temp.act(:'b_user');
select pg_temp.ok((select count(*) from public.commercial_statements) = 0, '7.2. B ne lit pas les relevés de A');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_contest(%L, ''x'')', :'st9')), '7.2. B ne conteste pas pour A');
select pg_temp.reset();
select pg_temp.ok(status = 'contested' and invoice_received_at is not null and detail_requested_at is not null,
  '5.7. facturé, détail demandé, contesté')
from public.commercial_statements where id = :'st9';
select pg_temp.ok((select (s ->> 'payment_due')::timestamptz = (s ->> 'invoice_received_at')::timestamptz + interval '30 days'
  and (s ->> 'detail_due')::timestamptz = (s ->> 'detail_requested_at')::timestamptz + interval '15 days'
  from jsonb_array_elements((select public.commercial_money() from (select pg_temp.act(:'a_user')) x) -> 'statements') s), '5.7. échéances : paiement 30 jours, détail 15 jours');
select pg_temp.reset();
select pg_temp.act(:'admin');
select public.admin_statement_detail_sent(:'st9');
select public.admin_statement_paid(:'st9');
select pg_temp.reset();
select pg_temp.ok(paid_at is not null and detail_sent_at is not null, '6. payé, détail envoyé')
from public.commercial_statements where id = :'st9';
-- Contestation hors délai refusée.
update public.commercial_statements set sent_at = now() - interval '4 months', status = 'sent' where id = :'st9';
select pg_temp.act(:'a_user');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_contest(%L, ''trop tard'')', :'st9')), '5.7. contestation sous 3 mois');
select pg_temp.reset();
update public.commercial_statements set sent_at = now() where id = :'st9';

-- Ce que la base apprend après coup : la facture de septembre est annulée.
-- Septembre recalculé : E 370 → 55,5 → 56 ; S 150 → 206, contre 641 relevés.
update public.ominin_invoice_payments set voided_at = now() where stripe_invoice_id = 'in_ok';
select pg_temp.act(:'admin');
select public.admin_statement_draft(:'a', '2026-10-01');
select pg_temp.reset();
select pg_temp.ok(adjustments @> '[{"auto": true, "cents": -435, "month": "2026-09-01"}]'::jsonb,
  '4.4. régularisation automatique du mois figé, avec son mois d''origine')
from public.commercial_statements where id = :'st10';
select pg_temp.act(:'admin');
select public.admin_statement_send(:'st10');
select public.admin_statement_draft(:'a', '2026-11-01') as st11 \gset
select pg_temp.reset();
select pg_temp.ok(not (adjustments @> '[{"month": "2026-09-01"}]'::jsonb), '4.4. une régularisation ne se répète pas')
from public.commercial_statements where id = :'st11';

-- Estimation du mois en cours (octobre) : E 999 → 149,85 → 150.
select pg_temp.act(:'a_user');
select pg_temp.ok((select (l ->> 'commission_cents')::int from jsonb_array_elements(public.commercial_month_estimate() -> 'lines') l
  where l ->> 'name' = 'Bistrot E') = 150, '5.7. estimation du mois en cours');
-- Écran Clients : ce que le client a rapporté ce mois-ci, intégration.
select pg_temp.ok((select (c ->> 'base_cents')::int from jsonb_array_elements(public.commercial_my_clients()) c
  where c ->> 'name' = 'Bistrot E') = 999, '5.6. Clients : l''assiette du mois, jamais le chiffre d''affaires');
select pg_temp.reset();

-- URSSAF (art. 2.5) : due au seuil, levée par le dépôt.
-- Relevés envoyés : septembre 626, octobre 150 - 435 = -285, soit 341.
update public.commercial_settings set urssaf_threshold_cents = 341;
select pg_temp.ok(public.commercial_urssaf_due(:'a'), '5.8. attestation URSSAF due au seuil');
select pg_temp.act(:'a_user');
select public.commercial_add_document('urssaf', :'a' || '/pieces/urssaf.pdf');
select pg_temp.reset();
select pg_temp.ok(not public.commercial_urssaf_due(:'a'), '5.8. due de nouveau tous les six mois seulement');

-- Encaissement hors Stripe saisi par l'admin.
select pg_temp.act(:'admin');
select public.admin_record_payment(:'e', null, 1000, '2026-11-05 10:00+01', 'Commission de novembre réglée par SumUp');
select pg_temp.act(:'a_user');
select pg_temp.ok(pg_temp.fails('select public.admin_record_payment(null, null, 1, now(), ''x'')'), '6. saisie réservée à l''admin');
select pg_temp.reset();
select pg_temp.ok((select invoice_cents from public.commercial_month_lines(:'a', '2026-11-01') where name = 'Bistrot E') = 1000,
  '4.4. encaissement hors Stripe dans l''assiette');

rollback;
