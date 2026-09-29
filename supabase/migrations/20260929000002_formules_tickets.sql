-- Tickets des formules : chaque article choisi sort sur ses imprimantes,
-- comme s'il avait été commandé seul. Jusqu'ici une formule était une ligne
-- sans article (item_id nul) : le backend l'envoyait à toutes les
-- imprimantes, sans catégorie ni nom de ticket — la Formule Boho sortait
-- entière au bar et en cuisine.
--
-- La caisse ne change pas : une ligne au prix de la formule, le détail en
-- options. La ligne porte en plus ses composants, que le backend
-- (routers/omilink.py) substitue à la formule au moment d'imprimer — un
-- composant par article choisi, avec ses options, routé et nommé comme
-- l'article.
--
-- Un article de la carte choisi dans une formule suit aussi ses options du
-- moment (items.options) : la copie gardée dans formules.etapes quand
-- l'article y a été ajouté ne vaut plus que pour un article libre, sans
-- fiche. Un nappage ajouté à la gaufre apparaît donc aussi dans la formule.

alter table public.order_items
  add column components jsonb;

comment on column public.order_items.components is
  'Formule : articles choisis [{item_id, name, options}] imprimés à sa place, chacun sur ses imprimantes ; null pour une ligne ordinaire.';

-- ---------------------------------------------------------------------------
-- formule_line : copie de 20260926000001_formules_commande.sql, qui rend en
-- plus les composants et lit les options d'un article de la carte sur sa
-- fiche (items.options) plutôt que sur la copie gardée dans la formule. Le
-- type de retour change : la fonction est recréée.

drop function public.formule_line(uuid, jsonb);

create function public.formule_line(p_etab uuid, p_line jsonb)
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

-- ---------------------------------------------------------------------------
-- place_order : copie de 20260926000001_formules_commande.sql ; la ligne
-- formule enregistre ses composants.

create or replace function public.place_order(
  p_slug text,
  p_table_number int,
  p_items jsonb,
  p_online_payment boolean default false,
  p_loyalty_contact text default null
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
begin
  select id, offre, online_payment into v_etab, v_offre, v_online
  from etablissements where slug = p_slug;
  if v_etab is null then
    raise exception 'Établissement introuvable.';
  end if;
  -- La commande à table est une capacité des offres Smart et Connect.
  if v_offre not in ('smart', 'connect') then
    raise exception 'La commande en ligne n''est pas activée pour cet établissement.';
  end if;

  select id into v_table from tables
  where etablissement_id = v_etab and number = p_table_number;
  if v_table is null then
    v_role := current_member_role(v_etab);
    if p_table_number < 1 or v_role is null or v_role not in ('gerant', 'serveur') then
      raise exception 'Table introuvable.';
    end if;
    insert into tables (etablissement_id, number)
    values (v_etab, p_table_number)
    returning id into v_table;
  end if;

  v_count := jsonb_array_length(coalesce(p_items, '[]'::jsonb));
  if v_count = 0 then
    raise exception 'Commande vide.';
  end if;
  if v_count > 50 then
    raise exception 'Trop d''articles dans la commande.';
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
    etablissement_id, table_id, online_payment_started_at, loyalty_customer_id
  )
  values (
    v_etab, v_table,
    case when p_online_payment and v_online then now() end,
    v_customer
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
    update orders set online_payment_started_at = null where id = v_order;
  end if;

  return v_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- pay_order_items_internal : copie de 20260924000001_fidelite.sql ; la part
-- détachée d'une ligne réglée en partie garde ses composants, sans quoi sa
-- formule repartirait sur toutes les imprimantes.

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
  if exists (
    select 1 from orders
    where id = any(v_order_ids)
      and (type <> 'sur_place' or status <> 'en_attente' or paid_online)
  ) then
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
