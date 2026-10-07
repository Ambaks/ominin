-- Click & collect sur la carte du menu QR. La page collect.ominin.com/<slug>
-- commande désormais par place_order, comme le menu : mêmes articles,
-- formules, tarifs et fidélité, et le paiement en ligne sur le compte du
-- restaurant (Stripe connecté ou Square) au lieu du compte d'Ominin. Le
-- panier intermédiaire (collect_pending) et sa conversion au webhook
-- disparaissent : la commande existe avant son paiement, hors de la caisse,
-- comme une commande à table réglée en ligne, et l'expiration du paiement la
-- supprime de la même façon.

-- ---------------------------------------------------------------------------
-- Horaires d'ouverture structurés : { "1": [["11:30","14:30"], ["18:30","22:30"]], … }
-- (1 = lundi … 7 = dimanche, heures de Paris, fermeture exclue). Le champ
-- libre `hours` reste le texte affiché ; l'espace de gestion le réécrit
-- depuis ces plages. Sans horaires, le click & collect ne prend rien.
-- Commission du click & collect : posée à l'activation, au taux signé.
-- Créneaux de retrait : leur durée, la capacité existante s'y applique.

alter table public.etablissements
  add column opening_hours jsonb,
  add column collect_fee_percent numeric(5,2) check (collect_fee_percent >= 0),
  add column collect_slot_minutes int not null default 15
    check (collect_slot_minutes > 0);

create function public.collect_open_at(p_hours jsonb, p_at timestamptz)
returns boolean
language sql stable
set search_path = public
as $$
  select exists (
    select 1
    from jsonb_array_elements(
      coalesce(
        p_hours -> extract(isodow from p_at at time zone 'Europe/Paris')::int::text,
        '[]'::jsonb
      )
    ) as r(v)
    where (p_at at time zone 'Europe/Paris')::time >= (r.v->>0)::time
      and (p_at at time zone 'Europe/Paris')::time < (r.v->>1)::time
  );
$$;

-- Créneaux complets d'une période : la page de commande les retire de la
-- liste. Seuls des horaires sortent, jamais une commande.
create function public.collect_full_slots(p_slug text, p_from timestamptz, p_to timestamptz)
returns setof timestamptz
language sql stable security definer
set search_path = public
as $$
  select o.pickup_at
  from orders o
  join etablissements e on e.id = o.etablissement_id
  where e.slug = p_slug
    and o.type = 'collect'
    and o.paid_online
    and o.status <> 'annulee'
    and o.pickup_at >= p_from and o.pickup_at < p_to
  group by o.pickup_at
  having count(*) >= max(e.collect_slot_capacity);
$$;

revoke execute on function public.collect_full_slots(text, timestamptz, timestamptz) from public;
grant execute on function public.collect_full_slots(text, timestamptz, timestamptz) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Tickets : une commande collect naît avant son paiement ; elle imprime quand
-- il aboutit, plus à sa création. Reprise de 20261004000001.

create or replace function public.sync_order_tickets()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status
     and new.status in ('servie', 'retiree', 'annulee') then
    update print_jobs set status = 'cancelled'
    where order_id = new.id and status = 'pending';
  end if;
  if tg_op = 'UPDATE' and (
       (new.type = 'collect' and new.paid_online and not old.paid_online)
       or (old.status = 'en_attente' and new.status in ('payee', 'servie'))
     ) then
    insert into print_jobs (etablissement_id, printer_id, order_id, kind)
    select new.etablissement_id, id, new.id, 'order'
    from printers where etablissement_id = new.etablissement_id;
  end if;
  return new;
end;
$$;

drop trigger orders_sync_tickets on public.orders;
create trigger orders_sync_tickets
  after insert or update of status, paid_online on public.orders
  for each row execute function public.sync_order_tickets();

-- ---------------------------------------------------------------------------
-- Les taux et la grille des créneaux sont posés par Ominin, pas par le
-- gérant. Reprise de 20260910000005.

create or replace function public.enforce_etablissement_fee_rights()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'authenticated' then
    return new;
  end if;
  if new.platform_fee_percent is distinct from old.platform_fee_percent
     or new.collect_fee_percent is distinct from old.collect_fee_percent
     or new.collect_slot_minutes is distinct from old.collect_slot_minutes then
    raise exception 'La commission plateforme est réservée à Ominin.';
  end if;
  return new;
end;
$$;

-- Une commande à emporter se paie en ligne ou n'existe pas : le client ne
-- peut pas la sortir du paiement en attente (elle ne pourrait plus ni
-- expirer ni s'annuler). Reprise de 20260915000001.

create or replace function public.abandon_online_payment(p_order_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update orders
  set online_payment_started_at = null
  where id = p_order_id
    and type <> 'collect'
    and status = 'en_attente'
    and not paid_online;
$$;

-- ---------------------------------------------------------------------------
-- L'ancien tunnel : panier gardé jusqu'au webhook de la plateforme.

drop function public.create_collect_order(uuid, text);
drop table public.collect_pending;

-- ---------------------------------------------------------------------------
-- place_order : reprise de 20261005000001_offert_avec_achat.sql, avec la
-- branche click & collect (p_collect : nom, téléphone, retrait). Le type de
-- la signature change : l'ancienne est retirée, ses droits avec.

drop function public.place_order(text, int, jsonb, boolean, text);

create function public.place_order(
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
begin
  select id, offre, online_payment, service_mode,
         opening_hours, collect_slot_minutes, collect_slot_capacity
  into v_etab, v_offre, v_online, v_mode, v_hours, v_slot, v_capacity
  from etablissements where slug = p_slug;
  if v_etab is null then
    raise exception 'Établissement introuvable.';
  end if;
  if p_collect is not null then
    -- Click & collect : payé en ligne à la commande, retiré à l'heure choisie.
    if not exists (
      select 1 from subscriptions
      where etablissement_id = v_etab and product = 'collect' and status = 'active'
    ) then
      raise exception 'Le click & collect n''est pas activé pour cet établissement.';
    end if;
    if not v_online then
      raise exception 'Le click & collect n''est pas encore ouvert pour cet établissement.';
    end if;
    v_name := nullif(btrim(p_collect->>'name'), '');
    v_phone := nullif(btrim(p_collect->>'phone'), '');
    if v_name is null or v_phone is null then
      raise exception 'Indiquez votre nom et votre téléphone.';
    end if;
    v_pickup := nullif(p_collect->>'pickup_at', '')::timestamptz;
    -- Une commande à la fois par établissement. Le créneau ne compte que les
    -- commandes payées : des clients qui paient en même temps peuvent le
    -- dépasser de quelques commandes, plutôt qu'une tentative abandonnée le
    -- bloque.
    perform 1 from etablissements where id = v_etab for update;
    if v_pickup is null then
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
      -- Seules les commandes payées occupent le créneau : une tentative
      -- abandonnée ne le bloque pas le temps de son expiration.
      if (
        select count(*) from orders
        where etablissement_id = v_etab and type = 'collect' and paid_online
          and pickup_at = v_pickup and status <> 'annulee'
      ) >= v_capacity then
        raise exception 'Ce créneau est complet : choisissez-en un autre.';
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
        v_role := current_member_role(v_etab);
        if p_table_number < 1
           or v_role is null or v_role not in ('gerant', 'serveur') then
          raise exception 'Table introuvable.';
        end if;
        insert into tables (etablissement_id, number)
        values (v_etab, p_table_number)
        returning id into v_table;
      end if;
    elsif p_table_number is not null then
      raise exception 'La carte a changé : rechargez la page.';
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
  select coalesce(jsonb_object_agg(item_id::text, price), '{}'::jsonb)
  into v_tarifs
  from tarifs_actifs(v_etab);

  -- Le client a choisi de régler en ligne : la commande attend ce
  -- règlement hors de l'onglet À encaisser (awaitsOnlinePayment côté
  -- gestion). Le choix n'est retenu que si l'établissement propose le
  -- paiement en ligne — sans quoi un appel forgé soustrairait une addition
  -- au comptoir.
  insert into orders (
    etablissement_id, table_id, online_payment_started_at, loyalty_customer_id,
    type, customer_name, customer_phone, pickup_at
  )
  values (
    v_etab, v_table,
    case when (p_online_payment or p_collect is not null) and v_online then now() end,
    v_customer,
    case when p_collect is null then 'sur_place' else 'collect' end::public.order_type,
    v_name, v_phone, v_pickup
  )
  returning id into v_order;

  for v_line in select value from jsonb_array_elements(p_items) as t(value)
  loop
    v_qty := coalesce((v_line->>'quantity')::int, 0);
    if v_qty < 1 or v_qty > 99 then
      raise exception 'Quantité invalide.';
    end if;

    -- Formule : une seule ligne, au prix de la formule plus les suppléments
    -- de ce qui a été choisi ; le détail des choix part en options, lisible
    -- sur le ticket comme celles d'un article.
    if v_line->>'formule_id' is not null then
      select * into v_formule from formule_line(v_etab, v_line);
      v_paid := v_paid + v_formule.unit_price * v_qty;
      insert into order_items (
        order_id, item_id, name, quantity, unit_price, options, vat_rate, components
      )
      values (
        v_order, null, v_formule.name, v_qty, v_formule.unit_price,
        v_formule.options, v_formule.vat_rate, v_formule.components
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
    if v_item.stock is not null and v_item.stock < v_qty then
      raise exception 'Stock insuffisant pour : %.', v_item.name;
    end if;

    -- Options : valider chaque choix contre item.options et figer nom + supplément.
    v_supplement := 0;
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
              v_supplement := v_supplement + coalesce((v_opt->>'supplement')::numeric, 0);
              v_options := v_options || jsonb_build_array(jsonb_build_object(
                'groupName', v_group->>'name',
                'choiceName', v_opt->>'name',
                'supplement', coalesce((v_opt->>'supplement')::numeric, 0)
              ));
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
    -- Sinon le tarif du moment s'il y en a un, ou la fiche ; les suppléments
    -- d'options ne sont pas ajustés, ils s'ajoutent au prix retenu.
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
    else
      v_prix := coalesce((v_tarifs->>v_item.id::text)::numeric, v_item.price);
    end if;
    v_paid := v_paid + (v_prix + v_supplement) * v_qty;

    insert into order_items (
      order_id, item_id, name, quantity, unit_price, options, vat_rate, loyalty_points
    )
    values (
      v_order, v_item.id, v_item.name, v_qty, v_prix + v_supplement, v_options,
      v_item.vat_rate, v_reward_points
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

  return v_order;
end;
$$;

revoke execute on function public.place_order(text, int, jsonb, boolean, text, jsonb) from public;
grant execute on function public.place_order(text, int, jsonb, boolean, text, jsonb) to anon, authenticated;
