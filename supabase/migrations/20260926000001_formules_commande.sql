-- Les formules se commandent depuis le menu QR. Elles existaient dans la
-- gestion (onglet Menu → Formules : étapes, articles au choix, suppléments),
-- mais le menu ne les montrait pas et place_order ne savait pas les prendre.
--
-- Une formule commandée est une seule ligne d'addition : son nom, son prix
-- plus les suppléments des choix, et le détail des choix en options (étape :
-- article, puis les options de l'article) — c'est ce que lisent la caisse et
-- le ticket de cuisine, comme pour un article. Le prix et les choix sont
-- relus sur la formule en base ; le navigateur n'envoie que des
-- identifiants.
--
-- Stock : un article lié à un choix doit être disponible et non épuisé,
-- mais la formule ne le décompte pas — l'annulation ne saurait pas le rendre
-- (restore_stock_on_cancel lit order_items.item_id, nul pour une formule).

-- ---------------------------------------------------------------------------
-- Jours de la formule, comme ceux des tarifs planifiés : ISO-8601 (1 = lundi
-- … 7 = dimanche), comptés en journée de service — la soirée du samedi
-- reste samedi jusqu'à l'heure de bascule (day_end_hour). Null : tous les
-- jours.

alter table public.formules
  add column days smallint[]
    constraint formules_jours check (
      days is null
      or (cardinality(days) > 0 and days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[])
    );

comment on column public.formules.days is
  'Jours de service où la formule est proposée (1 = lundi … 7 = dimanche) ; null = tous les jours.';

create function public.formule_du_jour(
  p_etablissement uuid,
  p_days smallint[],
  p_at timestamptz default now()
)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select p_days is null
    or extract(isodow from
         p_at at time zone 'Europe/Paris'
         - make_interval(hours => coalesce(s.day_end_hour, 0))
       )::smallint = any (p_days)
  from (select 1) seed
  left join etablissement_settings s on s.etablissement_id = p_etablissement;
$$;

revoke execute on function public.formule_du_jour(uuid, smallint[], timestamptz) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Validation d'une ligne formule :
-- {formule_id, quantity, selections: [{etape_id, article_id,
--   choices: [{group_id, choice_id}]}]}

create function public.formule_line(p_etab uuid, p_line jsonb)
returns table (name text, unit_price numeric, options jsonb, vat_rate numeric)
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

    if v_article->>'itemId' is not null then
      select * into v_item from items
      where id = (v_article->>'itemId')::uuid and etablissement_id = p_etab;
      if v_item.id is null or not v_item.disponible or v_item.stock = 0 then
        raise exception 'Article indisponible : %.', v_article->>'name';
      end if;
      v_vat := greatest(v_vat, v_item.vat_rate);
    end if;

    v_price := v_price + coalesce((v_article->>'supplement')::numeric, 0);
    v_options := v_options || jsonb_build_array(jsonb_build_object(
      'groupName', v_etape->>'name',
      'choiceName', v_article->>'name',
      'supplement', coalesce((v_article->>'supplement')::numeric, 0)
    ));

    -- Options de l'article choisi : mêmes règles que place_order.
    for v_choice in
      select value from jsonb_array_elements(coalesce(v_sel->'choices', '[]'::jsonb)) as t(value)
    loop
      v_found := false;
      for v_group in
        select value from jsonb_array_elements(coalesce(v_article->'options', '[]'::jsonb)) as t(value)
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
      select value from jsonb_array_elements(coalesce(v_article->'options', '[]'::jsonb)) as t(value)
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
  end loop;

  return query select v_formule.name, v_price, v_options, v_vat;
end;
$$;

revoke execute on function public.formule_line(uuid, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- place_order : copie de 20260924000001_fidelite.sql, plus la branche
-- formule. Même signature : les droits restent ceux posés alors.

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
      insert into order_items (order_id, item_id, name, quantity, unit_price, options, vat_rate)
      values (v_order, null, v_formule.name, v_qty, v_formule.unit_price, v_formule.options, v_formule.vat_rate);
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

revoke execute on function public.place_order(text, int, jsonb, boolean, text) from public;
grant execute on function public.place_order(text, int, jsonb, boolean, text) to anon, authenticated;
