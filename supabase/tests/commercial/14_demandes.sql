-- Refonte (29/10), lot 4 : les demandes de visite.
begin;
\i /work/tests/fixtures.inc

update public.crm_restaurants set latitude = 43.61, longitude = 3.87 where id in (:'r1', :'r2', :'r3');
update public.commerciaux set discord_user_id = 'discord-bruno' where id = :'b';
update public.commercial_settings set visit_request_days = 30;
insert into public.commercial_holds (restaurant_id, commercial_id) values (:'r1', :'b'), (:'r2', :'b'), (:'r3', :'b');

select pg_temp.act(:'a_user');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_request_visit(%L)', :'r4')), 'demande : refusée sur un restaurant libre');
select public.commercial_request_visit(:'r1') as q1 \gset
select pg_temp.ok((select request from public.commercial_map(:'r1')) = 'pending', 'demande : la carte la montre au demandeur');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_request_visit(%L)', :'r1')), 'demande : une seule ouverte par restaurant');
select public.commercial_request_visit(:'r2') as q2 \gset
select public.commercial_request_visit(:'r3') as q3 \gset
select pg_temp.ok(pg_temp.fails(format('select public.commercial_answer_request(%L, %L, true)', :'q1', 'discord-bruno')),
  'demande : la réponse n''est pas appelable par un commercial');

select pg_temp.act(:'b_user');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_request_visit(%L)', :'r1')), 'demande : pas sur son propre restaurant');

select pg_temp.act_service();
select pg_temp.ok(pg_temp.fails(format('select public.commercial_answer_request(%L, %L, true)', :'q1', 'quelqu-un')),
  'demande : seul le compte Discord de celui qui suit répond');
select public.commercial_answer_request(:'q1', 'discord-bruno', true);
select pg_temp.ok(not exists (select 1 from public.commercial_holds where restaurant_id = :'r1'), 'demande : acceptée, le restaurant est libéré');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_answer_request(%L, %L, false)', :'q1', 'discord-bruno')),
  'demande : une seule réponse');
select public.commercial_answer_request(:'q2', 'discord-bruno', false);

-- Échéance : r2 refusé sans avancer, r3 sans réponse mais Bruno y est retourné.
update public.commercial_visit_requests set created_at = now() - interval '31 days' where id in (:'q2', :'q3');
insert into public.commercial_visits (restaurant_id, commercial_id, outcome, reason) values (:'r3', :'b', 'not_interested', 'time');
select count(*) as libres from public.commercial_release_requests() \gset
select pg_temp.ok(:'libres' = '2', 'demande : les deux demandes échues sont traitées');
select pg_temp.ok((select status from public.commercial_visit_requests where id = :'q2') = 'released'
  and not exists (select 1 from public.commercial_holds where restaurant_id = :'r2'), 'demande : refusée sans avancer, libérée pour tous');
select pg_temp.ok((select status from public.commercial_visit_requests where id = :'q3') = 'kept'
  and exists (select 1 from public.commercial_holds where restaurant_id = :'r3' and commercial_id = :'b'), 'demande : celui qui a avancé garde le restaurant');
select pg_temp.reset();

rollback;
