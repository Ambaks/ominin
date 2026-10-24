-- Fermetures à plusieurs plages. La cuisine du Caffè Panis sert de 12 h à
-- 14 h 30 puis de 19 h à 22 h 30 en semaine, plus tard le week-end, et ses
-- planches suivent un autre horaire : une seule plage par fermeture ne le
-- dit pas.
--
-- 1. L'horaire d'une fermeture devient une liste de plages (closure_windows),
--    chacune avec ses jours. Elles disent quand la carte visée est coupée,
--    ou, open_windows vrai, quand elle est servie : coupée en dehors. « Servie
--    de 12 h à 14 h 30 et de 19 h à 22 h 30 » s'écrit comme on le lit sur
--    la carte papier, sans les trois trous qui l'entourent.
--
-- 2. Un forçage à la main ne vaut plus pour toute la journée : il cède à
--    l'horaire dès que celui-ci change d'état (override_until). La cuisine
--    fermée à la main à 14 h rouvre d'elle-même à 19 h ; rouverte à 23 h pour
--    une table arrivée tard, elle le reste jusqu'à la bascule. Une fermeture
--    à une seule plage se comporte comme avant.

-- ---------------------------------------------------------------------------
-- Plages

create table public.closure_windows (
  id uuid primary key default gen_random_uuid(),
  closure_id uuid not null references public.closures (id) on delete cascade,
  days smallint[] not null
    check (
      cardinality(days) between 1 and 7
      and days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
    ),
  starts_at time not null,
  -- Sans fin : jusqu'au bout de la journée de service.
  ends_at time
);

create index closure_windows_closure_idx on public.closure_windows (closure_id);

alter table public.closures
  add column open_windows boolean not null default false;

insert into public.closure_windows (closure_id, days, starts_at, ends_at)
select id, days, starts_at, ends_at
from public.closures
where starts_at is not null;

-- Comme les cibles : le gérant les écrit avec leur fermeture
-- (enregistrer_fermeture), l'équipe les lit ; l'événement realtime de la
-- fermeture suffit à les relire.
alter table public.closure_windows enable row level security;

create policy "member read" on public.closure_windows
  for select to authenticated
  using (
    exists (
      select 1 from public.closures c
      where c.id = closure_id
        and public.current_member_role(c.etablissement_id) is not null
    )
  );
create policy "gerant write" on public.closure_windows
  for all to authenticated
  using (
    exists (
      select 1 from public.closures c
      where c.id = closure_id
        and public.current_member_role(c.etablissement_id) = 'gerant'
    )
  )
  with check (
    exists (
      select 1 from public.closures c
      where c.id = closure_id
        and public.current_member_role(c.etablissement_id) = 'gerant'
    )
  );

-- ---------------------------------------------------------------------------
-- Forçage jusqu'au prochain changement de l'horaire

-- Heure de service (Paris reculée de day_end_hour) où le forçage cède.
alter table public.closures add column override_until timestamp;

-- Un forçage en cours valait jusqu'à la fin de sa journée de service.
update public.closures
set override_until = override_day + 1
where override_day is not null;

alter table public.closures
  drop constraint closures_forcage,
  drop column override_day,
  add constraint closures_forcage check (
    (override_closed is null) = (override_until is null)
  );

-- ---------------------------------------------------------------------------
-- Calcul

-- L'horaire seul, sans le forçage à la main. Une fin qui tombe à la bascule
-- (minuit en heure de service) vaut fin de journée ; une fin avant le début
-- donne une plage vide, que le formulaire du gérant refuse. Sans plage,
-- jamais coupée par l'horaire, quel que soit open_windows.
create or replace function public.fermeture_planifiee(
  p_closure public.closures,
  p_service timestamp,
  p_day_end_hour int
)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (select 1 from closure_windows w where w.closure_id = p_closure.id)
    and exists (
      select 1 from closure_windows w
      where w.closure_id = p_closure.id
        and extract(isodow from p_service)::smallint = any (w.days)
        and p_service::time >= w.starts_at - make_interval(hours => p_day_end_hour)
        and (
          w.ends_at is null
          or w.ends_at - make_interval(hours => p_day_end_hour) = '00:00'
          or p_service::time < w.ends_at - make_interval(hours => p_day_end_hour)
        )
    ) <> p_closure.open_windows;
$$;

-- Le premier instant de la journée de service où l'horaire change d'état ;
-- la bascule s'il n'en change plus. Un changement tombe toujours sur un bord
-- de plage : le premier bord à venir dont l'état diffère de l'état présent
-- est le premier changement.
create function public.fermeture_changement_suivant(
  p_closure public.closures,
  p_service timestamp,
  p_day_end_hour int
)
returns timestamp
language sql
stable
set search_path = public
as $$
  select coalesce(min(bord.at), p_service::date + 1)
  from (
    select p_service::date + (w.starts_at - make_interval(hours => p_day_end_hour)) as at
    from closure_windows w
    where w.closure_id = p_closure.id
    union all
    select p_service::date + (w.ends_at - make_interval(hours => p_day_end_hour))
    from closure_windows w
    where w.closure_id = p_closure.id and w.ends_at is not null
  ) bord
  where bord.at > p_service
    and fermeture_planifiee(p_closure, bord.at, p_day_end_hour)
      <> fermeture_planifiee(p_closure, p_service, p_day_end_hour);
$$;

create or replace function public.fermeture_active(
  p_closure public.closures,
  p_service timestamp,
  p_day_end_hour int
)
returns boolean
language sql
stable
set search_path = public
as $$
  select case
    when p_service < p_closure.override_until then p_closure.override_closed
    else public.fermeture_planifiee(p_closure, p_service, p_day_end_hour)
  end;
$$;

revoke execute on function public.fermeture_changement_suivant(public.closures, timestamp, int)
  from public, anon, authenticated;

-- Fermer ou rouvrir d'un geste, jusqu'au prochain changement de l'horaire.
-- Si l'horaire donne déjà l'état demandé, le forçage s'efface : rouvrir à
-- 16 h une cuisine fermée à la main laisse la fermeture de 22 h se faire.
create or replace function public.basculer_fermeture(p_closure uuid, p_fermee boolean)
returns public.closures
language plpgsql
security definer
set search_path = public
as $$
declare
  v_closure closures;
  v_service timestamp;
  v_day_end_hour int;
begin
  select * into v_closure from closures where id = p_closure for update;
  if v_closure.id is null
     or coalesce(current_member_role(v_closure.etablissement_id)::text, '')
       not in ('gerant', 'cuisinier') then
    raise exception 'Fermeture introuvable.';
  end if;

  select h.service_ts, h.day_end_hour into v_service, v_day_end_hour
  from horloge_service(v_closure.etablissement_id, now()) h;

  if fermeture_planifiee(v_closure, v_service, v_day_end_hour) = p_fermee then
    update closures set override_closed = null, override_until = null
    where id = p_closure
    returning * into v_closure;
  else
    update closures
    set override_closed = p_fermee,
        override_until = fermeture_changement_suivant(v_closure, v_service, v_day_end_hour)
    where id = p_closure
    returning * into v_closure;
  end if;
  return v_closure;
end;
$$;

-- ---------------------------------------------------------------------------
-- Enregistrement

drop function public.enregistrer_fermeture(
  uuid, uuid, text, smallint[], time, time, jsonb
);

alter table public.closures
  drop constraint closures_horaire,
  drop constraint closures_jours,
  drop column days,
  drop column starts_at,
  drop column ends_at;

-- Une fermeture, ses plages et ses cibles, d'un seul tenant : l'événement
-- realtime de la fermeture n'arrive qu'une fois tout écrit. Droits de
-- l'appelant : RLS réserve l'écriture au gérant. p_closure null ⇒ nouvelle
-- fermeture. p_windows : [{days, starts_at, ends_at}], vide ⇒ à la main
-- seulement. Un forçage en cours s'efface : il répondait à l'ancien horaire.
create function public.enregistrer_fermeture(
  p_etablissement uuid,
  p_closure uuid,
  p_name text,
  p_open_windows boolean,
  p_windows jsonb,
  p_targets jsonb
)
returns public.closures
language plpgsql
set search_path = public
as $$
declare
  v_closure closures;
begin
  if p_open_windows and jsonb_array_length(p_windows) = 0 then
    raise exception 'Indiquez au moins une plage de service.';
  end if;

  if p_closure is null then
    insert into closures (etablissement_id, name, open_windows)
    values (p_etablissement, p_name, p_open_windows)
    returning * into v_closure;
  else
    update closures
    set name = p_name, open_windows = p_open_windows,
        override_closed = null, override_until = null
    where id = p_closure and etablissement_id = p_etablissement
    returning * into v_closure;
    if v_closure.id is null then
      raise exception 'Fermeture introuvable.';
    end if;
    delete from closure_windows where closure_id = v_closure.id;
    delete from closure_targets where closure_id = v_closure.id;
  end if;

  insert into closure_windows (closure_id, days, starts_at, ends_at)
  select
    v_closure.id,
    array(select jsonb_array_elements_text(w.value->'days')::smallint),
    (w.value->>'starts_at')::time,
    (w.value->>'ends_at')::time
  from jsonb_array_elements(p_windows) as w(value);

  -- Seules les cibles de l'établissement : un plat supprimé entre-temps
  -- (resté coché dans un écran ouvert) est ignoré, pas une erreur.
  insert into closure_targets (closure_id, category_id, item_id)
  select v_closure.id, (t.value->>'category_id')::uuid, (t.value->>'item_id')::uuid
  from jsonb_array_elements(p_targets) as t(value)
  where exists (
      select 1 from categories c
      where c.id = (t.value->>'category_id')::uuid
        and c.etablissement_id = p_etablissement
    )
    or exists (
      select 1 from items i
      where i.id = (t.value->>'item_id')::uuid
        and i.etablissement_id = p_etablissement
    );
  return v_closure;
end;
$$;

revoke execute on function public.enregistrer_fermeture(
  uuid, uuid, text, boolean, jsonb, jsonb
) from public, anon;
grant execute on function public.enregistrer_fermeture(
  uuid, uuid, text, boolean, jsonb, jsonb
) to authenticated;
