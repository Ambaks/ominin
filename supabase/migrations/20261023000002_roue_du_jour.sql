-- La roue du jour, sur le vrai menu : un téléphone reconnu, dont la carte a
-- déjà gagné des points à une commande réglée, tourne une fois par jour
-- (jour de Paris). Le tirage se fait ici, pas dans le navigateur : la part,
-- ses points (doublés le jour de la roue dorée) et la ligne de la carte sont
-- posés ensemble. Les parts et la roue dorée viennent du registre de la
-- carte (lib/menu-data), passés par le route handler — seul à pouvoir
-- appeler ces fonctions (service_role).

alter table public.loyalty_entries
  add column wheel_day date;

alter table public.loyalty_entries
  drop constraint loyalty_entries_order_kind;

alter table public.loyalty_entries
  add constraint loyalty_entries_order_kind check (
    (kind in ('ajustement', 'roue')) = (order_id is null)
  ),
  add constraint loyalty_entries_wheel_day check (
    (kind = 'roue') = (wheel_day is not null)
  );

-- Un tour par carte et par jour, même sous deux requêtes simultanées.
create unique index loyalty_entries_wheel_day_idx
  on public.loyalty_entries (customer_id, wheel_day) where wheel_day is not null;

-- ---------------------------------------------------------------------------
-- Jours d'affilée avec un tour, en remontant depuis p_from.

create function public.loyalty_wheel_streak(p_customer uuid, p_from date)
returns int
language sql stable
set search_path = public
as $$
  with recursive days(day) as (
    select p_from
    where exists (
      select 1 from loyalty_entries
      where customer_id = p_customer and wheel_day = p_from
    )
    union all
    select d.day - 1
    from days d
    where exists (
      select 1 from loyalty_entries
      where customer_id = p_customer and wheel_day = d.day - 1
    )
  )
  select count(*)::int from days;
$$;

-- La carte du téléphone dans cette maison, si elle peut tourner : programme
-- ouvert, déjà un gain (une commande réglée — une carte créée à la volée ne
-- tourne pas).

create function public.loyalty_wheel_customer(p_slug text, p_token_hash text)
returns uuid
language sql stable
set search_path = public
as $$
  select lc.id
  from etablissements e
  join loyalty_devices d on d.token_hash = p_token_hash
  join loyalty_customers lc
    on lc.etablissement_id = e.id and lc.contact = d.contact
  where e.slug = p_slug
    and loyalty_active(e.id)
    and exists (
      select 1 from loyalty_entries
      where customer_id = lc.id and kind = 'gain'
    );
$$;

-- Où en est la roue pour ce téléphone : rien (pas de roue pour lui), ou le
-- tour du jour joué ou non, et la série — aujourd'hui compris s'il est joué.

create function public.loyalty_wheel_state(p_slug text, p_token_hash text)
returns table (played_today boolean, streak int)
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_customer uuid := loyalty_wheel_customer(p_slug, p_token_hash);
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_played boolean;
begin
  if v_customer is null then
    return;
  end if;
  v_played := exists (
    select 1 from loyalty_entries
    where customer_id = v_customer and wheel_day = v_today
  );
  return query select
    v_played,
    loyalty_wheel_streak(v_customer, case when v_played then v_today else v_today - 1 end);
end;
$$;

-- Le tour : la part tirée au prorata des poids, ses points — multipliés le
-- jour de la roue dorée (p_golden_every-ième jour d'affilée) —, la ligne de
-- la carte. p_slices : [{ "points": 5, "weight": 32 }, …].

create function public.loyalty_wheel_spin(
  p_slug text,
  p_token_hash text,
  p_slices jsonb,
  p_golden_every int default null,
  p_golden_multiplier int default null
)
returns table (slice int, points int, streak int)
language plpgsql security definer
set search_path = public
as $$
declare
  v_customer uuid := loyalty_wheel_customer(p_slug, p_token_hash);
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_streak int;
  v_total numeric;
  v_draw numeric;
  v_index int := 0;
  v_slice jsonb;
  v_points int;
begin
  if v_customer is null then
    raise exception 'Pas de tour de roue pour cette carte.';
  end if;
  if jsonb_typeof(p_slices) <> 'array' or jsonb_array_length(p_slices) = 0 then
    raise exception 'Roue sans parts.';
  end if;
  -- Deux tours lancés ensemble attendent l'un l'autre ; le second trouve le
  -- tour du jour posé.
  perform 1 from loyalty_customers where id = v_customer for update;
  if exists (
    select 1 from loyalty_entries
    where customer_id = v_customer and wheel_day = v_today
  ) then
    raise exception 'Le tour du jour est déjà joué.';
  end if;

  select sum((s ->> 'weight')::numeric) into v_total
  from jsonb_array_elements(p_slices) s;
  if v_total is null or v_total <= 0 then
    raise exception 'Roue sans poids.';
  end if;
  v_draw := random() * v_total;
  for v_slice in select value from jsonb_array_elements(p_slices) loop
    v_draw := v_draw - (v_slice ->> 'weight')::numeric;
    exit when v_draw < 0;
    v_index := v_index + 1;
  end loop;
  v_index := least(v_index, jsonb_array_length(p_slices) - 1);

  v_streak := loyalty_wheel_streak(v_customer, v_today - 1) + 1;
  v_points := (p_slices -> v_index ->> 'points')::int;
  if v_points is null or v_points <= 0 then
    raise exception 'Part sans points.';
  end if;
  if p_golden_every > 0 and v_streak % p_golden_every = 0 then
    v_points := v_points * p_golden_multiplier;
  end if;

  insert into loyalty_entries (customer_id, kind, points, wheel_day)
  values (v_customer, 'roue', v_points, v_today);

  return query select v_index, v_points, v_streak;
end;
$$;

revoke execute on function public.loyalty_wheel_streak(uuid, date)
  from public, anon, authenticated;
revoke execute on function public.loyalty_wheel_customer(text, text)
  from public, anon, authenticated;
revoke execute on function public.loyalty_wheel_state(text, text)
  from public, anon, authenticated;
revoke execute on function public.loyalty_wheel_spin(text, text, jsonb, int, int)
  from public, anon, authenticated;
grant execute on function public.loyalty_wheel_state(text, text)
  to service_role;
grant execute on function public.loyalty_wheel_spin(text, text, jsonb, int, int)
  to service_role;
