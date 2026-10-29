-- Le contrat et ce qui en découle : deck, pièces, notifications, option,
-- terme et résiliation ; relevés de chaque mois, régularisation relevée une
-- fois ; départ d'un client posé, corrigé, annulé.
begin;
\i /work/tests/fixtures.inc

-- Un Client Apporté né d'une inscription, commission depuis p_from (un même
-- établissement peut revenir par un autre commercial : l'inscription n'en
-- garde pas le lien unique).
create function pg_temp.client(p_commercial uuid, p_restaurant uuid, p_etab uuid, p_from timestamptz) returns uuid language plpgsql as $$
declare
  v_signup uuid;
  v uuid;
begin
  insert into public.commercial_signups (restaurant_id, commercial_id, finished_at)
  values (p_restaurant, p_commercial, p_from)
  returning id into v_signup;
  insert into public.commercial_clients (commercial_id, restaurant_id, signup_id, etablissement_id, commission_from, validated_at)
  values (p_commercial, p_restaurant, v_signup, p_etab, p_from, p_from)
  returning id into v;
  return v;
end;
$$;
create function pg_temp.etab(p_n int, p_name text) returns uuid language sql as $$
  insert into public.etablissements (id, slug, name, tagline, address, phone, hours)
  values (('00000000-0000-0000-0000-0000000e70' || lpad(p_n::text, 2, '0'))::uuid, 'etab-' || p_n, p_name, '', '', '', '')
  returning id;
$$;

-- ===========================================================================
-- Deck du Kit : réservé au contrat signé et en cours ; Argent reste ouvert.
insert into storage.objects (bucket_id, name) values ('commercial-docs', 'kit/deck.pdf');
select pg_temp.act(:'c_user');
select pg_temp.ok((select count(*) from storage.objects where name = 'kit/deck.pdf') = 0, 'deck : invité non signé, rien');
select pg_temp.act(:'a_user');
select pg_temp.ok((select count(*) from storage.objects where name = 'kit/deck.pdf') = 1, 'deck : contrat signé en cours');
select pg_temp.ok((public.commercial_account() ->> 'signed_in_force')::boolean
  and jsonb_typeof(public.commercial_account() -> 'kit_demo_slugs') = 'array', 'compte : contrat en vigueur et démos du Kit');
select pg_temp.act(:'d_user');
select pg_temp.ok((select count(*) from storage.objects where name = 'kit/deck.pdf') = 0, 'deck : contrat terminé, fermé');
select pg_temp.ok(not pg_temp.fails('select public.commercial_money()') and (public.commercial_account() ->> 'ended')::boolean,
  'contrat terminé : Argent ouvert');
select pg_temp.reset();

-- Une pièce déposée ne se réécrit pas.
insert into storage.objects (bucket_id, name) values ('commercial-docs', :'b' || '/factures/f1.pdf');
select pg_temp.act(:'b_user');
select pg_temp.ok((select count(*) from storage.objects where name = :'b' || '/factures/f1.pdf') = 1, 'pièces : B lit sa facture');
with changed as (update storage.objects set metadata = '{"x": 1}' where name = :'b' || '/factures/f1.pdf' returning 1)
select pg_temp.ok((select count(*) from changed) = 0, 'pièces : … mais ne la réécrit pas');
select pg_temp.reset();

-- Notifications : seul le relevé disponible se règle.
select pg_temp.act(:'a_user');
select public.commercial_set_push_prefs('{"releve": false}');
select pg_temp.ok(pg_temp.fails('select public.commercial_set_push_prefs(''{"relance": true}'')'), 'notifications : clé inconnue refusée');
select pg_temp.reset();
select pg_temp.ok((select push_prefs from public.commerciaux where id = :'a') = '{"releve": false}', 'notifications : préférence gardée');
select pg_temp.ok(pg_temp.fails(format('insert into public.commercial_emails (commercial_id, kind) values (%L, ''confirmed'')', :'a')),
  'e-mails : seuls ceux des relevés et de l''URSSAF');

-- ===========================================================================
-- Option (art. 3.3) : rappel une fois, contrats signés en cours seulement.
update public.commercial_settings set option_reminder_days = 10000;
select pg_temp.act_service();
select pg_temp.ok((select array_agg(id order by id) from public.commercial_option_reminders()) = array[:'a', :'b']::uuid[],
  'option : rappel des seuls contrats en cours');
select pg_temp.ok(not exists (select 1 from public.commercial_option_reminders()), 'option : … une fois');
select pg_temp.reset();

-- Terme sans option : la fin s'écrit ; les appareils d'un contrat fini ne
-- reçoivent plus rien.
insert into public.commercial_push_subscriptions (commercial_id, endpoint, p256dh, auth) values
  (:'d', 'https://push.test/d', 'k', 'a'), (:'a', 'https://push.test/a', 'k', 'a');
update public.legal_acceptances set accepted_at = now() - interval '25 months' where commercial_id = :'b';
select pg_temp.act_service();
select pg_temp.ok(public.commercial_release_ended() = 1, 'terme : un contrat arrivé à son terme');
select pg_temp.reset();
select pg_temp.ok(end_reason = 'term' and ended_at = (select accepted_at from public.legal_acceptances where commercial_id = :'b') + interval '24 months',
  'terme : fin de contrat écrite depuis la signature')
from public.commerciaux where id = :'b';
select pg_temp.ok((select array_agg(commercial_id) from public.commercial_push_subscriptions) = array[:'a']::uuid[],
  'terme : abonnements push d''un contrat terminé retirés, les autres gardés');
update public.commerciaux set ended_at = null, end_reason = null where id = :'b';
update public.legal_acceptances set accepted_at = now() - interval '20 days' where commercial_id = :'b';

-- ===========================================================================
-- Relevés : chaque mois porteur de commission a son brouillon, une fois.
select pg_temp.etab(6, 'Six Pieds') as e6 \gset
select pg_temp.client(:'a', :'r6', :'e6', now() - interval '120 days');
select pg_temp.act(:'admin');
select public.admin_record_payment(:'e6', null, 10000, now() - interval '100 days', 'm-3');
select public.admin_record_payment(:'e6', null, 10000, now() - interval '70 days', 'm-2');
select public.admin_record_payment(:'e6', null, 10000, now() - interval '40 days', 'm-1');
select pg_temp.reset();
select public.commercial_draft_statements();
select pg_temp.ok((select sum(total_cents) from public.commercial_statements where commercial_id = :'a') = 4500,
  'relevés : commission des trois mois relevée (4 500), aucun mois perdu');
select public.commercial_draft_statements();
select pg_temp.ok((select sum(total_cents) from public.commercial_statements where commercial_id = :'a') = 4500,
  'relevés : … et jamais deux fois');

-- Deux brouillons portent la même régularisation : à l'envoi, chacun est
-- recalculé, elle n'est relevée qu'une fois.
select pg_temp.etab(24, 'Vingt Quatre') as e24 \gset
select pg_temp.client(:'b', :'r4', :'e24', now() - interval '200 days');
select (date_trunc('month', now() at time zone 'Europe/Paris') - interval '1 month')::date as m1 \gset
select (date_trunc('month', now() at time zone 'Europe/Paris') - interval '2 month')::date as m2 \gset
select (date_trunc('month', now() at time zone 'Europe/Paris') - interval '3 month')::date as m3 \gset
select pg_temp.act(:'admin');
select public.admin_record_payment(:'e24', null, 10000, (:'m3'::timestamp + interval '14 days 12 hours') at time zone 'Europe/Paris', 'm3');
select public.admin_statement_send(public.admin_statement_draft(:'b', :'m3'));
select public.admin_record_payment(:'e24', null, 10000, (:'m3'::timestamp + interval '20 days 12 hours') at time zone 'Europe/Paris', 'm3 tardif');
select public.admin_record_payment(:'e24', null, 20000, (:'m2'::timestamp + interval '14 days 12 hours') at time zone 'Europe/Paris', 'm2');
select pg_temp.reset();
select public.commercial_draft_statements();
select pg_temp.act(:'admin');
select public.admin_statement_send((select id from public.commercial_statements where commercial_id = :'b' and month = :'m1'));
select public.admin_statement_send((select id from public.commercial_statements where commercial_id = :'b' and month = :'m2'));
select pg_temp.reset();
select pg_temp.ok((select sum(total_cents) from public.commercial_statements where commercial_id = :'b' and status <> 'draft') = 6000,
  'relevés : régularisation relevée une seule fois (m3 1 500 + m3 tardif 1 500 + m2 3 000 = 6 000)');

-- Deux demandes de détail sur le même relevé : chacune se marque envoyée.
select id as st from public.commercial_statements where commercial_id = :'b' and month = :'m3' \gset
select pg_temp.act(:'b_user');
select public.commercial_request_detail(:'st');
select pg_temp.act(:'admin');
select public.admin_statement_detail_sent(:'st');
select pg_temp.reset();
update public.commercial_statements set detail_requested_at = now() - interval '4 months', detail_sent_at = now() - interval '4 months' where id = :'st';
select pg_temp.act(:'b_user');
select public.commercial_request_detail(:'st');
select pg_temp.act(:'admin');
select pg_temp.ok(not pg_temp.fails(format('select public.admin_statement_detail_sent(%L)', :'st')), 'détail : seconde demande marquée envoyée');
select pg_temp.reset();

-- ===========================================================================
-- Départ posé par erreur : corrigé puis annulé, Client Apporté rouvert.
select pg_temp.etab(7, 'Sept Mers') as e7 \gset
update public.crm_restaurants set etablissement_id = :'e7' where id = :'r7';
select pg_temp.client(:'a', :'r7', :'e7', now() - interval '90 days') as c7 \gset
select pg_temp.act(:'admin');
select public.admin_set_client_ended(:'r7', now() - interval '60 days');
select public.admin_set_client_ended(:'r7', now() - interval '5 days');
select pg_temp.reset();
select pg_temp.ok((select ended_at from public.commercial_clients where id = :'c7') = now() - interval '5 days',
  'départ : date corrigée, la fin du Client Apporté suit');
select pg_temp.act(:'a_user');
select pg_temp.ok(pg_temp.fails(format('select public.admin_cancel_client_departure(%L)', :'r7')), 'départ : annulation réservée à l''admin');
select pg_temp.act(:'admin');
select public.admin_cancel_client_departure(:'r7');
select pg_temp.reset();
select pg_temp.ok((select ended_at is null from public.commercial_clients where id = :'c7')
  and (select client_ended_at is null from public.crm_restaurants where id = :'r7'), 'départ annulé : Client Apporté rouvert, fiche cliente');

-- Corriger un départ ne ferme que ce qu'il avait clos ; un client revenu par
-- un autre commercial garde son départ.
select pg_temp.etab(9, 'Neuf Lunes') as e9 \gset
update public.crm_restaurants set etablissement_id = :'e9' where id = :'r9';
select pg_temp.client(:'a', :'r9', :'e9', now() - interval '290 days') as c9a \gset
select pg_temp.act(:'admin');
select public.admin_set_client_ended(:'r9', now() - interval '100 days');
select pg_temp.reset();
select pg_temp.client(:'b', :'r8', :'e9', now() - interval '40 days') as c9b \gset
select pg_temp.act(:'admin');
select public.admin_set_client_ended(:'r9', now() - interval '99 days');
select pg_temp.ok(pg_temp.fails(format('select public.admin_cancel_client_departure(%L)', :'r9')),
  'départ : un client revenu par un autre commercial ne s''annule plus');
select pg_temp.reset();
select pg_temp.ok((select ended_at from public.commercial_clients where id = :'c9a') = now() - interval '99 days'
  and (select ended_at is null from public.commercial_clients where id = :'c9b'),
  'départ corrigé : la fin de A suit, le Client Apporté de B reste ouvert');

-- ===========================================================================
-- Résiliation par le commercial (art. 7.2), avec le préavis, une fois.
select pg_temp.act(:'a_user');
select public.commercial_resign() as fin \gset
select pg_temp.ok(pg_temp.fails('select public.commercial_resign()'), 'résiliation : une fois');
select pg_temp.reset();
select pg_temp.ok(end_reason = 'resignation' and notice_given_at is not null and ended_at = :'fin'::timestamptz
  and ended_at = now() + make_interval(months => (select notice_months from public.commercial_settings)),
  'résiliation : fin au terme du préavis')
from public.commerciaux where id = :'a';

rollback;
