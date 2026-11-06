-- Les bons de la roue. Une case peut porter un lot en nature au lieu de
-- points : un bon pour le palier de fidélité de ce prix dans la maison (à
-- Caffè Panis, 50 points : « 1 café Illy ou soft offert »), valable quelques
-- jours. Le bon s'utilise comme le palier, mais sans points, une fois, avec
-- au moins un article à régler (place_order le demande déjà pour tout
-- article offert). Une maison sans palier à ce prix crédite les points.
--
-- Le bon tient au tour qui l'a gagné : la commande du tour annulée, le tour
-- part et son bon avec. Annulée, la commande qui l'avait utilisé le rend.

create table public.loyalty_vouchers (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null
    references public.loyalty_customers (id) on delete cascade,
  -- Le tour de roue qui l'a gagné.
  entry_id uuid not null unique
    references public.loyalty_entries (id) on delete cascade,
  reward_id uuid not null
    references public.loyalty_rewards (id) on delete cascade,
  expires_at timestamptz not null,
  -- Une commande expirée (paiement en ligne abandonné) disparaît : le bon revient.
  used_order_id uuid references public.orders (id) on delete set null,
  created_at timestamptz not null default now()
);

create index loyalty_vouchers_customer_idx on public.loyalty_vouchers (customer_id);
create index loyalty_vouchers_used_order_idx on public.loyalty_vouchers (used_order_id)
  where used_order_id is not null;

-- Lu et écrit par les fonctions (security definer) seulement.
alter table public.loyalty_vouchers enable row level security;

-- Un tour gagnant un bon ne crédite pas de points : sa ligne en porte zéro.
alter table public.loyalty_entries
  drop constraint loyalty_entries_points_check;
alter table public.loyalty_entries
  add constraint loyalty_entries_points_check check (points <> 0 or kind = 'roue');

-- L'article offert par un bon : zéro point (« bon de la roue » en salle).
alter table public.order_items
  drop constraint order_items_loyalty_points_check;
alter table public.order_items
  add constraint order_items_loyalty_points_check check (loyalty_points >= 0);

-- ---------------------------------------------------------------------------
-- Le tour : comme 20261106000001, plus le bon. Une part
-- { "points": 50, "weight": 300, "voucher": { "days": 14 } } donne un bon
-- pour le palier à 50 points de la maison, valable 14 jours ; la roue dorée
-- double les points, pas les bons.

drop function public.loyalty_wheel_spin(text, text, jsonb, numeric, int, int);

create function public.loyalty_wheel_spin(
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
  v_points int;
  v_reward uuid;
  v_label text;
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
  v_points := (v_slice ->> 'points')::int;
  if v_points is null or v_points <= 0 then
    raise exception 'Part sans points.';
  end if;
  select count(*)::int + 1 into v_spins
  from loyalty_entries
  where customer_id = v_customer and kind = 'roue';

  if v_slice ? 'voucher' then
    select r.id, r.label into v_reward, v_label
    from loyalty_rewards r
    join loyalty_customers lc on lc.etablissement_id = r.etablissement_id
    where lc.id = v_customer and r.points = v_points
    order by r.created_at
    limit 1;
  end if;

  if v_reward is not null then
    v_points := 0;
  elsif p_golden_every > 0 and v_spins % p_golden_every = 0 then
    v_points := v_points * p_golden_multiplier;
  end if;

  insert into loyalty_entries (customer_id, order_id, kind, points, wheel_day)
  values (v_customer, v_order, 'roue', v_points, v_today)
  returning id into v_entry;

  if v_reward is not null then
    insert into loyalty_vouchers (customer_id, entry_id, reward_id, expires_at)
    values (
      v_customer,
      v_entry,
      v_reward,
      now() + make_interval(days => (v_slice -> 'voucher' ->> 'days')::int)
    )
    returning expires_at into v_expires;
  end if;

  return query select v_index, v_points, v_spins, v_label, v_expires;
end;
$$;

-- ---------------------------------------------------------------------------
-- Les bons à utiliser de ce téléphone dans cette maison, le plus proche de
-- son échéance d'abord.

create function public.loyalty_device_vouchers(p_slug text, p_token_hash text)
returns table (id uuid, reward_id uuid, label text, expires_at timestamptz)
language sql stable security definer
set search_path = public
as $$
  select v.id, v.reward_id, r.label, v.expires_at
  from loyalty_vouchers v
  join loyalty_rewards r on r.id = v.reward_id
  where v.customer_id = loyalty_wheel_customer(p_slug, p_token_hash)
    and v.used_order_id is null
    and v.expires_at > now()
  order by v.expires_at;
$$;

-- L'historique de la carte : comme 20261019000002, le tour qui a gagné un
-- bon porte le nom du palier.

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
        select r.label
        from loyalty_vouchers v
        join loyalty_rewards r on r.id = v.reward_id
        where v.entry_id = le.id
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

-- Annulation : comme 20260924000001, et le bon utilisé par la commande revient.
-- Le tour gagné par la commande part avec ses lignes, son bon avec lui.

create or replace function public.loyalty_cancel()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.status = 'annulee' and old.status <> 'annulee' then
    delete from loyalty_entries where order_id = new.id;
    update loyalty_vouchers set used_order_id = null where used_order_id = new.id;
  end if;
  return new;
end;
$$;

revoke execute on function public.loyalty_wheel_spin(text, text, jsonb, numeric, int, int)
  from public, anon, authenticated;
revoke execute on function public.loyalty_device_vouchers(text, text)
  from public, anon, authenticated;
grant execute on function public.loyalty_wheel_spin(text, text, jsonb, numeric, int, int)
  to service_role;
grant execute on function public.loyalty_device_vouchers(text, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- place_order : reprise de 20261023000008. Seule change la ligne offerte
-- qui porte un bon de la roue (voucher_id, avec le reward_id de son palier) :
-- l'article du palier, à une unité, sans points ; le bon est marqué utilisé
-- par la commande, et l'article enregistré à 0 point (« bon de la roue »).

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
    where value->>'reward_id' is null
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
      -- Bon de la roue : l'article du palier, à une unité, sans points.
      if v_line->>'voucher_id' is not null then
        if v_qty <> 1 then
          raise exception 'Un bon offre un seul article.';
        end if;
        update loyalty_vouchers
        set used_order_id = v_order
        where id = (v_line->>'voucher_id')::uuid
          and customer_id = v_customer
          and reward_id = (v_line->>'reward_id')::uuid
          and used_order_id is null
          and expires_at > now();
        if not found then
          raise exception 'Ce bon n''est plus valable.';
        end if;
        v_reward_points := 0;
      end if;
      v_cost := v_cost + v_reward_points * v_qty;
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

