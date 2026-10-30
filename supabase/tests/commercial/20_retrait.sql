-- Retirer un restaurant : il quitte le tableau de bord, se libère, et son passage reste visible.
begin;
\i /work/tests/fixtures.inc

update public.crm_restaurants set latitude = 43.61, longitude = 3.87 where id = :'r1';

select pg_temp.act(:'a_user');
select public.commercial_visit(:'r1', '{"outcome":"not_interested","reason":"price"}');
select pg_temp.ok(jsonb_array_length(public.commercial_dashboard() -> 'restaurants') = 1, 'retrait : la visite est au tableau de bord');

select public.commercial_remove_restaurant(:'r1');
select pg_temp.ok(jsonb_array_length(public.commercial_dashboard() -> 'restaurants') = 0, 'retrait : il quitte le tableau de bord');
select pg_temp.reset();

select pg_temp.ok(not exists (select 1 from public.commercial_holds where restaurant_id = :'r1'), 'retrait : le restaurant est libéré');

select pg_temp.act(:'b_user');
select pg_temp.ok((select state from public.commercial_map(:'r1')) = 'free', 'retrait : libre sur la carte de l''autre');
select pg_temp.ok((select last_by is not null and last_at is not null from public.commercial_map(:'r1')), 'retrait : le passage reste visible');
select pg_temp.reset();

update public.commercial_removed set at = now() - interval '1 minute' where restaurant_id = :'r1';
select pg_temp.act(:'a_user');
select public.commercial_visit(:'r1', '{"outcome":"not_interested","reason":"time"}');
select pg_temp.ok(jsonb_array_length(public.commercial_dashboard() -> 'restaurants') = 1, 'retrait : y retourner le remet au tableau de bord');
select pg_temp.reset();

rollback;
