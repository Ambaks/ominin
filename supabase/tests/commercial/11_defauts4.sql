-- Quatrième passage de vérification : chaque défaut corrigé côté base,
-- rejoué (E1 à E11, F6, F7), et les relances J+n.
begin;
\i /work/tests/fixtures.inc
update public.commercial_settings set signup_link_days = 30, declaration_cap = null, cooldown_days = null;
\set cgv '00000000-0000-0000-0000-0000000000c8'
insert into public.legal_versions (id, doc, version, effective_from, body_sha256, summary)
values (:'cgv', 'cgv', 'cgv-t', now() - interval '400 days', 'z', 'cgv');

create function pg_temp.gerant(p_n int, p_name text) returns uuid language plpgsql as $$
begin
  insert into auth.users (id, email) values (('00000000-0000-0000-0000-00000000ff' || lpad(p_n::text, 2, '0'))::uuid, 'g' || p_n || '@resto.test');
  insert into public.etablissements (id, slug, name, tagline, address, phone, hours)
  values (('00000000-0000-0000-0000-0000000eff' || lpad(p_n::text, 2, '0'))::uuid, 'etab-' || p_n, p_name, '', '', '', '');
  return ('00000000-0000-0000-0000-0000000eff' || lpad(p_n::text, 2, '0'))::uuid;
end;
$$;
create function pg_temp.accept(p_n int, p_at timestamptz) returns void language sql as $$
  insert into public.legal_acceptances (version_id, scope, etablissement_id, user_id, signatory_email, scope_label, terms, accepted_at)
  values ('00000000-0000-0000-0000-0000000000c8', 'etablissement', ('00000000-0000-0000-0000-0000000eff' || lpad(p_n::text, 2, '0'))::uuid,
          ('00000000-0000-0000-0000-00000000ff' || lpad(p_n::text, 2, '0'))::uuid, 'g@resto.test', 'x', '{}', p_at);
$$;
create function pg_temp.fiche(p_n int, p_name text) returns uuid language sql as $$
  insert into public.crm_restaurants (id, name, slug, city)
  values (('00000000-0000-0000-0000-000000000c' || lpad(p_n::text, 2, '0'))::uuid, p_name, 'c' || p_n, 'Montpellier')
  returning id;
$$;
-- Déclaration datée, confirmée, lien ouvert par le gérant n, CGV acceptées.
create function pg_temp.sign(p_user uuid, p_restaurant uuid, p_declared timestamptz, p_n int, p_accepted timestamptz)
returns uuid language plpgsql as $$
declare
  v uuid;
  t text;
begin
  perform pg_temp.act(p_user);
  v := (public.commercial_declare(p_restaurant, '{menu}', '{"role": "Gérant"}') ->> 'id')::uuid;
  perform pg_temp.reset();
  update public.commercial_declarations set declared_at = p_declared where id = v;
  perform pg_temp.act('00000000-0000-0000-0000-0000000000a0');
  perform public.admin_decide_declaration(v, 'confirm', null);
  perform pg_temp.act(p_user);
  t := public.commercial_signup_link(v);
  perform pg_temp.act(('00000000-0000-0000-0000-00000000ff' || lpad(p_n::text, 2, '0'))::uuid);
  perform public.signup_link_claim(t, 'menu');
  perform pg_temp.reset();
  perform pg_temp.accept(p_n, p_accepted);
  return v;
end;
$$;

-- ===========================================================================
-- E4. Deux brouillons portent la même régularisation : à l'envoi, chacun est
-- recalculé, elle n'est relevée qu'une fois.
select pg_temp.gerant(24, 'Vingt Quatre') as e24 \gset
select pg_temp.fiche(24, 'Vingt Quatre') as f24 \gset
select pg_temp.sign(:'a_user', :'f24', now() - interval '200 days', 24, now() - interval '190 days') as e4d \gset
select (date_trunc('month', now() at time zone 'Europe/Paris') - interval '1 month')::date as m1 \gset
select (date_trunc('month', now() at time zone 'Europe/Paris') - interval '2 month')::date as m2 \gset
select (date_trunc('month', now() at time zone 'Europe/Paris') - interval '3 month')::date as m3 \gset
select pg_temp.act(:'admin');
select public.admin_record_payment(:'e24', null, 10000, (:'m3'::timestamp + interval '14 days 12 hours') at time zone 'Europe/Paris', 'm3');
select public.admin_statement_send(public.admin_statement_draft(:'a', :'m3'));
select public.admin_record_payment(:'e24', null, 10000, (:'m3'::timestamp + interval '20 days 12 hours') at time zone 'Europe/Paris', 'm3 tardif');
select public.admin_record_payment(:'e24', null, 20000, (:'m2'::timestamp + interval '14 days 12 hours') at time zone 'Europe/Paris', 'm2');
select pg_temp.reset();
select public.commercial_draft_statements();
select pg_temp.act(:'admin');
select public.admin_statement_send((select id from public.commercial_statements where commercial_id = :'a' and month = :'m1'));
select public.admin_statement_send((select id from public.commercial_statements where commercial_id = :'a' and month = :'m2'));
select pg_temp.reset();
select pg_temp.ok((select sum(total_cents) from public.commercial_statements where commercial_id = :'a' and status <> 'draft') = 6000,
  'E4. régularisation relevée une seule fois (m3 1 500 + m3 tardif 1 500 + m2 3 000 = 6 000)');

-- ===========================================================================
-- E7. Client en service jamais parti, marqué signé : refusé.
select pg_temp.gerant(25, 'Sept Mers') as e25 \gset
select pg_temp.accept(25, now() - interval '300 days');
select pg_temp.act(:'b_user');
select (public.commercial_declare(:'r7', '{menu}', :'contact') ->> 'id') as e7d \gset
select pg_temp.act(:'admin');
select public.admin_decide_declaration(:'e7d', 'confirm', null);
select pg_temp.ok(pg_temp.fails(format('select public.admin_mark_signed(%L, %L)', :'e7d', :'e25')),
  'E7. client en service jamais parti : « marquer signée » refusé');
select pg_temp.reset();
select pg_temp.ok(not exists (select 1 from public.commercial_clients where declaration_id = :'e7d'), 'E7. … aucun Client Apporté');

-- ===========================================================================
-- E1, E2. Client parti et redéclaré par B.
select pg_temp.gerant(26, 'Huit Clos') as e26 \gset
select pg_temp.sign(:'a_user', :'r8', now() - interval '300 days', 26, now() - interval '290 days') as e1a \gset
select pg_temp.act(:'admin');
select public.admin_set_client_ended(:'r8', now() - interval '100 days');
select pg_temp.act(:'b_user');
select (public.commercial_declare(:'r8', '{menu}', :'contact') ->> 'id') as e1b \gset
select pg_temp.act(:'admin');
select pg_temp.ok(pg_temp.fails(format('select public.admin_link_client(%L, %L)', :'r8', :'e26')),
  'E1. l''outil de rattachement ne passe pas par-dessus une déclaration');
select public.admin_cancel_client_departure(:'r8');
select pg_temp.reset();
select pg_temp.ok((select status::text || '/' || end_reason::text from public.commercial_declarations where id = :'e1b') = 'abandoned/client'
  and exists (select 1 from public.commercial_emails where declaration_id = :'e1b' and kind = 'released' and detail = 'client'),
  'E2. départ annulé pendant une redéclaration : réservation de B close (client), B prévenu');
select pg_temp.act(:'b_user');
select pg_temp.ok((public.commercial_restaurant(:'r8') -> 'mine') = 'null'::jsonb
  and jsonb_array_length(public.commercial_restaurant(:'r8') -> 'contacts') = 0, 'E2. … plus d''accès aux interlocuteurs');
select pg_temp.reset();

-- ===========================================================================
-- E11. Corriger un départ ne ferme que ce qu'il avait clos.
select pg_temp.gerant(31, 'Neuf Lunes') as e31 \gset
select pg_temp.sign(:'a_user', :'r9', now() - interval '300 days', 31, now() - interval '290 days') as e11a \gset
select pg_temp.act(:'admin');
select public.admin_set_client_ended(:'r9', now() - interval '100 days');
select pg_temp.reset();
select pg_temp.fiche(31, 'Neuf Lunes') as f31 \gset
select pg_temp.sign(:'b_user', :'f31', now() - interval '50 days', 31, now() - interval '40 days') as e11b \gset
select pg_temp.act(:'admin');
select public.admin_validate_client((select id from public.commercial_clients where declaration_id = :'e11b'));
select public.admin_set_client_ended(:'r9', now() - interval '99 days');
select pg_temp.reset();
select pg_temp.ok((select ended_at from public.commercial_clients where declaration_id = :'e11a') = now() - interval '99 days'
  and (select ended_at is null from public.commercial_clients where declaration_id = :'e11b'),
  'E11. correction du départ : la fin de A suit, le Client Apporté de B reste ouvert');

-- ===========================================================================
-- E6. Confirmation tacite d'un contrat terminé : libérée, jamais confirmée.
select pg_temp.act(:'b_user');
select (public.commercial_declare(:'r5', '{menu}', :'contact') ->> 'id') as e6d \gset
select pg_temp.reset();
update public.commercial_declarations set declared_at = now() - interval '10 days', confirm_deadline = now() - interval '3 days' where id = :'e6d';
update public.commerciaux set ended_at = now() - interval '1 hour', end_reason = 'mutual' where id = :'b';
select pg_temp.act_service();
select public.commercial_confirm_due();
select pg_temp.reset();
select pg_temp.ok((select status::text || '/' || end_reason::text from public.commercial_declarations where id = :'e6d') = 'abandoned/contract_ended'
  and not exists (select 1 from public.commercial_emails where declaration_id = :'e6d' and kind = 'confirmed'),
  'E6. contrat terminé : déclaration libérée sans e-mail « confirmée »');
update public.commerciaux set ended_at = null, end_reason = null where id = :'b';

-- ===========================================================================
-- Démos : un non-titulaire est refusé, même sans aucune demande en base.
delete from public.commercial_demo_requests;
select pg_temp.act(:'b_user');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_demo_requests_of(%L)', :'e1a')), 'Démos. lecture refusée hors de sa déclaration');
select pg_temp.reset();

-- Interlocuteur saisi par un autre commercial : message juste.
select pg_temp.act(:'a_user');
select (public.commercial_declare(:'r6', '{menu}', :'contact') ->> 'id') as c6a \gset
select public.commercial_contact_upsert(:'c6a', '{"first_name": "Lina", "role": "Gérant"}') as c6c \gset
select public.commercial_abandon(:'c6a', 'not_interested');
select pg_temp.act(:'b_user');
select (public.commercial_declare(:'r6', '{menu}', :'contact') ->> 'id') as c6b \gset
select pg_temp.reset();
create function pg_temp.message(p_sql text) returns text language plpgsql as $$
begin
  execute p_sql;
  return 'passe';
exception when others then
  return sqlerrm;
end;
$$;
select pg_temp.act(:'b_user');
select pg_temp.ok(pg_temp.message(format('select public.commercial_contact_upsert(%L, %L)', :'c6b',
  json_build_object('id', :'c6c', 'first_name', 'Lina', 'role', 'Autre'))) like '%saisi par un commercial%',
  'Interlocuteurs. saisi par un autre commercial : le message le dit');
select pg_temp.reset();

-- ===========================================================================
-- F6, F7. Relances J+n : rendez-vous noté « fait », le jour de l'échéance,
-- une fois ; retirées s'il est annulé ou manqué ; réglage normalisé.
update public.commercial_settings set followup_days = '{7,1,1,14}';
select pg_temp.ok((select followup_days from public.commercial_settings) = '{1,7,14}', 'F7. réglage dédoublonné et trié');
select (date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris') as today \gset
select pg_temp.act(:'a_user');
select (public.commercial_declare(:'r1', '{menu}', :'contact') ->> 'id') as fd \gset
select pg_temp.reset();
insert into public.crm_appointments (id, restaurant_id, title, start_at, declaration_id, status) values
  ('00000000-0000-0000-0000-0000000a9001', :'r1', 'Hier fait', :'today'::timestamptz - interval '1 day' + interval '10 hours', :'fd', 'completed'),
  ('00000000-0000-0000-0000-0000000a9002', :'r1', 'Hier non noté', :'today'::timestamptz - interval '1 day' + interval '11 hours', :'fd', 'scheduled'),
  ('00000000-0000-0000-0000-0000000a9003', :'r1', 'Noté après coup', :'today'::timestamptz - interval '20 days' + interval '10 hours', :'fd', 'completed'),
  ('00000000-0000-0000-0000-0000000a9004', :'r1', 'Il y a une semaine', :'today'::timestamptz - interval '7 days' + interval '9 hours', :'fd', 'completed');
select pg_temp.act_service();
select pg_temp.ok(public.commercial_appointment_followups() = 2,
  'F6. relances du jour seulement, pour un rendez-vous fait : J+1 d''hier, J+7 d''il y a une semaine');
select pg_temp.ok(public.commercial_appointment_followups() = 0, 'F7. une seule fois');
select pg_temp.reset();
select pg_temp.ok((select array_agg(title order by title) from public.crm_tasks where followup_of is not null)
  = array['Relance J+1 · Hier fait', 'Relance J+7 · Il y a une semaine'],
  'F6. rien pour un rendez-vous non noté fait ni pour des échéances passées');
select pg_temp.act(:'a_user');
select public.commercial_appointment_upsert(:'fd', '{"id": "00000000-0000-0000-0000-0000000a9001", "status": "cancelled"}');
select pg_temp.reset();
select pg_temp.ok(not exists (select 1 from public.crm_tasks where followup_of = '00000000-0000-0000-0000-0000000a9001'),
  'F6. rendez-vous annulé ensuite : sa relance pas encore faite disparaît');
select pg_temp.act(:'a_user');
select public.commercial_appointment_upsert(:'fd', '{"id": "00000000-0000-0000-0000-0000000a9004", "status": "no_show"}');
select pg_temp.reset();
select pg_temp.ok(not exists (select 1 from public.crm_tasks where followup_of = '00000000-0000-0000-0000-0000000a9004'),
  'F6. rendez-vous manqué ensuite : idem');

rollback;
