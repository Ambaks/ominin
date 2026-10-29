-- Retours du 29/10 : l'inscription en cours reprise après la création du
-- compte, le refus visible sur la carte, le récap d'un restaurant.
begin;
\i /work/tests/fixtures.inc

update public.crm_restaurants set latitude = 43.61, longitude = 3.87 where id in (:'r1', :'r2');
update public.commerciaux set discord_user_id = 'discord-bruno' where id = :'b';
update public.commercial_settings set visit_request_days = 30;

select pg_temp.act(:'a_user');
select public.commercial_start_signup(:'r1') as s1 \gset
select pg_temp.reset();
update public.commercial_signups set etablissement_id = :'etab', manager_name = 'Paul', manager_phone = '0600000000' where id = :'s1';
select pg_temp.act(:'a_user');
select pg_temp.ok(public.commercial_start_signup(:'r1') = :'s1', 'inscription : reprise même une fois le compte créé');
select pg_temp.ok((public.commercial_restaurant_recap(:'r1') -> 'signup' ->> 'manager_name') = 'Paul'
  and (public.commercial_restaurant_recap(:'r1') -> 'signup' ->> 'account')::boolean, 'récap : ce que le commercial a récupéré');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_restaurant_recap(%L)', :'r2')), 'récap : seulement ses restaurants');

select pg_temp.reset();
insert into public.commercial_holds (restaurant_id, commercial_id) values (:'r2', :'b');
select pg_temp.act(:'a_user');
select public.commercial_request_visit(:'r2') as q \gset
select pg_temp.act_service();
select public.commercial_answer_request(:'q', 'discord-bruno', false);
select pg_temp.act(:'a_user');
select pg_temp.ok((select request = 'refused' and request_ends > now() from public.commercial_map(:'r2')), 'carte : le refus et sa fin se voient');
select pg_temp.reset();

rollback;
