-- Refonte (29/10), lot 3 : la visite.
begin;
\i /work/tests/fixtures.inc

update public.crm_restaurants set latitude = 43.61, longitude = 3.87 where id in (:'r1', :'r2', :'rc_link');

select pg_temp.act(:'a_user');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_visit(%L, ''{"outcome": "absent"}'')', :'r1')),
  'visite : un responsable absent demande un contact');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_visit(%L, ''{"outcome": "not_interested"}'')', :'r1')),
  'visite : pas intéressé demande un motif');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_visit(%L, ''{"outcome": "absent", "contact_phone": "0600000000"}'')', :'rc_link')),
  'visite : refusée sur un restaurant déjà client');
select public.commercial_visit(:'r1', '{"outcome": "absent", "contact_name": "Paul", "contact_phone": "0600000000"}');
select pg_temp.ok((select state = 'visited' and mine from public.commercial_map(:'r1')), 'visite : le restaurant devient celui du commercial');
select public.commercial_visit(:'r1', '{"outcome": "not_interested", "reason": "price", "note": "Trop cher pour lui"}');
select pg_temp.ok((select count(*) from public.commercial_map(:'r1')) = 1 and (select count(*) from public.commercial_map()) = 3,
  'visite : la carte se lit en entier ou pour un seul restaurant');

select pg_temp.act(:'b_user');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_visit(%L, ''{"outcome": "not_interested", "reason": "time"}'')', :'r1')),
  'visite : refusée sur un restaurant suivi par un autre commercial');
select pg_temp.ok((select holder = 'Alice' from public.commercial_map(:'r1')), 'visite : les autres voient qui suit le restaurant');
select pg_temp.reset();
select pg_temp.ok((select count(*) from public.commercial_visits where restaurant_id = :'r1') = 2, 'visite : chaque visite est gardée');

rollback;
