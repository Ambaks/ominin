-- Précommandes du click & collect, pour une boulangerie qui prend ses
-- gâteaux plusieurs jours à l'avance (Cyprien, Toulouse, octobre 2026).
--
-- 1. Délai de commande par article : un entremets se commande 48 h avant
--    son retrait. Le client ne peut pas choisir de créneau plus tôt ;
--    l'équipe, elle, sait ce que le laboratoire peut encore sortir.
-- 2. Le mot du client : l'inscription sur la plaque, une allergie, un
--    prénom. Il suit la commande jusqu'au comptoir.
-- 3. Commandes à emporter prises par l'équipe : au téléphone ou au
--    comptoir, pour un jour donné, réglées au retrait. Elles entrent dans
--    le même registre que celles du site, partent en préparation d'office
--    et se règlent au comptoir quand le client vient les chercher.

alter table public.items
  add column notice_hours int check (notice_hours > 0);

alter table public.orders
  add column customer_note text check (char_length(customer_note) <= 280);

-- ---------------------------------------------------------------------------
-- Créneaux complets : une commande prise par l'équipe occupe son créneau
-- comme une commande payée en ligne. Une tentative de paiement en cours, non.

create or replace function public.collect_full_slots(p_slug text, p_from timestamptz, p_to timestamptz)
returns setof timestamptz
language sql stable security definer
set search_path = public
as $$
  select o.pickup_at
  from orders o
  join etablissements e on e.id = o.etablissement_id
  where e.slug = p_slug
    and o.type = 'collect'
    and (o.paid_online or o.online_payment_started_at is null)
    and o.status <> 'annulee'
    and o.pickup_at >= p_from and o.pickup_at < p_to
  group by o.pickup_at
  having count(*) >= max(e.collect_slot_capacity);
$$;

-- ---------------------------------------------------------------------------
-- Tickets : une commande prise par l'équipe naît en préparation, sans
-- paiement en ligne à attendre — elle imprime à sa création. Reprise de
-- 20261007000001.

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
  if (tg_op = 'INSERT' and new.type = 'collect' and new.status = 'en_preparation')
     or (tg_op = 'UPDATE' and (
       (new.type = 'collect' and new.paid_online and not old.paid_online)
       or (old.status = 'en_attente' and new.status in ('payee', 'servie'))
     )) then
    insert into print_jobs (etablissement_id, printer_id, order_id, kind)
    select new.etablissement_id, id, new.id, 'order'
    from printers where etablissement_id = new.etablissement_id;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Une commande à emporter se remet au client dès qu'elle est prête sur
-- l'étagère : de « en préparation », elle peut passer directement à
-- « retirée » — jamais avec un article non réglé. Réglée au comptoir, sa
-- remise s'annule comme un encaissement (page Paiements) ; payée en ligne,
-- y compris par l'ancien tunnel (payment_mode « en_ligne » d'avant le
-- 7 octobre 2026), jamais. Reprise de 20260929000003.

create or replace function public.enforce_order_transition()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = old.status then
    return new;
  end if;
  if new.type = 'collect' then
    if not (case old.status
      when 'en_attente' then new.status in ('en_preparation', 'annulee')
      when 'en_preparation' then new.status in ('prete', 'retiree', 'annulee')
      when 'prete' then new.status in ('retiree', 'annulee')
      when 'retiree' then new.status = 'annulee' and not new.paid_online
        and old.payment_mode is distinct from 'en_ligne'
      else false
    end) or (new.status = 'retiree' and not new.paid_online
             and exists (select 1 from order_items
                         where order_id = new.id and paid_mode is null)
             -- L'ancien tunnel payait par Stripe Checkout sans jambe :
             -- sa session, que le comptoir ne peut pas écrire, en tient lieu.
             and not (old.payment_mode = 'en_ligne' and new.stripe_session_id is not null)) then
      raise exception 'Transition de statut invalide : % → %.', old.status, new.status;
    end if;
  elsif not (case old.status
    when 'en_attente' then new.status in ('payee', 'servie', 'annulee')
    when 'payee' then new.status in ('servie', 'annulee')
      or (new.order_number is not null and new.status = 'prete')
    when 'prete' then new.order_number is not null
      and new.status in ('payee', 'servie', 'annulee')
    when 'servie' then new.status = 'annulee'
    else false
  end) then
    raise exception 'Transition de statut invalide : % → %.', old.status, new.status;
  end if;
  return new;
end;
$$;

-- Le vendeur qui reçoit l'annulation au téléphone l'enregistre lui-même :
-- une addition sur place tant qu'elle attend, une commande à emporter tant
-- qu'aucun de ses articles n'est réglé. Une commande payée en ligne ne
-- s'annule jamais par le vendeur : aucun remboursement n'en partirait. Il
-- n'efface pas non plus un mode de règlement posé : ce serait effacer
-- l'encaissement du registre. Il ne pose jamais le mode « en_ligne » : seul
-- l'ancien tunnel de paiement l'écrivait, et ce mode ouvre la remise sans
-- encaissement. Reprise de 20260910000002.

create or replace function public.enforce_order_update_rights()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_role public.member_role;
begin
  if auth.role() is distinct from 'authenticated' then
    return new;
  end if;
  v_role := current_member_role(new.etablissement_id);
  if v_role = 'gerant' then
    return new;
  end if;
  if v_role = 'serveur' then
    if to_jsonb(new) - 'status' - 'payment_mode' - 'cash_given' - 'cash_change' - 'tip_amount' - 'estimated_ready_at' - 'staff_id'
         is distinct from to_jsonb(old) - 'status' - 'payment_mode' - 'cash_given' - 'cash_change' - 'tip_amount' - 'estimated_ready_at' - 'staff_id'
       or old.status in ('servie', 'annulee', 'retiree')
       or (old.payment_mode is not null and new.payment_mode is null)
       or ((new.payment_mode = 'en_ligne' or old.payment_mode = 'en_ligne')
           and new.payment_mode is distinct from old.payment_mode)
       or (new.status <> old.status
           and new.status not in ('payee', 'servie', 'en_preparation', 'prete', 'retiree')
           and not (new.status = 'annulee' and not old.paid_online and (
             old.status = 'en_attente'
             or (old.type = 'collect' and old.payment_mode is distinct from 'en_ligne'
                 and not exists (select 1 from order_items
                                 where order_id = old.id and paid_mode is not null))
           ))) then
      raise exception 'Le rôle serveur ne permet pas cette modification.';
    end if;
    return new;
  end if;
  raise exception 'Modification non autorisée.';
end;
$$;

-- ---------------------------------------------------------------------------
-- place_order : reprise de 20261013000001. Trois ajouts, tous côté click &
-- collect : le délai de commande des articles, le mot du client, et la
-- commande prise par l'équipe (p_collect.pay_at_pickup), réglée au retrait.

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
    if v_fermes ? v_item.id::text then
      raise exception '%', format(v_ferme_message, v_item.name);
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

-- ---------------------------------------------------------------------------
-- Encaissement au comptoir : une commande à emporter réglée au retrait se
-- règle comme une addition, puis se remet au client (retirée). Reprise de
-- 20260929000002.

create or replace function public.pay_order_items_internal(
  p_items jsonb,
  p_mode public.payment_mode,
  p_cash_given numeric default null,
  p_cash_change numeric default null,
  p_tip numeric default null,
  p_cash_amount numeric default null
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_etab uuid;
  v_role public.member_role;
  v_printed boolean;
  v_item_ids uuid[];
  v_order_ids uuid[];
  v_order_id uuid;
  v_tip_order uuid;
  v_tip numeric;
  v_goods numeric;
  v_due numeric;
  v_cash_left numeric;
  v_cash numeric;
  v_cash_noted boolean := false;
  v_mode public.payment_mode;
  v_sel record;
  v_line public.order_items;
  v_collect boolean;
begin
  if p_mode not in ('especes', 'carte', 'mixte') then
    raise exception 'Mode de paiement invalide.';
  end if;
  if p_mode = 'carte' and (p_cash_given is not null or p_cash_change is not null) then
    raise exception 'Montants en espèces sans règlement en espèces.';
  end if;
  if p_mode <> 'mixte' and p_cash_amount is not null then
    raise exception 'Répartition espèces/carte hors règlement mixte.';
  end if;
  v_tip := coalesce(p_tip, 0);
  if v_tip < 0 then
    raise exception 'Pourboire invalide.';
  end if;

  select array_agg(distinct (value->>'item_id')::uuid) into v_item_ids
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as t(value);
  if array_length(v_item_ids, 1) is null then
    raise exception 'Aucun article sélectionné.';
  end if;
  -- Une même ligne deux fois dans la sélection fausserait le découpage.
  if array_length(v_item_ids, 1) <> jsonb_array_length(p_items) then
    raise exception 'Sélection invalide.';
  end if;
  if exists (
    select 1 from unnest(v_item_ids) as t(id)
    where not exists (select 1 from order_items oi where oi.id = t.id)
  ) then
    raise exception 'Article introuvable.';
  end if;

  select array_agg(id) into v_order_ids
  from (
    select distinct o.id
    from orders o
    join order_items oi on oi.order_id = o.id
    where oi.id = any(v_item_ids)
  ) s;

  -- Verrou : deux encaissements simultanés de la même table se sérialisent,
  -- le second voit les articles déjà réglés par le premier.
  perform 1 from orders where id = any(v_order_ids) for update;

  select etablissement_id into v_etab from orders where id = v_order_ids[1];
  if exists (
    select 1 from orders
    where id = any(v_order_ids) and etablissement_id <> v_etab
  ) then
    raise exception 'Les articles doivent appartenir au même établissement.';
  end if;
  -- Un non-membre n'a pas de rôle : le null ne doit pas passer le test.
  v_role := current_member_role(v_etab);
  if v_role is null or v_role not in ('gerant', 'serveur') then
    raise exception 'Modification non autorisée.';
  end if;
  -- Une addition sur place en attente, ou une commande à emporter réglée au
  -- retrait — seule, elle ne se mêle pas à l'addition d'une table. Un mode
  -- déjà posé, c'est une commande déjà réglée : l'ancien tunnel en ligne
  -- (« en_ligne ») ne repasse pas à la caisse.
  select bool_or(type = 'collect') into v_collect
  from orders where id = any(v_order_ids);
  if exists (
    select 1 from orders
    where id = any(v_order_ids)
      and (paid_online or not (
        (type = 'sur_place' and status = 'en_attente')
        or (type = 'collect' and online_payment_started_at is null
            and payment_mode is null and status in ('en_preparation', 'prete'))
      ))
  ) or (v_collect and array_length(v_order_ids, 1) > 1) then
    raise exception 'Seules les commandes en attente d''encaissement se règlent ici.';
  end if;

  -- Marchandise de la sélection, aux quantités réglées : la base du partage.
  select sum(oi.unit_price * (t.value->>'quantity')::int) into v_goods
  from jsonb_array_elements(p_items) as t(value)
  join order_items oi on oi.id = (t.value->>'item_id')::uuid;
  v_due := v_goods + v_tip;

  if p_mode = 'mixte' then
    if p_cash_amount is null or p_cash_amount <= 0 or p_cash_amount >= v_due then
      raise exception 'La part en espèces doit être strictement comprise entre 0 et le total.';
    end if;
    if p_cash_given is not null and p_cash_given < p_cash_amount then
      raise exception 'Le montant reçu est inférieur à la part en espèces.';
    end if;
  end if;

  v_printed := printer_online(v_etab);

  -- Le pourboire du règlement va à la plus ancienne commande touchée ; posé
  -- avant la clôture, que le trigger de droits du serveur interdit de
  -- retoucher une fois la commande payée.
  if v_tip > 0 then
    select id into v_tip_order from orders
    where id = any(v_order_ids)
    order by created_at
    limit 1;
    update orders
    set tip_amount = coalesce(tip_amount, 0) + v_tip
    where id = v_tip_order;
  end if;

  -- Jambes du règlement, commande par commande de la plus ancienne à la plus
  -- récente : les espèces couvrent la marchandise jusqu'à épuisement de leur
  -- part, la carte prend la suite. Ce qu'il reste d'espèces après la dernière
  -- ligne va au pourboire, hors registre — c'est bien le partage annoncé par
  -- le client, lu de haut en bas de l'addition.
  v_cash_left := case p_mode
    when 'especes' then v_due
    when 'mixte' then p_cash_amount
    else 0
  end;
  for v_sel in
    select o.id as order_id,
           sum(oi.unit_price * (t.value->>'quantity')::int) as goods
    from jsonb_array_elements(p_items) as t(value)
    join order_items oi on oi.id = (t.value->>'item_id')::uuid
    join orders o on o.id = oi.order_id
    group by o.id, o.created_at
    order by o.created_at
  loop
    v_cash := least(v_cash_left, v_sel.goods);
    v_cash_left := v_cash_left - v_cash;
    if v_cash > 0 then
      insert into order_payments (order_id, mode, amount, cash_given, cash_change)
      values (
        v_sel.order_id, 'especes', v_cash,
        case when v_cash_noted then null else p_cash_given end,
        case when v_cash_noted then null else p_cash_change end
      );
      v_cash_noted := true;
    end if;
    if v_sel.goods > v_cash then
      insert into order_payments (order_id, mode, amount)
      values (v_sel.order_id, 'carte', v_sel.goods - v_cash);
    end if;
  end loop;

  -- Chaque ligne sélectionnée, à concurrence de la quantité réglée. Une part
  -- seulement ⇒ la ligne est scindée : la part réglée devient une ligne à
  -- part, le reste attend son tour et peut partir dans un autre mode. Un
  -- règlement mixte marque ses lignes « mixte » : le détail des montants est
  -- dans le registre, la ligne dit seulement qu'elle est réglée.
  for v_sel in
    select (value->>'item_id')::uuid as item_id, (value->>'quantity')::int as quantity
    from jsonb_array_elements(p_items) as t(value)
  loop
    select * into v_line from order_items where id = v_sel.item_id;
    if v_line.paid_mode is not null then
      raise exception 'Certains articles sont déjà encaissés.';
    end if;
    if v_sel.quantity is null or v_sel.quantity < 1
       or v_sel.quantity > v_line.quantity then
      raise exception 'Quantité invalide.';
    end if;
    if v_sel.quantity = v_line.quantity then
      update order_items
      set paid_mode = p_mode, paid_at = now()
      where id = v_line.id;
    else
      update order_items
      set quantity = quantity - v_sel.quantity
      where id = v_line.id;
      insert into order_items (
        order_id, item_id, name, quantity, unit_price, options, vat_rate,
        loyalty_points, components, paid_mode, paid_at
      )
      values (
        v_line.order_id, v_line.item_id, v_line.name, v_sel.quantity,
        v_line.unit_price, v_line.options, v_line.vat_rate,
        v_line.loyalty_points, v_line.components, p_mode, now()
      );
    end if;
  end loop;

  for v_order_id in
    select id from orders where id = any(v_order_ids) order by created_at
  loop
    if exists (
      select 1 from order_items where order_id = v_order_id and paid_mode is null
    ) then
      continue;
    end if;
    -- Ce règlement a touché la commande : un seul mode distinct, c'est le sien.
    select case when count(distinct paid_mode) = 1 then p_mode else 'mixte' end
      into v_mode
    from order_items
    where order_id = v_order_id;
    -- À emporter : réglée, elle part avec le client.
    if v_collect then
      update orders
      set status = 'retiree',
          payment_mode = v_mode,
          cash_given = case when p_mode = 'especes' then p_cash_given end,
          cash_change = case when p_mode = 'especes' then p_cash_change end
      where id = v_order_id;
      continue;
    end if;
    -- Le ticket part en cuisine : plus rien à suivre en salle, la commande
    -- rejoint l'historique. Ses articles sont servis d'office — c'est la
    -- cuisine qui les porte à table, pas un écran.
    if v_printed then
      update order_items set served_at = now() where order_id = v_order_id;
    end if;
    update orders
    set status = (case when v_printed then 'servie' else 'payee' end)::public.order_status,
        payment_mode = v_mode,
        cash_given = case when p_mode = 'especes' then p_cash_given end,
        cash_change = case when p_mode = 'especes' then p_cash_change end
    where id = v_order_id;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Correction d'un encaissement (gérant, page Paiements). Deux reprises de
-- 20260929000003 : une commande à emporter réglée au comptoir à son retrait
-- se corrige comme une addition, et les jambes réécrites gardent la date du
-- règlement — corrigé le lendemain, un encaissement reste celui de la veille
-- dans le chiffre du jour.

create or replace function public.update_order_payment(
  p_order_id uuid,
  p_mode public.payment_mode,
  p_cash_amount numeric default null,
  p_cash_given numeric default null,
  p_cash_change numeric default null
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_goods numeric;
  v_cash numeric;
  v_paid_at timestamptz;
begin
  select * into v_order from orders where id = p_order_id for update;
  if v_order.id is null
     or current_member_role(v_order.etablissement_id) is distinct from 'gerant' then
    raise exception 'Réservé au gérant de l''établissement.';
  end if;
  if v_order.payment_mode is null or v_order.payment_mode = 'en_ligne' or v_order.paid_online
     or (v_order.status not in ('payee', 'servie')
         and not (v_order.status = 'prete' and v_order.order_number is not null)
         and not (v_order.type = 'collect' and v_order.status = 'retiree')) then
    raise exception 'Seul un encaissement au comptoir se corrige ici.';
  end if;
  if p_mode not in ('especes', 'carte', 'mixte') then
    raise exception 'Mode de paiement invalide.';
  end if;

  select coalesce(sum(quantity * unit_price), 0) into v_goods
  from order_items where order_id = p_order_id;

  if p_mode = 'mixte'
     and (p_cash_amount is null or p_cash_amount <= 0 or p_cash_amount >= v_goods) then
    raise exception 'La part en espèces doit être strictement comprise entre 0 et le total.';
  end if;
  if p_mode <> 'mixte' and p_cash_amount is not null then
    raise exception 'Répartition espèces/carte hors règlement mixte.';
  end if;
  if p_mode = 'carte' and (p_cash_given is not null or p_cash_change is not null) then
    raise exception 'Montants en espèces sans règlement en espèces.';
  end if;
  v_cash := case p_mode
    when 'especes' then v_goods
    when 'mixte' then p_cash_amount
    else 0
  end;
  if p_cash_given is not null and p_cash_given < v_cash then
    raise exception 'Le montant reçu est inférieur à la part en espèces.';
  end if;

  -- Les jambes se réécrivent en bloc : c'est le registre qui fait les totaux
  -- de la page Paiements, il doit dire exactement ce que le gérant a saisi —
  -- à la date du règlement d'origine, que les lignes gardent (une correction
  -- ne les redate pas).
  select coalesce(max(paid_at), now()) into v_paid_at
  from order_items where order_id = p_order_id;
  delete from order_payments where order_id = p_order_id;
  if v_cash > 0 then
    insert into order_payments (order_id, mode, amount, cash_given, cash_change, paid_at)
    values (p_order_id, 'especes', v_cash, p_cash_given, p_cash_change, v_paid_at);
  end if;
  if v_goods - v_cash > 0 then
    insert into order_payments (order_id, mode, amount, paid_at)
    values (p_order_id, 'carte', v_goods - v_cash, v_paid_at);
  end if;
  update order_items
  set paid_mode = p_mode
  where order_id = p_order_id and paid_mode is not null;
  update orders
  set payment_mode = p_mode,
      cash_given = case when p_mode = 'especes' then p_cash_given end,
      cash_change = case when p_mode = 'especes' then p_cash_change end
  where id = p_order_id;
end;
$$;

-- Les corrections passées redataient leurs jambes au moment de la
-- correction : elles reprennent la date du règlement, restée sur les lignes.
-- Une jambe d'un règlement ordinaire porte la même date que ses lignes
-- (même transaction) : seules les jambes corrigées sont plus récentes.
update order_payments p
set paid_at = i.paid_at
from (
  select order_id, max(paid_at) as paid_at
  from order_items
  where paid_at is not null
  group by order_id
) i
where i.order_id = p.order_id
  and p.paid_at > i.paid_at;
