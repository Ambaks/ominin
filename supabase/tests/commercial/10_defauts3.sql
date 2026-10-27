-- Troisième passage de vérification : chaque défaut corrigé côté base,
-- rejoué (B1 bis à C6), et les relances J+n après un rendez-vous.
begin;
\i /work/tests/fixtures.inc
update public.commercial_settings set signup_link_days = 30, declaration_cap = null, cooldown_days = null;
\set cgv '00000000-0000-0000-0000-0000000000c8'
insert into public.legal_versions (id, doc, version, effective_from, body_sha256, summary)
values (:'cgv', 'cgv', 'cgv-t', now() - interval '400 days', 'z', 'cgv');

-- Signature par lien : déclaration (datée), confirmation, lien, gérant, CGV.
create function pg_temp.sign(p_user uuid, p_restaurant uuid, p_declared timestamptz, p_gerant uuid,
                             p_etab uuid, p_accepted timestamptz) returns uuid language plpgsql as $$
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
  perform pg_temp.act(p_gerant);
  perform public.signup_link_claim(t, 'menu');
  perform pg_temp.reset();
  insert into public.legal_acceptances (version_id, scope, etablissement_id, user_id, signatory_email, scope_label, terms, accepted_at)
  values ('00000000-0000-0000-0000-0000000000c8', 'etablissement', p_etab, p_gerant, 'g@resto.test', 'x', '{}', p_accepted);
  return v;
end;
$$;
create function pg_temp.gerant(p_n int, p_name text) returns uuid language plpgsql as $$
begin
  insert into auth.users (id, email) values (('00000000-0000-0000-0000-00000000ff' || lpad(p_n::text, 2, '0'))::uuid, 'g' || p_n || '@resto.test');
  insert into public.etablissements (id, slug, name, tagline, address, phone, hours)
  values (('00000000-0000-0000-0000-0000000eff' || lpad(p_n::text, 2, '0'))::uuid, 'etab-' || p_n, p_name, '', '', '', '');
  return ('00000000-0000-0000-0000-0000000eff' || lpad(p_n::text, 2, '0'))::uuid;
end;
$$;
create function pg_temp.fiche(p_n int, p_name text) returns uuid language sql as $$
  insert into public.crm_restaurants (id, name, slug, city)
  values (('00000000-0000-0000-0000-000000000d' || lpad(p_n::text, 2, '0'))::uuid, p_name, 'f' || p_n, 'Montpellier')
  returning id;
$$;

-- ===========================================================================
-- B1 bis. Le commercial lit sa demande de démo et le lien livré.
select pg_temp.act(:'a_user');
select (public.commercial_declare(:'r1', '{menu}', :'contact') ->> 'id') as d1 \gset
select pg_temp.act(:'admin');
select public.admin_decide_declaration(:'d1', 'confirm', null);
select pg_temp.act(:'a_user');
select public.commercial_request_demo(:'d1', 'couleurs', '{}') as q1 \gset
select pg_temp.ok(jsonb_array_length(public.commercial_demo_requests_of(:'d1')) = 1, 'B1 bis. A lit sa demande de démo');
select pg_temp.act(:'admin');
select public.admin_deliver_demo(:'q1', 'https://menu.test/demo/r1');
select pg_temp.act(:'a_user');
select pg_temp.ok((public.commercial_demo_requests_of(:'d1') -> 0 ->> 'demo_url') = 'https://menu.test/demo/r1', 'B1 bis. … et le lien de la démo livrée');
select pg_temp.act(:'b_user');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_demo_requests_of(%L)', :'d1')), 'B1 bis. B ne lit pas les demandes de A');
select pg_temp.reset();

-- ===========================================================================
-- B2. Fiche réservée fusionnée dans une fiche en opposition : réservation close,
-- titulaire prévenu (e-mail et push), Léa ne la voit plus réservée.
select pg_temp.act(:'b_user');
select (public.commercial_declare(:'r2', '{menu}', :'contact') ->> 'id') as d2 \gset
select pg_temp.act(:'admin');
select public.admin_merge_restaurants(:'r_optout', :'r2', 'doublon');
select pg_temp.reset();
select pg_temp.ok((select status::text || '/' || end_reason::text from public.commercial_declarations where id = :'d2') = 'abandoned/opposition'
  and exists (select 1 from public.commercial_emails where declaration_id = :'d2' and kind = 'opposition')
  and not public.crm_is_reserved(:'r_optout'), 'B2. fusion dans une fiche opposée : réservation close pour opposition, B prévenu');

-- C4. Fiche réservée fusionnée dans une fiche cliente : close (motif client), plus d'accès.
select pg_temp.act(:'a_user');
select (public.commercial_declare(:'r3', '{menu}', :'contact') ->> 'id') as d3 \gset
select pg_temp.act(:'admin');
select public.admin_merge_restaurants(:'rc_link', :'r3', 'doublon');
select pg_temp.reset();
select pg_temp.ok((select status::text || '/' || end_reason::text from public.commercial_declarations where id = :'d3') = 'abandoned/client'
  and exists (select 1 from public.commercial_emails where declaration_id = :'d3' and kind = 'released' and detail = 'client'),
  'C4. fusion dans une fiche cliente : réservation close (client), A prévenu');
select pg_temp.act(:'a_user');
select pg_temp.ok((public.commercial_restaurant(:'rc_link') -> 'mine') = 'null'::jsonb
  and jsonb_array_length(public.commercial_restaurant(:'rc_link') -> 'contacts') = 0, 'C4. … plus d''accès aux interlocuteurs');
select pg_temp.reset();

-- ===========================================================================
-- B3. Contrat terminé avant la tâche quotidienne : lien mort, rien d'attribué.
select pg_temp.gerant(1, 'Quatre Vents') as e1 \gset
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000ff51', 'g51@resto.test');
select pg_temp.act(:'b_user');
select (public.commercial_declare(:'r4', '{menu}', :'contact') ->> 'id') as d4 \gset
select pg_temp.act(:'admin');
select public.admin_decide_declaration(:'d4', 'confirm', null);
select pg_temp.act(:'b_user');
select public.commercial_signup_link(:'d4') as tok4 \gset
select pg_temp.act('00000000-0000-0000-0000-00000000ff01');
select public.signup_link_claim(:'tok4', 'menu');
select pg_temp.reset();
update public.commerciaux set ended_at = now() - interval '2 hours', end_reason = 'mutual' where id = :'b';
select pg_temp.ok(public.signup_link_info(:'tok4') is null, 'B3. contrat terminé : le lien ne vaut plus');
insert into public.legal_acceptances (version_id, scope, etablissement_id, user_id, signatory_email, scope_label, terms, accepted_at)
values (:'cgv', 'etablissement', :'e1', '00000000-0000-0000-0000-00000000ff01', 'g1@resto.test', 'x', '{}', now());
select pg_temp.ok(not exists (select 1 from public.commercial_clients where declaration_id = :'d4')
  and (select status from public.commercial_declarations where id = :'d4') = 'confirmed',
  'B3. … une acceptation des CGV ne lui attribue rien');
-- C3. L'admin ne confirme pas la déclaration d'un contrat terminé.
update public.commerciaux set ended_at = null, end_reason = null where id = :'b';
select pg_temp.act(:'b_user');
select (public.commercial_declare(:'r5', '{menu}', :'contact') ->> 'id') as d5 \gset
select pg_temp.reset();
update public.commerciaux set ended_at = now() - interval '1 hour', end_reason = 'mutual' where id = :'b';
select pg_temp.act(:'admin');
select pg_temp.ok(pg_temp.fails(format('select public.admin_decide_declaration(%L, ''confirm'', null)', :'d5')),
  'C3. confirmation d''une déclaration d''un contrat terminé refusée');
select pg_temp.reset();
update public.commerciaux set ended_at = null, end_reason = null where id = :'b';

-- ===========================================================================
-- B4. Validation tardive : chaque mois porteur de commission a son relevé.
select pg_temp.gerant(6, 'Pizzeria Tout Autre') as e6 \gset
select pg_temp.fiche(6, 'Six Pieds bis') as f6 \gset
select pg_temp.sign(:'a_user', :'f6', now() - interval '130 days', '00000000-0000-0000-0000-00000000ff06', :'e6', now() - interval '120 days') as d6 \gset
select pg_temp.ok((select validated_at is null from public.commercial_clients where declaration_id = :'d6'), 'B4. nom différent : en attente de validation');
select pg_temp.act(:'admin');
select public.admin_record_payment(:'e6', null, 10000, now() - interval '100 days', 'm-3');
select public.admin_record_payment(:'e6', null, 10000, now() - interval '70 days', 'm-2');
select public.admin_record_payment(:'e6', null, 10000, now() - interval '40 days', 'm-1');
select public.admin_validate_client((select id from public.commercial_clients where declaration_id = :'d6'));
select pg_temp.reset();
select public.commercial_draft_statements();
select pg_temp.ok((select sum(total_cents) from public.commercial_statements where commercial_id = :'a') = 4500,
  'B4. commission des trois mois relevée (4 500), aucun mois perdu');
select public.commercial_draft_statements();
select pg_temp.ok((select sum(total_cents) from public.commercial_statements where commercial_id = :'a') = 4500,
  'B4. … et jamais deux fois');

-- ===========================================================================
-- B5. Départ posé par erreur : corrigé puis annulé, Client Apporté rouvert.
select pg_temp.gerant(7, 'Sept Mers') as e7 \gset
select pg_temp.sign(:'a_user', :'r7', now() - interval '100 days', '00000000-0000-0000-0000-00000000ff07', :'e7', now() - interval '90 days') as d7 \gset
select pg_temp.act(:'admin');
select public.admin_set_client_ended(:'r7', now() - interval '60 days');
select public.admin_set_client_ended(:'r7', now() - interval '5 days');
select pg_temp.reset();
select pg_temp.ok((select ended_at from public.commercial_clients where declaration_id = :'d7') = now() - interval '5 days',
  'B5. date de départ corrigée : la fin du Client Apporté suit');
select pg_temp.act(:'a_user');
select pg_temp.ok(pg_temp.fails(format('select public.admin_cancel_client_departure(%L)', :'r7')), 'B5. annulation réservée à l''admin');
select pg_temp.act(:'admin');
select public.admin_cancel_client_departure(:'r7');
select pg_temp.reset();
select pg_temp.ok((select ended_at is null from public.commercial_clients where declaration_id = :'d7')
  and (select client_ended_at is null from public.crm_restaurants where id = :'r7'), 'B5. départ annulé : Client Apporté rouvert, fiche cliente');

-- ===========================================================================
-- B6. Retour d'un client parti.
-- Effacer le départ pendant une redéclaration : refusé, avec la marche à suivre.
select pg_temp.gerant(8, 'Huit Clos') as e8 \gset
update public.crm_restaurants set etablissement_id = :'e8', client_ended_at = now() - interval '100 days' where id = :'r8';
insert into public.legal_acceptances (version_id, scope, etablissement_id, user_id, signatory_email, scope_label, terms, accepted_at)
values (:'cgv', 'etablissement', :'e8', '00000000-0000-0000-0000-00000000ff08', 'g8@resto.test', 'x', '{}', now() - interval '300 days');
select pg_temp.act(:'b_user');
select (public.commercial_declare(:'r8', '{menu}', :'contact') ->> 'id') as d8 \gset
select pg_temp.act(:'admin');
select pg_temp.ok(pg_temp.fails(format('select public.admin_set_client_ended(%L, null)', :'r8')),
  'B6. effacer le départ d''un client parti redéclaré : refusé (son retour se constate par l''inscription)');
-- L'admin marque signé le client revenu sans nouvelle acceptation : la commission part du marquage.
select public.admin_decide_declaration(:'d8', 'confirm', null);
select public.admin_mark_signed(:'d8', :'e8');
select pg_temp.reset();
select pg_temp.ok((select commission_from from public.commercial_clients where declaration_id = :'d8') = now(),
  'B6. client revenu marqué signé sans nouvelles CGV : commission depuis le marquage');
-- Le départ effacé avant la redéclaration n'efface pas la fin figée : le
-- nouveau commercial est signé à la nouvelle acceptation.
select pg_temp.gerant(9, 'Neuf Lunes') as e9 \gset
select pg_temp.sign(:'a_user', :'r9', now() - interval '300 days', '00000000-0000-0000-0000-00000000ff09', :'e9', now() - interval '290 days') as d9a \gset
select pg_temp.act(:'admin');
select public.admin_set_client_ended(:'r9', now() - interval '100 days');
select public.admin_set_client_ended(:'r9', null);
select public.admin_set_client_ended(:'r9', now() - interval '60 days');
select pg_temp.act(:'b_user');
select (public.commercial_declare(:'r9', '{menu}', :'contact') ->> 'id') as d9b \gset
select pg_temp.reset();
select pg_temp.ok((select ended_at from public.commercial_clients where declaration_id = :'d9a') = now() - interval '100 days',
  'B6. la fin du Client Apporté de A reste au premier départ');
select pg_temp.act(:'admin');
select public.admin_decide_declaration(:'d9b', 'confirm', null);
select pg_temp.act(:'b_user');
select public.commercial_signup_link(:'d9b') as tok9 \gset
select pg_temp.act('00000000-0000-0000-0000-00000000ff09');
select public.signup_link_claim(:'tok9', 'menu');
select pg_temp.reset();
insert into public.legal_acceptances (version_id, scope, etablissement_id, user_id, signatory_email, scope_label, terms, accepted_at)
values (:'cgv', 'etablissement', :'e9', '00000000-0000-0000-0000-00000000ff09', 'g9@resto.test', 'x', '{}', now() + interval '1 minute');
select pg_temp.ok((select status from public.commercial_declarations where id = :'d9b') = 'signed'
  and (select commission_from from public.commercial_clients where declaration_id = :'d9b') = now() + interval '1 minute',
  'B6. le client revenu signe par le lien de B : Client Apporté de B depuis cette acceptation');

-- ===========================================================================
-- C2. Sans seuil de nom proche, pas de lien d'inscription.
update public.commercial_settings set name_similarity = null;
select pg_temp.act(:'a_user');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_signup_link(%L)', :'d1')), 'C2. seuil de nom vide : pas de lien d''inscription');
select pg_temp.reset();
update public.commercial_settings set name_similarity = 0.6;

-- ===========================================================================
-- C6. Interlocuteur saisi par Ominin : intouchable ; on en ajoute un.
insert into public.crm_contacts (id, restaurant_id, first_name, role, created_at)
values ('00000000-0000-0000-0000-0000000c0020', :'r1', 'Jean', 'Chef de cuisine', now() - interval '1 day');
update public.commercial_declarations set declared_at = now() - interval '1 hour' where id = :'d1';
select pg_temp.act(:'a_user');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_contact_upsert(%L, %L)', :'d1',
  '{"id": "00000000-0000-0000-0000-0000000c0020", "role": "Autre"}')), 'C6. interlocuteur d''Ominin non modifiable');
select public.commercial_contact_upsert(:'d1', '{"first_name": "Lina", "role": "Gérant"}') as c_new \gset
select pg_temp.ok(not pg_temp.fails(format('select public.commercial_contact_upsert(%L, %L)', :'d1',
  json_build_object('id', :'c_new', 'first_name', 'Lina', 'role', 'Autre'))), 'C6. le sien se modifie');
select pg_temp.reset();
select pg_temp.ok((select first_name || '/' || role from public.crm_contacts where id = '00000000-0000-0000-0000-0000000c0020') = 'Jean/Chef de cuisine',
  'C6. … celui d''Ominin est intact');

-- C5. Plafond et carence servis à l'espace.
update public.commercial_settings set declaration_cap = 4, cooldown_days = 30;
select pg_temp.act(:'a_user');
select pg_temp.ok((public.commercial_account() ->> 'declaration_cap')::int = 4 and (public.commercial_account() ->> 'cooldown_days')::int = 30,
  'C5. plafond et carence lus par l''espace');
select pg_temp.reset();

-- (Relances J+1, J+7, J+14 : 11_defauts4.sql, avec leurs règles du quatrième passage.)

rollback;
