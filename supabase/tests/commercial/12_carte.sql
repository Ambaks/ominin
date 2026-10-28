-- Refonte (28/10), lot 2 : la carte du commercial.
begin;
\i /work/tests/fixtures.inc

update public.crm_restaurants set latitude = 43.61, longitude = 3.87
where id in (:'r1', :'r2', :'r3', :'rc_link', :'rc_phone', :'r_optout');
insert into public.outreach_emails (restaurant_id, direction, kind, status, to_email, sent_at)
values (:'r2', 'outbound', 'cold', 'sent', 'r2@resto.test', now() - interval '1 day');
insert into public.commercial_holds (restaurant_id, commercial_id) values (:'r3', :'b');

select pg_temp.act(:'a_user');
select pg_temp.ok((select count(*) from public.commercial_map()) = 5, 'carte : les restaurants placés, sans celui qui s''oppose');
select pg_temp.ok((select state = 'free' and not contacted_by_lea from public.commercial_map() where id = :'r1'),
  'carte : un restaurant libre');
select pg_temp.ok((select contacted_by_lea from public.commercial_map() where id = :'r2'), 'carte : un e-mail envoyé par Léa est signalé');
select pg_temp.ok((select state = 'visited' and holder = 'Bruno' and not mine from public.commercial_map() where id = :'r3'),
  'carte : visité par un autre commercial, avec son prénom');
select pg_temp.ok((select state from public.commercial_map() where id = :'rc_link') = 'client'
  and (select state from public.commercial_map() where id = :'rc_phone') = 'client', 'carte : clients par lien et par téléphone');
select pg_temp.ok((select count(*) from public.commercial_holds) = 0, 'carte : la table des restaurants visités n''est pas lisible directement');

select pg_temp.act(:'b_user');
select pg_temp.ok((select mine from public.commercial_map() where id = :'r3'), 'carte : le commercial voit ses propres restaurants');

select pg_temp.act(:'c_user');
select pg_temp.ok(pg_temp.fails('select * from public.commercial_map()'), 'carte : refusée à un compte qui n''a pas signé');
select pg_temp.act(:'d_user');
select pg_temp.ok(pg_temp.fails('select * from public.commercial_map()'), 'carte : refusée après la fin du contrat');
select pg_temp.reset();

rollback;
