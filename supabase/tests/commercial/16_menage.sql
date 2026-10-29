-- Refonte (29/10), lot 6 : demandes vers un compte Discord relié seulement,
-- restaurants rendus libres à la fin d'un contrat.
begin;
\i /work/tests/fixtures.inc

insert into public.commercial_holds (restaurant_id, commercial_id) values (:'r1', :'b'), (:'r2', :'d');

select pg_temp.act(:'a_user');
select pg_temp.ok(pg_temp.fails(format('select public.commercial_request_visit(%L)', :'r1')),
  'demande : refusée tant que celui qui suit n''a pas relié Discord');
select pg_temp.reset();
update public.commerciaux set discord_user_id = 'discord-bruno' where id = :'b';
select pg_temp.act(:'a_user');
select pg_temp.ok(public.commercial_request_visit(:'r1') is not null, 'demande : acceptée une fois Discord relié');

select pg_temp.act_service();
select pg_temp.ok(public.commercial_release_holds() = 1, 'fin de contrat : un restaurant rendu libre');
select pg_temp.ok(not exists (select 1 from public.commercial_holds where restaurant_id = :'r2')
  and exists (select 1 from public.commercial_holds where restaurant_id = :'r1'), 'fin de contrat : seuls ceux du contrat fini');
select pg_temp.reset();

rollback;
