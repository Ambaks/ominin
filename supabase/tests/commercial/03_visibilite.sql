-- Critères 6 et 7, tableau 4.5, passage sans suite (4.2 bis).
begin;
\i /work/tests/fixtures.inc

-- A déclare r1, est confirmé, coche l'étape 3, note, relance, rendez-vous,
-- remplit sa fiche retenue.
select pg_temp.act(:'a_user');
select public.commercial_declare(:'r1', '{menu}', '{"role": "Gérant", "first_name": "Paul", "phone": "0600000001"}') ->> 'id' as da \gset
select pg_temp.act(:'admin');
select public.admin_decide_declaration(:'da', 'confirm', null);
select pg_temp.act(:'a_user');
select public.commercial_set_step(:'da', 3, true);
select public.commercial_log(:'da', 'visit', 'Passé ce midi, gérant intéressé');
select public.commercial_task_upsert(:'da', jsonb_build_object('title', 'Rappeler Paul', 'due_at', now()));
select public.commercial_appointment_upsert(:'da', jsonb_build_object('title', 'Démo', 'start_at', now() + interval '2 hours'));
select public.commercial_save_retained(:'da', '{"till": "Zelty", "tpe": "sumup", "tables": 12, "interest": "chaud", "objections": ["prix"], "note": "Veut voir la démo Collect"}');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_save_retained(%L, ''{"tpe": "carte bleue"}'')', :'da')),
  '4.5. la fiche retenue n''accepte que la liste fermée');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_save_retained(%L, %L)', :'da',
  jsonb_build_object('note', repeat('x', 201)))), '4.5. précision limitée par le réglage');

-- Ce que voit le titulaire.
select public.commercial_restaurant(:'r1') as fa \gset
select pg_temp.reset();
select pg_temp.ok((:'fa'::jsonb -> 'mine' ->> 'id') = :'da', '4.5. le titulaire voit sa déclaration');
select pg_temp.ok(jsonb_array_length(:'fa'::jsonb -> 'contacts') = 1
  and (:'fa'::jsonb -> 'contacts' -> 0) ? 'phone'
  and not ((:'fa'::jsonb -> 'contacts' -> 0) ? 'notes'), '4.5. le titulaire voit les interlocuteurs, jamais leurs notes');
select pg_temp.ok(jsonb_array_length(:'fa'::jsonb -> 'activities') = 1
  and jsonb_array_length(:'fa'::jsonb -> 'tasks') = 1
  and jsonb_array_length(:'fa'::jsonb -> 'appointments') = 1, '4.5. le titulaire voit son journal, ses relances, ses rendez-vous');
select pg_temp.ok((:'fa'::jsonb -> 'restaurant') ? 'owner_name' and (:'fa'::jsonb -> 'restaurant') ? 'email'
  and not ((:'fa'::jsonb -> 'restaurant') ? 'important_notes')
  and not ((:'fa'::jsonb -> 'restaurant') ? 'description'), '4.5. le titulaire voit owner_* et email, jamais les notes admin');
select pg_temp.ok(:'fa'::jsonb -> 'mine' -> 'retained' ->> 'note' = 'Veut voir la démo Collect', '4.5. le titulaire voit sa précision');
select pg_temp.ok(jsonb_array_length(:'fa'::jsonb -> 'steps') = 5
  and (:'fa'::jsonb -> 'steps' -> 1 ->> 'title') = 'Démo montrée sur sa carte ou une démo proche'
  and (:'fa'::jsonb -> 'steps' -> 4 ->> 'title') = 'Le restaurant a choisi une offre publiée et veut s''inscrire',
  '5.3. étapes 1 à 5, textes du commercial pour 2 et 5');

-- 6. B lit le statut et l'étape de A, rien d'autre.
select pg_temp.act(:'b_user');
select public.commercial_restaurant(:'r1') as fb \gset
select row_to_json(s)::text as sb from public.commercial_search('Bistrot Libre') s \gset
select pg_temp.reset();
select pg_temp.ok((:'fb'::jsonb -> 'state' ->> 'kind') = 'reserved' and (:'fb'::jsonb -> 'state' ->> 'step')::int = 3
  and not (:'fb'::jsonb -> 'state' ->> 'mine')::boolean, '6. B voit « réservé », étape 3');
select pg_temp.ok((:'fb'::jsonb -> 'mine') = 'null'::jsonb, '6. B ne voit pas la déclaration de A');
select pg_temp.ok(jsonb_array_length(:'fb'::jsonb -> 'contacts') = 0
  and jsonb_array_length(:'fb'::jsonb -> 'activities') = 0
  and jsonb_array_length(:'fb'::jsonb -> 'tasks') = 0
  and jsonb_array_length(:'fb'::jsonb -> 'appointments') = 0
  and jsonb_array_length(:'fb'::jsonb -> 'lea') = 0, '6. ni interlocuteurs, ni journal, ni relances, ni Léa');
select pg_temp.ok(jsonb_array_length(:'fb'::jsonb -> 'history') = 0, '6. pas de fiche retenue en cours');
select pg_temp.ok(not ((:'fb'::jsonb -> 'restaurant') ?| array['owner_name', 'owner_phone', 'owner_email', 'email',
  'important_notes', 'description']), '6. aucune colonne owner_*, email, important_notes, description');
select pg_temp.ok(position(:'b' in :'fb') = 0 and position(:'a' in :'fb') = 0 and position('Alice' in :'fb') = 0,
  '4.5. le nom du titulaire n''apparaît nulle part');
select pg_temp.ok((:'sb'::jsonb -> 'state' ->> 'kind') = 'reserved', '5.2. la recherche montre le statut');

-- B ne lit aucune table crm_* ni la déclaration de A en direct.
select pg_temp.act(:'b_user');
select pg_temp.ok((select count(*) from public.crm_restaurants) = 0 and (select count(*) from public.crm_contacts) = 0
  and (select count(*) from public.crm_activities) = 0 and (select count(*) from public.crm_tasks) = 0
  and (select count(*) from public.commercial_declarations where commercial_id = :'a') = 0,
  '7.2. aucune lecture directe des tables crm_* ni des déclarations des autres');
-- B n'écrit pas sur la déclaration de A.
select pg_temp.ok(pg_temp.fails(format('select public.commercial_log(%L, ''note'', ''x'')', :'da')), '7.2. B n''écrit pas dans le journal de A');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_set_step(%L, 4, true)', :'da')), '7.2. B ne coche pas les étapes de A');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_abandon(%L, ''other'')', :'da')), '7.2. B n''abandonne pas pour A');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_opt_out(%L)', :'r1')), '5.3. B ne pose pas l''opposition sur la réservation de A');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_passage(%L, ''{}'', ''other'')', :'r1')), '4.2 bis. pas de passage sur un restaurant réservé');
select pg_temp.reset();

-- 7. A abandonne : B voit la fiche retenue et le motif de A, déclare, voit
-- les interlocuteurs mais pas le journal de A.
select pg_temp.act(:'a_user');
select public.commercial_abandon(:'da', 'equipped');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_log(%L, ''note'', ''x'')', :'da')), '7. plus d''écriture après l''abandon');
select pg_temp.act(:'b_user');
select public.commercial_restaurant(:'r1') as fb2 \gset
select public.commercial_declare(:'r1', '{collect}', '{"role": "Associé"}') ->> 'id' as db \gset
select public.commercial_restaurant(:'r1') as fb3 \gset
select pg_temp.reset();
select pg_temp.ok((:'fb2'::jsonb -> 'state' ->> 'kind') = 'free', '7. le restaurant est libre');
select pg_temp.ok((:'fb2'::jsonb -> 'history' -> 0 ->> 'end_reason') = 'equipped'
  and (:'fb2'::jsonb -> 'history' -> 0 -> 'retained' ->> 'till') = 'Zelty'
  and (:'fb2'::jsonb -> 'history' -> 0 ->> 'step')::int = 3, '7. B voit le motif, l''étape et la fiche retenue de A');
select pg_temp.ok(not ((:'fb2'::jsonb -> 'history' -> 0 -> 'retained') ? 'note'), '4.5. pas la précision libre de A');
select pg_temp.ok((:'fb3'::jsonb -> 'mine' ->> 'id') = :'db', '7. B a déclaré');
select pg_temp.ok(jsonb_array_length(:'fb3'::jsonb -> 'contacts') = 2, '7. B voit tous les interlocuteurs, y compris ceux de A');
select pg_temp.ok(jsonb_array_length(:'fb3'::jsonb -> 'activities') = 0
  and jsonb_array_length(:'fb3'::jsonb -> 'tasks') = 0
  and jsonb_array_length(:'fb3'::jsonb -> 'appointments') = 0, '7. B ne voit pas le journal, les relances ni les rendez-vous de A');
select pg_temp.ok((select target_products from public.crm_leads where restaurant_id = :'r1') = '{collect}', '4.2. l''offre visée est écrite dans crm_leads');

-- L'admin voit tout, fiche par fiche.
select pg_temp.act(:'admin');
select pg_temp.ok((select count(*) from public.crm_activities where declaration_id = :'da') = 1
  and (select count(*) from public.commercial_declarations where restaurant_id = :'r1') = 2, '4.5. l''admin voit le journal de chaque déclaration');
select pg_temp.reset();

-- Passage sans suite.
select pg_temp.act(:'b_user');
select public.commercial_passage(:'r6', '{"interest": "froid", "tpe": "banque", "note": "Pas le moment"}', 'not_interested') as p6 \gset
select public.commercial_restaurant(:'r6') as f6 \gset
select pg_temp.act(:'a_user');
select public.commercial_restaurant(:'r6') as f6a \gset
select pg_temp.ok(pg_temp.fails(format('select public.commercial_passage(%L, ''{}'', ''opposition'')', :'r7')),
  '4.2 bis. l''opposition passe par son bouton, pas par un passage');
select pg_temp.reset();
select pg_temp.ok(status = 'passage' and end_reason = 'not_interested' and confirm_deadline is null,
  '4.2 bis. ligne « passage » sans file admin')
from public.commercial_declarations where id = :'p6';
select pg_temp.ok(not exists (select 1 from public.commercial_emails where declaration_id = :'p6'), '4.2 bis. aucun e-mail');
select pg_temp.ok((select status from public.crm_leads where restaurant_id = :'r6') = 'not_interested', '4.2 bis. reflet not_interested');
select pg_temp.ok((:'f6'::jsonb -> 'state' ->> 'kind') = 'free'
  and (:'f6'::jsonb -> 'history' -> 0 ->> 'status') = 'passage', '4.2 bis. visible dans l''historique');
select pg_temp.ok((:'f6a'::jsonb -> 'history' -> 0 -> 'retained' ->> 'interest') = 'froid'
  and not ((:'f6a'::jsonb -> 'history' -> 0 -> 'retained') ? 'note'), '4.2 bis. les autres voient les champs fermés, pas la précision');
select pg_temp.act(:'b_user');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_passage(%L, ''{}'', ''other'')', :'r_optout')), '4.2 bis. refusé en opposition');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_passage(%L, ''{}'', ''other'')', :'rc_link')), '4.2 bis. refusé sur un client');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_passage(%L, ''{}'', ''other'')', :'r_lea')), '13.2 n° 3. refusé en discussion');
select pg_temp.reset();

-- L'état « en discussion » s'affiche sans détail.
select pg_temp.act(:'a_user');
select row_to_json(s)::text as s_lea from public.commercial_search('Répondu') s \gset
select pg_temp.reset();
select pg_temp.ok((:'s_lea'::jsonb -> 'state' ->> 'in_talks')::boolean, '13.2 n° 3. « en discussion » affiché dans la recherche');

-- Recherche : plafond de résultats et quota du jour.
update public.commercial_settings set search_max_results = 2, search_daily_quota = 4;
select pg_temp.act(:'a_user');
select pg_temp.ok((select count(*) from public.commercial_search('9 rue Libre')) = 1, '5.2. recherche par rue');
select pg_temp.ok((select count(*) from public.commercial_search('e')) = 2, '4.5. au plus SEARCH_MAX_RESULTS résultats');
select pg_temp.ok((select count(*) from public.commercial_search('04 67 22')) = 1, '5.2. recherche par téléphone');
select pg_temp.ok(pg_temp.fails('select public.commercial_search(''Neuf'')'), '4.5. quota du jour atteint');
select pg_temp.reset();
update public.commercial_settings set search_max_results = null;
select pg_temp.act(:'b_user');
select pg_temp.ok(pg_temp.fails('select public.commercial_search(''Neuf'')'), '13.2 n° 15. sans nombre de résultats réglé, la recherche est fermée');
select pg_temp.reset();

-- Création à la main : doublons montrés, puis création.
update public.commercial_settings set search_max_results = 20, search_daily_quota = null;
select pg_temp.act(:'b_user');
select pg_temp.ok((select count(*) from public.commercial_find_duplicates('Le Bistrot Libre', 'Montpellier')) = 1,
  '4.1. doublon par nom proche dans la même ville');
select pg_temp.ok((select reason from public.commercial_find_duplicates('Autre chose', null, '04.67.22.22.22')) = 'phone',
  '4.1. doublon par téléphone');
select public.commercial_create_restaurant('{"name": "Nouveau Café", "city": "Sète", "latitude": 43.4, "longitude": 3.7}') as nr \gset
select pg_temp.reset();
select pg_temp.ok(slug ~ '^nouveau-cafe-[0-9a-f]{6}$' and source = 'commercial' and latitude = 43.4,
  '5.2. fiche créée avec slug et position')
from public.crm_restaurants where id = :'nr';
select pg_temp.ok(exists (select 1 from public.crm_leads where restaurant_id = :'nr'), '5.2. la fiche a son lead');

rollback;
