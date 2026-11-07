-- La roue réglée par le gérant. Jusqu'ici, ses cases venaient du registre
-- du site (menu-data.ts) ; elles se règlent maintenant dans Réglages : un
-- budget (ce que la roue offre en lots, en moyenne, à chaque tour), des lots
-- — un article de la carte ou un lot hors carte, avec sa photo et son prix —,
-- la commande minimum et la roue dorée. Le site en tire les chances (chaque
-- lot reçoit une part égale du budget) et passe les cases au tirage, comme
-- avant.
--
-- Le bon gagné ne vise plus un palier de fidélité : il garde ce qu'il offre
-- (l'article, ou le nom et la photo du lot), et tient même si le gérant
-- retire le lot de sa roue. Un lot hors carte se commande comme un article
-- offert : une ligne à son nom sur le ticket, que l'équipe remet avec la
-- commande.

create table public.loyalty_wheels (
  etablissement_id uuid primary key
    references public.etablissements (id) on delete cascade,
  enabled boolean not null default true,
  -- Lots offerts en moyenne à chaque tour (€, prix de carte).
  budget numeric(8, 3) not null check (budget > 0),
  -- Marchandise payée (€) qui ouvre le tour du jour.
  min_order numeric(8, 2) not null check (min_order >= 0),
  -- Le golden_every-ième tour de la carte, puis tous les golden_every : points multipliés.
  golden_every int check (golden_every >= 2),
  golden_multiplier int check (golden_multiplier >= 2),
  updated_at timestamptz not null default now(),
  check ((golden_every is null) = (golden_multiplier is null))
);

create table public.loyalty_wheel_prizes (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null
    references public.loyalty_wheels (etablissement_id) on delete cascade,
  -- Un article de la carte : son prix suit la carte, son nom et sa photo
  -- aussi, sauf un nom court (label) ou une photo (image) posés pour la roue.
  item_id uuid references public.items (id) on delete cascade,
  label text check (char_length(btrim(label)) between 1 and 40),
  image text,
  -- La valeur d'un lot hors carte.
  price numeric(8, 2) check (price > 0),
  position int not null,
  check (item_id is not null or (label is not null and price is not null))
);

create index loyalty_wheel_prizes_etablissement_idx
  on public.loyalty_wheel_prizes (etablissement_id, position);

-- Lu par le gérant ; écrit par loyalty_wheel_save seulement.
alter table public.loyalty_wheels enable row level security;
alter table public.loyalty_wheel_prizes enable row level security;

create policy "gerant read" on public.loyalty_wheels
  for select to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant');
create policy "gerant read" on public.loyalty_wheel_prizes
  for select to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant');

-- La roue de Caffè Panis telle qu'elle tournait : commande de 5 €, roue
-- dorée au 5e tour, le café à 3 % (0,06 € de budget pour un café à 2 €),
-- avec la photo de sa tasse (#602).
insert into public.loyalty_wheels (etablissement_id, budget, min_order, golden_every, golden_multiplier)
select id, 0.06, 5, 5, 2 from public.etablissements where slug = 'caffe-panis';
insert into public.loyalty_wheel_prizes (etablissement_id, item_id, label, image, position)
select i.etablissement_id, i.id, 'Café', '/caffe-panis/roue/cafe-illy.webp', 0
from public.items i
join public.loyalty_wheels w on w.etablissement_id = i.etablissement_id
join public.etablissements e on e.id = i.etablissement_id
where e.slug = 'caffe-panis' and i.name = 'Café Illy'
limit 1;

-- ---------------------------------------------------------------------------
-- Le bon garde ce qu'il offre. Un bon d'avant, pour un palier, devient un
-- lot à son nom, remis avec la commande.

alter table public.loyalty_vouchers
  add column item_id uuid references public.items (id) on delete set null,
  add column label text,
  add column image text;

update public.loyalty_vouchers v
set label = r.label
from public.loyalty_rewards r
where r.id = v.reward_id;

alter table public.loyalty_vouchers
  drop column reward_id,
  alter column label set not null;

-- ---------------------------------------------------------------------------
-- Le tour : comme 20261106000002, une case lot à la place d'une case bon.
-- { "points": 0, "weight": 0.03, "prize": { "label": "Café", "item_id": …,
-- "image": …, "days": 14 } } écrit un bon pour ce lot ; la roue dorée
-- multiplie les points, pas les lots.

create or replace function public.loyalty_wheel_spin(
  p_slug text,
  p_token_hash text,
  p_slices jsonb,
  p_min_order numeric,
  p_golden_every int default null,
  p_golden_multiplier int default null
)
returns table (
  slice int,
  points int,
  spins int,
  voucher text,
  voucher_expires_at timestamptz
)
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
  v_prize jsonb;
  v_points int;
  v_entry uuid;
  v_expires timestamptz;
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
  v_slice := p_slices -> v_index;
  v_prize := v_slice -> 'prize';
  select count(*)::int + 1 into v_spins
  from loyalty_entries
  where customer_id = v_customer and kind = 'roue';

  if v_prize is not null then
    if nullif(btrim(v_prize ->> 'label'), '') is null then
      raise exception 'Lot sans nom.';
    end if;
    v_points := 0;
  else
    v_points := (v_slice ->> 'points')::int;
    if v_points is null or v_points <= 0 then
      raise exception 'Part sans points.';
    end if;
    if p_golden_every > 0 and v_spins % p_golden_every = 0 then
      v_points := v_points * p_golden_multiplier;
    end if;
  end if;

  insert into loyalty_entries (customer_id, order_id, kind, points, wheel_day)
  values (v_customer, v_order, 'roue', v_points, v_today)
  returning id into v_entry;

  if v_prize is not null then
    insert into loyalty_vouchers (customer_id, entry_id, item_id, label, image, expires_at)
    values (
      v_customer,
      v_entry,
      (v_prize ->> 'item_id')::uuid,
      v_prize ->> 'label',
      v_prize ->> 'image',
      now() + make_interval(days => (v_prize ->> 'days')::int)
    )
    returning expires_at into v_expires;
  end if;

  return query select v_index, v_points, v_spins, v_prize ->> 'label', v_expires;
end;
$$;

-- Les bons à utiliser de ce téléphone dans cette maison, le plus proche de
-- son échéance d'abord.

drop function public.loyalty_device_vouchers(text, text);

create function public.loyalty_device_vouchers(p_slug text, p_token_hash text)
returns table (id uuid, item_id uuid, label text, image text, expires_at timestamptz)
language sql stable security definer
set search_path = public
as $$
  select v.id, v.item_id, v.label, v.image, v.expires_at
  from loyalty_vouchers v
  where v.customer_id = loyalty_wheel_customer(p_slug, p_token_hash)
    and v.used_order_id is null
    and v.expires_at > now()
  order by v.expires_at;
$$;

-- L'historique de la carte : comme 20261106000002, le tour qui a gagné un
-- bon porte le nom de son lot.

create or replace function public.loyalty_device_history(p_slug text, p_token_hash text)
returns table (
  kind public.loyalty_entry_kind,
  points int,
  created_at timestamptz,
  table_number int,
  rewards text
)
language sql stable security definer
set search_path = public
as $$
  select
    le.kind,
    le.points,
    le.created_at,
    t.number,
    case le.kind
      when 'depense' then (
        select string_agg(oi.name, ', ' order by oi.name)
        from order_items oi
        where oi.order_id = le.order_id and oi.loyalty_points is not null
      )
      when 'roue' then (
        select v.label from loyalty_vouchers v where v.entry_id = le.id
      )
    end
  from etablissements e
  join loyalty_devices d on d.token_hash = p_token_hash
  join loyalty_customers lc
    on lc.etablissement_id = e.id and lc.contact = d.contact
  join loyalty_entries le on le.customer_id = lc.id
  left join orders o on o.id = le.order_id
  left join tables t on t.id = o.table_id
  where e.slug = p_slug and loyalty_active(e.id)
  order by le.created_at desc;
$$;

-- ---------------------------------------------------------------------------
-- La roue d'une maison, pour le menu : null sans roue allumée ou sans
-- programme de fidélité. Un lot de la carte prend le prix de la carte, et
-- son nom et sa photo sauf ceux posés pour la roue ; un lot à 0 € n'a pas de
-- chance calculable et reste hors de la roue.

create function public.loyalty_wheel_config(p_slug text)
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select jsonb_build_object(
    'budget', w.budget,
    'minOrder', w.min_order,
    'golden', case when w.golden_every is not null then
      jsonb_build_object('every', w.golden_every, 'multiplier', w.golden_multiplier) end,
    'prizes', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'itemId', p.item_id,
        'label', coalesce(p.label, i.name),
        'image', coalesce(p.image, i.image),
        'price', coalesce(i.price, p.price)
      )) order by p.position)
      from loyalty_wheel_prizes p
      left join items i on i.id = p.item_id
      where p.etablissement_id = w.etablissement_id
        and coalesce(i.price, p.price) > 0
    ), '[]'::jsonb)
  )
  from etablissements e
  join loyalty_wheels w on w.etablissement_id = e.id
  where e.slug = p_slug and w.enabled and loyalty_active(e.id);
$$;

-- Le gérant enregistre sa roue d'un coup : réglages et lots, dans l'ordre.
-- p_prizes : [{ "item_id": …, "label": …, "image": … } | { "label": …,
-- "image": …, "price": … }].

create function public.loyalty_wheel_save(
  p_etablissement_id uuid,
  p_enabled boolean,
  p_budget numeric,
  p_min_order numeric,
  p_golden_every int,
  p_golden_multiplier int,
  p_prizes jsonb
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_prize jsonb;
  v_position int := 0;
begin
  if current_member_role(p_etablissement_id) is distinct from 'gerant' then
    raise exception 'Seul le gérant règle la roue.';
  end if;
  insert into loyalty_wheels (
    etablissement_id, enabled, budget, min_order, golden_every, golden_multiplier, updated_at
  )
  values (
    p_etablissement_id, p_enabled, p_budget, p_min_order, p_golden_every, p_golden_multiplier, now()
  )
  on conflict (etablissement_id) do update set
    enabled = excluded.enabled,
    budget = excluded.budget,
    min_order = excluded.min_order,
    golden_every = excluded.golden_every,
    golden_multiplier = excluded.golden_multiplier,
    updated_at = now();

  delete from loyalty_wheel_prizes where etablissement_id = p_etablissement_id;
  for v_prize in select value from jsonb_array_elements(coalesce(p_prizes, '[]'::jsonb)) loop
    if v_prize ->> 'item_id' is not null and not exists (
      select 1 from items
      where id = (v_prize ->> 'item_id')::uuid and etablissement_id = p_etablissement_id
    ) then
      raise exception 'Cet article n''est pas sur votre carte.';
    end if;
    insert into loyalty_wheel_prizes (etablissement_id, item_id, label, image, price, position)
    values (
      p_etablissement_id,
      (v_prize ->> 'item_id')::uuid,
      nullif(btrim(v_prize ->> 'label'), ''),
      nullif(v_prize ->> 'image', ''),
      case when v_prize ->> 'item_id' is null then (v_prize ->> 'price')::numeric end,
      v_position
    );
    v_position := v_position + 1;
  end loop;
end;
$$;

-- Ce que la roue a donné depuis son lancement : les tours, les points, et
-- pour chaque lot, les bons gagnés et ceux déjà utilisés.

create function public.loyalty_wheel_stats(p_etablissement_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
begin
  if current_member_role(p_etablissement_id) is distinct from 'gerant' then
    raise exception 'Seul le gérant voit les résultats de la roue.';
  end if;
  return jsonb_build_object(
    'spins', (
      select count(*) from loyalty_entries le
      join loyalty_customers lc on lc.id = le.customer_id
      where lc.etablissement_id = p_etablissement_id and le.kind = 'roue'
    ),
    'points', (
      select coalesce(sum(le.points), 0) from loyalty_entries le
      join loyalty_customers lc on lc.id = le.customer_id
      where lc.etablissement_id = p_etablissement_id and le.kind = 'roue'
    ),
    'prizes', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'won', won, 'used', used) order by won desc)
      from (
        select v.label, count(*) as won, count(v.used_order_id) as used
        from loyalty_vouchers v
        join loyalty_customers lc on lc.id = v.customer_id
        where lc.etablissement_id = p_etablissement_id
        group by v.label
      ) totals
    ), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.loyalty_device_vouchers(text, text)
  from public, anon, authenticated;
revoke execute on function public.loyalty_wheel_config(text)
  from public, anon, authenticated;
revoke execute on function public.loyalty_wheel_save(uuid, boolean, numeric, numeric, int, int, jsonb)
  from public, anon;
revoke execute on function public.loyalty_wheel_stats(uuid)
  from public, anon;
grant execute on function public.loyalty_device_vouchers(text, text) to service_role;
grant execute on function public.loyalty_wheel_config(text) to service_role;
grant execute on function public.loyalty_wheel_save(uuid, boolean, numeric, numeric, int, int, jsonb)
  to authenticated;
grant execute on function public.loyalty_wheel_stats(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- place_order : reprise de 20261106000002. Un bon de la roue n'a plus de
-- palier : sa ligne porte voucher_id seul. Avec l'article du bon, celui-ci à
-- une unité, sans points ; sans article, le lot hors carte, une ligne à son
-- nom à 0 €. Ni l'un ni l'autre ne compte comme un article à régler.

create or replace function public.place_order(
  p_slug text,
  p_table_number int,
  p_items jsonb,
  p_online_payment boolean default false,
  p_loyalty_contact text default null,
  p_collect jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_etab uuid;
  v_offre public.offre;
  v_table uuid;
  v_order uuid;
  v_line jsonb;
  v_item public.items;
  v_qty int;
  v_supplement numeric;
  v_options jsonb;
  v_choice jsonb;
  v_group jsonb;
  v_opt jsonb;
  v_found boolean;
  v_count int;
  v_role public.member_role;
  v_tarifs jsonb;
  v_prix numeric;
  v_format numeric;
  v_online boolean;
  v_customer uuid;
  v_reward_points int;
  v_cost int := 0;
  v_paid numeric := 0;
  v_balance int;
  v_formule record;
  v_mode public.service_mode;
  v_hours jsonb;
  v_slot int;
  v_capacity int;
  v_name text;
  v_phone text;
  v_pickup timestamptz;
  v_note text;
  v_counter boolean;
  v_notice record;
  v_min numeric;
  v_fermes jsonb;
  v_ferme text;
  v_ferme_message text;
  v_accord public.accord_source;
  v_lot text;
begin
  select id, offre, online_payment, service_mode,
         opening_hours, collect_slot_minutes, collect_slot_capacity,
         online_min_order
  into v_etab, v_offre, v_online, v_mode, v_hours, v_slot, v_capacity, v_min
  from etablissements where slug = p_slug;
  if v_etab is null then
    raise exception 'Établissement introuvable.';
  end if;
  v_role := current_member_role(v_etab);
  -- Commande à emporter prise par l'équipe, réglée au retrait.
  v_counter := p_collect is not null
    and coalesce((p_collect->>'pay_at_pickup')::boolean, false);
  if v_counter and (v_role is null or v_role not in ('gerant', 'serveur')) then
    raise exception 'Seule l''équipe enregistre une commande réglée au retrait.';
  end if;
  if p_collect is not null then
    -- Click & collect : payé en ligne à la commande, retiré à l'heure choisie.
    if not exists (
      select 1 from subscriptions
      where etablissement_id = v_etab and product = 'collect' and status = 'active'
    ) then
      raise exception 'Le click & collect n''est pas activé pour cet établissement.';
    end if;
    if not v_online and not v_counter then
      raise exception 'Le click & collect n''est pas encore ouvert pour cet établissement.';
    end if;
    v_name := nullif(btrim(p_collect->>'name'), '');
    v_phone := nullif(btrim(p_collect->>'phone'), '');
    if v_name is null or v_phone is null then
      raise exception 'Indiquez votre nom et votre téléphone.';
    end if;
    v_note := nullif(btrim(p_collect->>'note'), '');
    v_pickup := nullif(p_collect->>'pickup_at', '')::timestamptz;
    -- Une commande à la fois par établissement. Le créneau ne compte que les
    -- commandes payées ou prises par l'équipe : des clients qui paient en
    -- même temps peuvent le dépasser de quelques commandes, plutôt qu'une
    -- tentative abandonnée le bloque.
    perform 1 from etablissements where id = v_etab for update;
    if v_counter then
      -- L'équipe choisit l'heure qu'elle a convenue avec le client, hors
      -- grille et au-delà de la capacité, mais jamais boutique fermée.
      if v_pickup is null or v_pickup <= now()
         or not collect_open_at(v_hours, v_pickup) then
        raise exception 'Choisissez une heure de retrait à venir, pendant les horaires d''ouverture.';
      end if;
    elsif v_pickup is null then
      if not collect_open_at(v_hours, now()) then
        raise exception 'Le restaurant est fermé en ce moment : choisissez un créneau de retrait.';
      end if;
    else
      -- Au plus tôt le créneau qui suit celui en cours, aligné sur la grille,
      -- pendant les horaires d'ouverture.
      if v_pickup < now() + make_interval(mins => v_slot)
         or extract(epoch from v_pickup)::bigint % (v_slot * 60) <> 0
         or not collect_open_at(v_hours, v_pickup) then
        raise exception 'Ce créneau de retrait n''est plus disponible : choisissez-en un autre.';
      end if;
      if (
        select count(*) from orders
        where etablissement_id = v_etab and type = 'collect'
          and (paid_online or online_payment_started_at is null)
          and pickup_at = v_pickup and status <> 'annulee'
      ) >= v_capacity then
        raise exception 'Ce créneau est complet : choisissez-en un autre.';
      end if;
    end if;
    -- Délai de commande : l'article qui en demande le plus fixe le retrait
    -- au plus tôt. Sans heure choisie (« dès que possible »), il n'y a pas
    -- de délai qui tienne.
    if not v_counter then
      select i.name, i.notice_hours into v_notice
      from items i
      where i.etablissement_id = v_etab
        and i.notice_hours is not null
        and i.id in (
          select (value->>'item_id')::uuid
          from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as t(value)
          where value->>'item_id' is not null
        )
      order by i.notice_hours desc
      limit 1;
      if v_notice.notice_hours is not null and (
        v_pickup is null
        or v_pickup < now() + make_interval(hours => v_notice.notice_hours)
      ) then
        raise exception '%', format(
          '« %s » se commande %s h à l''avance : choisissez un retrait plus tard.',
          v_notice.name, v_notice.notice_hours
        );
      end if;
    end if;
  else
    -- La commande à table est une capacité des offres Smart et Connect.
    if v_offre not in ('smart', 'connect') then
      raise exception 'La commande en ligne n''est pas activée pour cet établissement.';
    end if;

    if v_mode = 'restaurant' then
      -- Sans table, seule une carte fast food restée ouverte d'avant le retour
      -- au service à table commande encore.
      if p_table_number is null then
        raise exception 'La carte a changé : rechargez la page.';
      end if;
      select id into v_table from tables
      where etablissement_id = v_etab and number = p_table_number;
      if v_table is null then
        if p_table_number < 1
           or v_role is null or v_role not in ('gerant', 'serveur') then
          raise exception 'Table introuvable.';
        end if;
        insert into tables (etablissement_id, number)
        values (v_etab, p_table_number)
        returning id into v_table;
      end if;
    elsif p_table_number is not null then
      -- Fast food : la table du QR est notée quand elle existe ; un numéro
      -- inconnu ne bloque pas la commande, qui part sans table.
      select id into v_table from tables
      where etablissement_id = v_etab and number = p_table_number;
    end if;
  end if;

  v_count := jsonb_array_length(coalesce(p_items, '[]'::jsonb));
  if v_count = 0 then
    raise exception 'Commande vide.';
  end if;
  if v_count > 50 then
    raise exception 'Trop d''articles dans la commande.';
  end if;

  if not exists (
    select 1 from jsonb_array_elements(p_items) as t(value)
    where value->>'reward_id' is null and value->>'voucher_id' is null
  ) then
    raise exception 'Un article offert accompagne une commande : ajoutez au moins un article à régler.';
  end if;

  -- Un contact laissé alors que le programme vient de s'éteindre (menu en
  -- cache) est ignoré : la commande passe, sans points.
  if nullif(btrim(p_loyalty_contact), '') is not null and loyalty_active(v_etab) then
    insert into loyalty_customers (etablissement_id, contact)
    values (v_etab, loyalty_contact(p_loyalty_contact))
    on conflict (etablissement_id, contact) do nothing;
    select id into v_customer from loyalty_customers
    where etablissement_id = v_etab and contact = loyalty_contact(p_loyalty_contact)
    for update;
  end if;

  -- Les tarifs planifiés une seule fois pour toute la commande : deux lignes
  -- d'une même addition ne peuvent pas tomber de part et d'autre de minuit.
  -- Clé « article », ou « article:choix » pour un tarif posé sur un format.
  select coalesce(jsonb_object_agg(
    item_id::text || coalesce(':' || choice_id, ''), price
  ), '{}'::jsonb)
  into v_tarifs
  from tarifs_actifs(v_etab);

  -- Les fermetures, elles aussi une seule fois, à l'heure du retrait pour le
  -- click & collect. Seul le client s'y heurte : l'équipe qui prend la
  -- commande vient de voir la cuisine.
  if v_role is null then
    select coalesce(jsonb_object_agg(ferme.id::text, true), '{}'::jsonb)
    into v_fermes
    from articles_fermes(v_etab, coalesce(v_pickup, now())) as ferme(id);
  else
    v_fermes := '{}'::jsonb;
  end if;
  v_ferme_message := case when v_pickup is null
    then 'Plus servi en ce moment : %s.'
    else 'Plus servi à l''heure du retrait : %s.'
  end;

  -- Le client a choisi de régler en ligne : la commande attend ce
  -- règlement hors de l'onglet À encaisser (awaitsOnlinePayment côté
  -- gestion). Le choix n'est retenu que si l'établissement propose le
  -- paiement en ligne — sans quoi un appel forgé soustrairait une addition
  -- au comptoir. Prise par l'équipe, la commande à emporter n'attend rien :
  -- elle part en préparation, réglée au retrait.
  insert into orders (
    etablissement_id, table_id, online_payment_started_at, loyalty_customer_id,
    type, status, customer_name, customer_phone, pickup_at, customer_note
  )
  values (
    v_etab, v_table,
    case when (p_online_payment or p_collect is not null) and v_online and not v_counter
      then now() end,
    v_customer,
    case when p_collect is null then 'sur_place' else 'collect' end::public.order_type,
    case when v_counter then 'en_preparation' else 'en_attente' end::public.order_status,
    v_name, v_phone, v_pickup, v_note
  )
  returning id into v_order;

  for v_line in select value from jsonb_array_elements(p_items) as t(value)
  loop
    v_qty := coalesce((v_line->>'quantity')::int, 0);
    if v_qty < 1 or v_qty > 99 then
      raise exception 'Quantité invalide.';
    end if;
    -- D'où vient la ligne : une valeur inconnue (menu plus récent ou appel
    -- forgé) ne bloque pas la commande, elle n'est simplement pas retenue.
    v_accord := case when v_line->>'accord' in ('panier', 'fiche', 'formule')
      then (v_line->>'accord')::public.accord_source end;

    -- Bon d'un lot hors carte : une ligne à son nom, offerte, que l'équipe
    -- remet avec la commande.
    if v_line->>'voucher_id' is not null and v_line->>'item_id' is null
       and v_line->>'formule_id' is null then
      if v_customer is null then
        raise exception 'Indiquez votre numéro ou votre email pour utiliser votre bon.';
      end if;
      if v_qty <> 1 then
        raise exception 'Un bon offre un seul article.';
      end if;
      update loyalty_vouchers
      set used_order_id = v_order
      where id = (v_line->>'voucher_id')::uuid
        and customer_id = v_customer
        and item_id is null
        and used_order_id is null
        and expires_at > now()
      returning label into v_lot;
      if not found then
        raise exception 'Ce bon n''est plus valable.';
      end if;
      insert into order_items (
        order_id, item_id, name, quantity, unit_price, options, vat_rate, loyalty_points
      )
      values (v_order, null, v_lot, 1, 0, '[]'::jsonb, null, 0);
      continue;
    end if;

    -- Formule : une seule ligne, au prix de la formule plus les suppléments
    -- de ce qui a été choisi ; le détail des choix part en options, lisible
    -- sur le ticket comme celles d'un article.
    if v_line->>'formule_id' is not null then
      select * into v_formule from formule_line(v_etab, v_line);
      select c.value->>'name' into v_ferme
      from jsonb_array_elements(v_formule.components) as c(value)
      where v_fermes ? (c.value->>'item_id')
      limit 1;
      if v_ferme is not null then
        raise exception '%', format(v_ferme_message, v_ferme);
      end if;
      v_paid := v_paid + v_formule.unit_price * v_qty;
      insert into order_items (
        order_id, item_id, name, quantity, unit_price, options, vat_rate, components,
        accord
      )
      values (
        v_order, null, v_formule.name, v_qty, v_formule.unit_price,
        v_formule.options, v_formule.vat_rate, v_formule.components, v_accord
      );
      continue;
    end if;

    -- for update : sérialise les commandes concurrentes sur le même item,
    -- le test de stock ci-dessous lit donc une valeur à jour.
    select * into v_item from items
    where id = (v_line->>'item_id')::uuid and etablissement_id = v_etab
    for update;
    if not found then
      raise exception 'Article introuvable.';
    end if;
    if not v_item.disponible then
      raise exception 'Article indisponible : %.', v_item.name;
    end if;
    if v_fermes ? v_item.id::text then
      raise exception '%', format(v_ferme_message, v_item.name);
    end if;
    if v_item.stock is not null and v_item.stock < v_qty then
      raise exception 'Stock insuffisant pour : %.', v_item.name;
    end if;

    -- Options : valider chaque choix contre item.options et figer nom + supplément.
    v_supplement := 0;
    v_format := null;
    v_options := '[]'::jsonb;
    for v_choice in
      select value from jsonb_array_elements(coalesce(v_line->'choices', '[]'::jsonb)) as t(value)
    loop
      v_found := false;
      for v_group in select value from jsonb_array_elements(v_item.options) as t(value)
      loop
        if v_group->>'id' = v_choice->>'group_id' then
          for v_opt in select value from jsonb_array_elements(v_group->'choices') as t(value)
          loop
            if v_opt->>'id' = v_choice->>'choice_id' then
              if (v_opt->>'disponible')::boolean is false then
                raise exception 'Plus disponible : % (%).', v_opt->>'name', v_item.name;
              end if;
              v_supplement := v_supplement + coalesce((v_opt->>'supplement')::numeric, 0);
              v_options := v_options || jsonb_build_array(jsonb_build_object(
                'groupName', v_group->>'name',
                'choiceName', v_opt->>'name',
                'supplement', coalesce((v_opt->>'supplement')::numeric, 0)
              ));
              -- Un tarif sur ce format fixe le prix entier de l'article
              -- servi ainsi : la base s'en déduit, le supplément s'y ajoute.
              if v_tarifs ? (v_item.id::text || ':' || (v_opt->>'id')) then
                v_format := (v_tarifs->>(v_item.id::text || ':' || (v_opt->>'id')))::numeric
                  - coalesce((v_opt->>'supplement')::numeric, 0);
              end if;
              v_found := true;
            end if;
          end loop;
        end if;
      end loop;
      if not v_found then
        raise exception 'Option invalide pour : %.', v_item.name;
      end if;
    end loop;

    -- Groupes obligatoires : un choix requis.
    for v_group in select value from jsonb_array_elements(v_item.options) as t(value)
    loop
      if coalesce((v_group->>'obligatoire')::boolean, false)
         and not exists (
           select 1
           from jsonb_array_elements(coalesce(v_line->'choices', '[]'::jsonb)) as c(value)
           where c.value->>'group_id' = v_group->>'id'
         ) then
        raise exception 'Choix obligatoire manquant pour : %.', v_item.name;
      end if;
    end loop;

    -- Ligne offerte : l'article en points, ses suppléments en euros.
    -- Sinon le tarif du format choisi, celui de l'article, ou la fiche ; les
    -- suppléments d'options ne sont pas ajustés, ils s'ajoutent au prix retenu.
    v_reward_points := null;
    if v_line->>'reward_id' is not null then
      if v_customer is null then
        raise exception '%', case
          when nullif(btrim(p_loyalty_contact), '') is null
            then 'Indiquez votre numéro ou votre email pour utiliser vos points.'
          else 'Le programme de fidélité n''est plus proposé par cet établissement.'
        end;
      end if;
      select r.points into v_reward_points
      from loyalty_rewards r
      join loyalty_reward_items ri on ri.reward_id = r.id
      where r.id = (v_line->>'reward_id')::uuid
        and r.etablissement_id = v_etab
        and ri.item_id = v_item.id;
      if v_reward_points is null then
        raise exception 'Cet article ne s''obtient pas avec des points : %.', v_item.name;
      end if;
      v_cost := v_cost + v_reward_points * v_qty;
      v_prix := 0;
    elsif v_line->>'voucher_id' is not null then
      -- Bon de la roue pour cet article : une unité, sans points ; ses
      -- suppléments restent en euros.
      if v_customer is null then
        raise exception 'Indiquez votre numéro ou votre email pour utiliser votre bon.';
      end if;
      if v_qty <> 1 then
        raise exception 'Un bon offre un seul article.';
      end if;
      update loyalty_vouchers
      set used_order_id = v_order
      where id = (v_line->>'voucher_id')::uuid
        and customer_id = v_customer
        and item_id = v_item.id
        and used_order_id is null
        and expires_at > now();
      if not found then
        raise exception 'Ce bon n''est plus valable.';
      end if;
      v_reward_points := 0;
      v_prix := 0;
    else
      v_prix := coalesce(v_format, (v_tarifs->>v_item.id::text)::numeric, v_item.price);
    end if;
    v_paid := v_paid + (v_prix + v_supplement) * v_qty;

    insert into order_items (
      order_id, item_id, name, quantity, unit_price, options, vat_rate, loyalty_points,
      accord
    )
    values (
      v_order, v_item.id, v_item.name, v_qty, v_prix + v_supplement, v_options,
      v_item.vat_rate, v_reward_points, v_accord
    );

    if v_item.stock is not null then
      update items set stock = stock - v_qty where id = v_item.id;
    end if;
  end loop;

  if v_cost > 0 then
    select coalesce(sum(points), 0) into v_balance
    from loyalty_entries where customer_id = v_customer;
    if v_balance < v_cost then
      raise exception 'Points insuffisants : % disponibles, % demandés.', v_balance, v_cost;
    end if;
    insert into loyalty_entries (customer_id, order_id, kind, points)
    values (v_customer, v_order, 'depense', -v_cost);
  end if;

  -- Rien à payer en euros : pas de règlement en ligne à attendre, la salle
  -- valide l'addition à zéro comme une autre.
  if v_paid = 0 then
    if p_collect is not null then
      raise exception 'Rien à régler : ajoutez un article à votre commande.';
    end if;
    update orders set online_payment_started_at = null where id = v_order;
  end if;

  -- Commande minimum en ligne, pourboire non compris (il n'est pas encore
  -- choisi) : sous ce montant, la carte coûte au restaurant plus qu'elle ne
  -- lui rend. Le menu ne le propose pas ; un panier resté ouvert pendant
  -- que le gérant changeait le réglage tombe ici. Réglée au comptoir, la
  -- commande prise par l'équipe n'est pas concernée.
  if v_min is not null and v_paid > 0 and v_paid < v_min and not v_counter
     and (p_collect is not null or (p_online_payment and v_online)) then
    raise exception '%', format(
      case when p_collect is not null
        then 'Commande minimum : %s €.'
        else 'Paiement en ligne dès %s € : réglez au comptoir.'
      end,
      replace(to_char(v_min, 'FM999990.00'), '.', ',')
    );
  end if;

  return v_order;
end;
$$;
