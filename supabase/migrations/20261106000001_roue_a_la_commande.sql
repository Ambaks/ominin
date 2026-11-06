-- La roue à la commande. Le tour du jour ne s'offre plus à un téléphone qui a
-- un jour commandé : il se gagne avec une commande réglée le jour même (jour
-- de Paris), d'au moins p_min_order € de marchandise payée — la base des
-- points (loyalty_earn) : ni pourboire, ni articles offerts. Toujours un tour
-- par carte et par jour.
--
-- Le tour porte la commande qui l'a ouvert : annulée, elle l'emporte avec ses
-- points (loyalty_cancel efface les lignes de la commande), et elle n'en ouvre
-- jamais deux (loyalty_entries_order_kind_idx). La roue dorée vient chaque
-- p_golden_every-ième tour de la carte, sans série de jours à tenir.

alter table public.loyalty_entries
  drop constraint loyalty_entries_order_kind;
alter table public.loyalty_entries
  add constraint loyalty_entries_order_kind check (
    case kind
      when 'ajustement' then order_id is null
      -- Les tours d'avant la roue à la commande n'en portent pas.
      when 'roue' then true
      else order_id is not null
    end
  );

drop function public.loyalty_wheel_spin(text, text, jsonb, int, int);
drop function public.loyalty_wheel_state(text, text);
drop function public.loyalty_wheel_customer(text, text);
drop function public.loyalty_wheel_streak(uuid, date);

-- La carte du téléphone dans cette maison, programme ouvert.
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
    and loyalty_active(e.id);
$$;

-- La commande qui ouvre le tour de p_day : la dernière réglée ce jour-là,
-- d'au moins p_min_order € de marchandise payée.
create function public.loyalty_wheel_order(
  p_customer uuid,
  p_day date,
  p_min_order numeric
)
returns uuid
language sql stable
set search_path = public
as $$
  select g.order_id
  from loyalty_entries g
  where g.customer_id = p_customer
    and g.kind = 'gain'
    and (g.created_at at time zone 'Europe/Paris')::date = p_day
    and (
      select coalesce(sum(oi.quantity * oi.unit_price), 0)
      from order_items oi
      where oi.order_id = g.order_id and oi.loyalty_points is null
    ) >= p_min_order
  order by g.created_at desc
  limit 1;
$$;

-- Où en est la roue pour ce téléphone : rien (pas de carte ici), ou le tour
-- du jour à jouer (une commande l'a ouvert), déjà joué, et les tours joués.
create function public.loyalty_wheel_state(
  p_slug text,
  p_token_hash text,
  p_min_order numeric
)
returns table (ready boolean, played_today boolean, spins int)
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
    not v_played and loyalty_wheel_order(v_customer, v_today, p_min_order) is not null,
    v_played,
    (
      select count(*)::int from loyalty_entries
      where customer_id = v_customer and kind = 'roue'
    );
end;
$$;

-- Le tour : la part tirée au prorata des poids, ses points — multipliés au
-- tour de la roue dorée —, la ligne de la carte, rattachée à la commande.
-- p_slices : [{ "points": 2, "weight": 30 }, …].
create function public.loyalty_wheel_spin(
  p_slug text,
  p_token_hash text,
  p_slices jsonb,
  p_min_order numeric,
  p_golden_every int default null,
  p_golden_multiplier int default null
)
returns table (slice int, points int, spins int)
language plpgsql security definer
set search_path = public
as $$
declare
  v_customer uuid := loyalty_wheel_customer(p_slug, p_token_hash);
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_order uuid;
  v_spins int;
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
  v_order := loyalty_wheel_order(v_customer, v_today, p_min_order);
  if v_order is null then
    raise exception 'Le tour se gagne avec une commande réglée aujourd’hui.';
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
  v_points := (p_slices -> v_index ->> 'points')::int;
  if v_points is null or v_points <= 0 then
    raise exception 'Part sans points.';
  end if;
  select count(*)::int + 1 into v_spins
  from loyalty_entries
  where customer_id = v_customer and kind = 'roue';
  if p_golden_every > 0 and v_spins % p_golden_every = 0 then
    v_points := v_points * p_golden_multiplier;
  end if;
  insert into loyalty_entries (customer_id, order_id, kind, points, wheel_day)
  values (v_customer, v_order, 'roue', v_points, v_today);
  return query select v_index, v_points, v_spins;
end;
$$;

revoke execute on function public.loyalty_wheel_customer(text, text)
  from public, anon, authenticated;
revoke execute on function public.loyalty_wheel_order(uuid, date, numeric)
  from public, anon, authenticated;
revoke execute on function public.loyalty_wheel_state(text, text, numeric)
  from public, anon, authenticated;
revoke execute on function public.loyalty_wheel_spin(text, text, jsonb, numeric, int, int)
  from public, anon, authenticated;
grant execute on function public.loyalty_wheel_state(text, text, numeric)
  to service_role;
grant execute on function public.loyalty_wheel_spin(text, text, jsonb, numeric, int, int)
  to service_role;
