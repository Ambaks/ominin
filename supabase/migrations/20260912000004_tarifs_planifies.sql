-- Tarifs planifiés : le prix d'un article change selon le jour et l'heure.
--
-- Le BOHO majore ses chichas de 5 € le samedi et le dimanche. La demande
-- revient sous d'autres formes — happy hour à −20 %, mardi calme à −2 € — et
-- c'est toujours la même mécanique : des articles, des jours, un écart. D'où
-- une règle générique plutôt qu'une colonne « prix week-end » sur items.
--
-- Ce que la règle n'est pas : une programmation à date. Elle se répète chaque
-- semaine, indéfiniment, et se coupe d'un interrupteur. Une opération datée
-- (une semaine de promotion) se ferait autrement ; personne ne l'a demandée.
--
-- Le prix de la carte, lui, ne bouge pas : items.price reste le prix de base,
-- celui qu'on édite. L'écart se calcule à la lecture, jamais en écriture — un
-- prix majoré n'est donc jamais « oublié » en base quand la règle s'arrête.

create type public.price_rule_direction as enum ('majoration', 'remise');
create type public.price_rule_unit as enum ('montant', 'pourcentage');

create table public.price_rules (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null
    references public.etablissements (id) on delete cascade,
  -- Ce que le gérant lit dans sa liste, et ce qu'on affiche au client sous le
  -- prix majoré : « Tarif week-end » vaut mieux qu'un prix inexpliqué.
  name text not null check (length(btrim(name)) between 1 and 60),
  direction public.price_rule_direction not null,
  unit public.price_rule_unit not null,
  value numeric not null check (value > 0),
  -- Jours ISO-8601 : 1 = lundi … 7 = dimanche, comme extract(isodow).
  days smallint[] not null,
  -- Les deux nuls : toute la journée. C'est le cas courant, et le défaut.
  starts_at time,
  ends_at time,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  constraint price_rules_jours check (
    cardinality(days) between 1 and 7
    and days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
  ),
  -- Un créneau se donne en entier ou pas du tout, et ne dure pas zéro minute.
  -- Fin avant début est permis : c'est un créneau qui passe minuit (19h → 02h).
  constraint price_rules_creneau check (
    (starts_at is null and ends_at is null)
    or (starts_at is not null and ends_at is not null and starts_at <> ends_at)
  ),
  -- Une remise de plus de 100 % rendrait de l'argent. Une majoration, elle,
  -- peut légitimement doubler un prix.
  constraint price_rules_remise_bornee check (
    unit <> 'pourcentage' or direction <> 'remise' or value <= 100
  )
);

create index price_rules_etablissement_idx
  on public.price_rules (etablissement_id);

-- Sur quoi la règle porte. Une catégorie entière (« Chichas ») ou un article
-- nommé, jamais les deux sur la même ligne. Viser la catégorie est le geste
-- utile : une chicha ajoutée le mois prochain est majorée d'office, sans que
-- le gérant ait à se souvenir de revenir cocher une case.
create table public.price_rule_targets (
  rule_id uuid not null references public.price_rules (id) on delete cascade,
  category_id uuid references public.categories (id) on delete cascade,
  item_id uuid references public.items (id) on delete cascade,
  constraint price_rule_targets_cible
    check (num_nonnulls(category_id, item_id) = 1)
);

create unique index price_rule_targets_categorie_idx
  on public.price_rule_targets (rule_id, category_id)
  where category_id is not null;
create unique index price_rule_targets_article_idx
  on public.price_rule_targets (rule_id, item_id)
  where item_id is not null;
create index price_rule_targets_rule_idx
  on public.price_rule_targets (rule_id);

-- ---------------------------------------------------------------------------
-- Policies : le gérant règle ses tarifs, son équipe les lit (l'espace de
-- gestion charge la carte pour tout le monde). Le client du menu, lui, ne lit
-- jamais ces tables — il reçoit des prix, pas des règles, via tarifs_actifs.

alter table public.price_rules enable row level security;
alter table public.price_rule_targets enable row level security;

create policy "member read" on public.price_rules
  for select to authenticated
  using (public.current_member_role(etablissement_id) is not null);
create policy "gerant insert" on public.price_rules
  for insert to authenticated
  with check (public.current_member_role(etablissement_id) = 'gerant');
create policy "gerant update" on public.price_rules
  for update to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant')
  with check (public.current_member_role(etablissement_id) = 'gerant');
create policy "gerant delete" on public.price_rules
  for delete to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant');

-- Les cibles n'ont pas d'etablissement_id : elles empruntent celui de leur
-- règle. Le sous-select est indexé (price_rules.id est la clé primaire).
create policy "member read" on public.price_rule_targets
  for select to authenticated
  using (
    exists (
      select 1 from public.price_rules r
      where r.id = rule_id
        and public.current_member_role(r.etablissement_id) is not null
    )
  );
create policy "gerant write" on public.price_rule_targets
  for all to authenticated
  using (
    exists (
      select 1 from public.price_rules r
      where r.id = rule_id
        and public.current_member_role(r.etablissement_id) = 'gerant'
    )
  )
  with check (
    exists (
      select 1 from public.price_rules r
      where r.id = rule_id
        and public.current_member_role(r.etablissement_id) = 'gerant'
    )
  );

-- ---------------------------------------------------------------------------
-- Calcul

-- L'écart appliqué à un prix. Bornée à zéro : une remise ne rend pas de
-- monnaie. Arrondie au centime, sinon 15 € − 33 % s'affiche à rallonge.
create or replace function public.prix_ajuste(
  p_prix numeric,
  p_direction public.price_rule_direction,
  p_unit public.price_rule_unit,
  p_valeur numeric
)
returns numeric
language sql
immutable
as $$
  select greatest(
    0,
    round(
      case p_unit
        when 'pourcentage' then
          p_prix * (1 + p_valeur / 100
            * (case p_direction when 'remise' then -1 else 1 end))
        else
          p_prix + p_valeur
            * (case p_direction when 'remise' then -1 else 1 end)
      end,
      2
    )
  );
$$;

-- Les prix en vigueur à l'instant donné, pour les seuls articles concernés
-- par une règle. Un article absent de ce jeu se vend au prix de sa fiche.
--
-- Deux règles peuvent viser le même article. Départage, dans cet ordre :
--   1. la plus précise gagne — une règle posée sur l'article l'emporte sur
--      celle de sa catégorie, ce qui permet d'excepter un article d'une
--      majoration de catégorie sans démonter la règle ;
--   2. à égalité de précision, la plus récente.
-- Jamais de cumul : deux majorations ne s'additionnent pas dans le dos du
-- gérant.
--
-- L'heure est celle du restaurant, pas celle du serveur : samedi commence à
-- minuit à Paris. security definer parce que le menu public l'appelle sans
-- compte — la fonction ne rend que des prix, déjà publics.
create or replace function public.tarifs_actifs(
  p_etablissement uuid,
  p_at timestamptz default now()
)
returns table (item_id uuid, price numeric, rule_name text)
language sql
stable
security definer
set search_path = public
as $$
  with moment as (
    select p_at at time zone 'Europe/Paris' as local_ts
  ),
  applicable as (
    select r.*
    from price_rules r, moment m
    where r.etablissement_id = p_etablissement
      and r.actif
      and case
        -- Toute la journée.
        when r.starts_at is null then
          extract(isodow from m.local_ts)::smallint = any (r.days)
        -- Créneau dans la journée (12h → 15h).
        when r.starts_at < r.ends_at then
          extract(isodow from m.local_ts)::smallint = any (r.days)
          and m.local_ts::time >= r.starts_at
          and m.local_ts::time < r.ends_at
        -- Créneau à cheval sur minuit (19h → 02h) : il appartient au jour où
        -- il ouvre, donc la tranche d'après minuit se rattache à la veille.
        else
          (extract(isodow from m.local_ts)::smallint = any (r.days)
            and m.local_ts::time >= r.starts_at)
          or (extract(isodow from m.local_ts - interval '1 day')::smallint
                = any (r.days)
            and m.local_ts::time < r.ends_at)
      end
  ),
  cible as (
    select
      i.id as item_id,
      i.price as base,
      a.name,
      a.direction,
      a.unit,
      a.value,
      a.created_at,
      (t.item_id is not null) as precise
    from applicable a
    join price_rule_targets t on t.rule_id = a.id
    join items i
      on i.etablissement_id = p_etablissement
      and (i.id = t.item_id or i.category_id = t.category_id)
  ),
  retenue as (
    select distinct on (cible.item_id) cible.*
    from cible
    order by cible.item_id, cible.precise desc, cible.created_at desc
  )
  -- Références qualifiées : `item_id` est aussi une colonne de sortie de la
  -- fonction, et Postgres refuserait la référence nue comme ambiguë.
  select
    retenue.item_id,
    public.prix_ajuste(retenue.base, retenue.direction, retenue.unit, retenue.value),
    retenue.name
  from retenue
  where public.prix_ajuste(retenue.base, retenue.direction, retenue.unit, retenue.value)
    <> retenue.base;
$$;

revoke execute on function public.tarifs_actifs(uuid, timestamptz) from public;
grant execute on function public.tarifs_actifs(uuid, timestamptz)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- place_order : copie de 20260904000005_service_flow.sql. Seul le prix figé
-- sur la ligne change — il part du tarif en vigueur et non de la fiche.
-- C'est ici que la majoration devient vraie : le menu QR et la prise de
-- commande en salle passent tous deux par cette fonction, et un client qui
-- rejouerait la requête à la main serait facturé au même prix.

create or replace function public.place_order(
  p_slug text,
  p_table_number int,
  p_items jsonb
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
begin
  select id, offre into v_etab, v_offre from etablissements where slug = p_slug;
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

  -- Les tarifs planifiés une seule fois pour toute la commande : deux lignes
  -- d'une même addition ne peuvent pas tomber de part et d'autre de minuit.
  select coalesce(jsonb_object_agg(item_id::text, price), '{}'::jsonb)
  into v_tarifs
  from tarifs_actifs(v_etab);

  insert into orders (etablissement_id, table_id)
  values (v_etab, v_table)
  returning id into v_order;

  for v_line in select value from jsonb_array_elements(p_items) as t(value)
  loop
    v_qty := coalesce((v_line->>'quantity')::int, 0);
    if v_qty < 1 or v_qty > 99 then
      raise exception 'Quantité invalide.';
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

    -- Le tarif du moment s'il y en a un, sinon la fiche. Les suppléments
    -- d'options ne sont pas ajustés : ils s'ajoutent au prix retenu.
    v_prix := coalesce((v_tarifs->>v_item.id::text)::numeric, v_item.price);

    insert into order_items (order_id, item_id, name, quantity, unit_price, options, vat_rate)
    values (v_order, v_item.id, v_item.name, v_qty, v_prix + v_supplement, v_options, v_item.vat_rate);

    if v_item.stock is not null then
      update items set stock = stock - v_qty where id = v_item.id;
    end if;
  end loop;

  return v_order;
end;
$$;
