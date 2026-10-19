-- Disponibilité des choix d'option (variantes, sauces, suppléments) : un
-- choix porte « disponible: false » dans items.options quand il est épuisé.
-- La carte le grise, la gestion le bascule d'un geste, et la commande le
-- refuse côté serveur. place_order est reprise de 20261015000003, formule_line
-- de 20260929000002 : seule l'exception « Plus disponible » change.

-- Bascule d'un seul choix, atomique : deux personnes qui basculent deux choix
-- du même article ne s'écrasent pas. Droits de l'appelant (RLS de items).
create function public.set_option_choice_disponible(
  p_item uuid,
  p_group text,
  p_choice text,
  p_disponible boolean
) returns void
language sql
security invoker
set search_path = public
as $$
  update items
  set options = (
    select coalesce(jsonb_agg(
      case when g.value->>'id' = p_group then
        jsonb_set(g.value, '{choices}', (
          select coalesce(jsonb_agg(
            case when c.value->>'id' = p_choice then
              case when p_disponible then c.value - 'disponible'
                   else c.value || '{"disponible": false}'::jsonb end
            else c.value end
            order by c.ordinality), '[]'::jsonb)
          from jsonb_array_elements(g.value->'choices') with ordinality as c
        ))
      else g.value end
      order by g.ordinality), '[]'::jsonb)
    from jsonb_array_elements(options) with ordinality as g
  )
  where id = p_item;
$$;

revoke execute on function public.set_option_choice_disponible(uuid, text, text, boolean)
  from public, anon;
grant execute on function public.set_option_choice_disponible(uuid, text, text, boolean)
  to authenticated;

create or replace function public.formule_line(p_etab uuid, p_line jsonb)
returns table (
  name text, unit_price numeric, options jsonb, vat_rate numeric, components jsonb
)
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_formule public.formules;
  v_etape jsonb;
  v_article jsonb;
  v_sel jsonb;
  v_selections jsonb := coalesce(p_line->'selections', '[]'::jsonb);
  v_item public.items;
  v_group jsonb;
  v_opt jsonb;
  v_choice jsonb;
  v_found boolean;
  v_count int;
  v_price numeric;
  v_options jsonb := '[]'::jsonb;
  v_vat numeric;
  v_components jsonb := '[]'::jsonb;
  v_article_options jsonb;
  v_article_opts jsonb;
begin
  select * into v_formule from formules
  where id = (p_line->>'formule_id')::uuid and etablissement_id = p_etab;
  if v_formule.id is null or not v_formule.disponible then
    raise exception 'Formule indisponible.';
  end if;
  if not formule_du_jour(p_etab, v_formule.days) then
    raise exception '% n''est pas proposée aujourd''hui.', v_formule.name;
  end if;
  v_price := v_formule.price;

  -- Chaque choix doit viser une étape de la formule.
  if exists (
    select 1 from jsonb_array_elements(v_selections) as s(value)
    where not exists (
      select 1 from jsonb_array_elements(v_formule.etapes) as e(value)
      where e.value->>'id' = s.value->>'etape_id'
    )
  ) then
    raise exception 'Choix invalide pour : %.', v_formule.name;
  end if;

  for v_etape in select value from jsonb_array_elements(v_formule.etapes) as t(value)
  loop
    select count(*) into v_count
    from jsonb_array_elements(v_selections) as s(value)
    where s.value->>'etape_id' = v_etape->>'id';
    if v_count > 1 then
      raise exception 'Un seul choix pour : %.', v_etape->>'name';
    end if;
    if v_count = 0 then
      if coalesce((v_etape->>'obligatoire')::boolean, false) then
        raise exception 'Choix obligatoire manquant pour : %.', v_etape->>'name';
      end if;
      continue;
    end if;

    select s.value into v_sel
    from jsonb_array_elements(v_selections) as s(value)
    where s.value->>'etape_id' = v_etape->>'id';
    select a.value into v_article
    from jsonb_array_elements(v_etape->'articles') as a(value)
    where a.value->>'id' = v_sel->>'article_id';
    if v_article is null then
      raise exception 'Choix invalide pour : %.', v_etape->>'name';
    end if;

    v_article_opts := coalesce(v_article->'options', '[]'::jsonb);
    if v_article->>'itemId' is not null then
      select * into v_item from items
      where id = (v_article->>'itemId')::uuid and etablissement_id = p_etab;
      if v_item.id is null or not v_item.disponible or v_item.stock = 0 then
        raise exception 'Article indisponible : %.', v_article->>'name';
      end if;
      v_vat := greatest(v_vat, v_item.vat_rate);
      -- Un article de la carte suit sa fiche : ses options du moment, pas
      -- la copie faite quand il a rejoint la formule.
      v_article_opts := v_item.options;
    end if;

    v_price := v_price + coalesce((v_article->>'supplement')::numeric, 0);
    v_options := v_options || jsonb_build_array(jsonb_build_object(
      'groupName', v_etape->>'name',
      'choiceName', v_article->>'name',
      'supplement', coalesce((v_article->>'supplement')::numeric, 0)
    ));

    -- Options de l'article choisi : mêmes règles que place_order.
    v_article_options := '[]'::jsonb;
    for v_choice in
      select value from jsonb_array_elements(coalesce(v_sel->'choices', '[]'::jsonb)) as t(value)
    loop
      v_found := false;
      for v_group in
        select value from jsonb_array_elements(v_article_opts) as t(value)
      loop
        if v_group->>'id' = v_choice->>'group_id' then
          for v_opt in select value from jsonb_array_elements(v_group->'choices') as t(value)
          loop
            if v_opt->>'id' = v_choice->>'choice_id' then
              if (v_opt->>'disponible')::boolean is false then
                raise exception 'Plus disponible : % (%).', v_opt->>'name', v_article->>'name';
              end if;
              v_price := v_price + coalesce((v_opt->>'supplement')::numeric, 0);
              v_options := v_options || jsonb_build_array(jsonb_build_object(
                'groupName', (v_article->>'name') || ' · ' || (v_group->>'name'),
                'choiceName', v_opt->>'name',
                'supplement', coalesce((v_opt->>'supplement')::numeric, 0)
              ));
              v_article_options := v_article_options || jsonb_build_array(jsonb_build_object(
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
        raise exception 'Option invalide pour : %.', v_article->>'name';
      end if;
    end loop;

    for v_group in
      select value from jsonb_array_elements(v_article_opts) as t(value)
    loop
      if coalesce((v_group->>'obligatoire')::boolean, false)
         and not exists (
           select 1
           from jsonb_array_elements(coalesce(v_sel->'choices', '[]'::jsonb)) as c(value)
           where c.value->>'group_id' = v_group->>'id'
         ) then
        raise exception 'Choix obligatoire manquant pour : %.', v_article->>'name';
      end if;
    end loop;

    -- L'article tel qu'il sortirait commandé seul : c'est lui que les
    -- tickets impriment, sur ses imprimantes (item_printers).
    v_components := v_components || jsonb_build_array(jsonb_build_object(
      'item_id', v_article->>'itemId',
      'name', v_article->>'name',
      'options', v_article_options
    ));
  end loop;

  return query select v_formule.name, v_price, v_options, v_vat, v_components;
end;
$$;

revoke execute on function public.formule_line(uuid, jsonb) from public, anon, authenticated;

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
              if (v_opt->>'disponible')::boolean is false then
                raise exception 'Plus disponible : % (%).', v_opt->>'name', v_item.name;
              end if;
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
