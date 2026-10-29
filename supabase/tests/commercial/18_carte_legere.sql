-- La carte en points : position et état, sans le reste de la fiche.
begin;
\i /work/tests/fixtures.inc

update public.crm_restaurants set latitude = 43.61, longitude = 3.87 where id in (:'r1', :'r2');
insert into public.commercial_holds (restaurant_id, commercial_id) values (:'r1', :'a'), (:'r2', :'b');

select pg_temp.act(:'a_user');
select pg_temp.ok((select p ->> 3 from jsonb_array_elements(public.commercial_map_points()) p where p ->> 0 = :'r1') = 'm'
  and (select p ->> 3 from jsonb_array_elements(public.commercial_map_points()) p where p ->> 0 = :'r2') = 'v',
  'carte : le sien et celui d''un autre se distinguent');
select pg_temp.ok((select jsonb_array_length(p) from jsonb_array_elements(public.commercial_map_points()) p limit 1) = 4,
  'carte : quatre valeurs par point');
select pg_temp.reset();

rollback;
