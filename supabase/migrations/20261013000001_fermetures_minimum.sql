-- Deux demandes du BOHO, toutes deux réglables par le gérant.
--
-- 1. Commande minimum en ligne. Les frais d'un paiement par carte mangent un
--    café réglé à 2 € : sous le montant fixé, le client commande toujours,
--    mais règle au comptoir. Le click & collect, qui ne se paie qu'en ligne,
--    refuse alors la commande. Null : aucun minimum.
--
-- 2. Fermetures. Passé 22 h la cuisine ne sort plus de plats, le bar sert
--    encore : une partie de la carte cesse d'être commandable, à heure fixe
--    ou d'un geste pendant le service. Une fermeture nomme ce qu'elle coupe
--    (catégories ou articles, comme un tarif planifié), son horaire
--    éventuel, et l'état forcé à la main pour la journée en cours.
--
--    Elle ne touche pas à items.disponible : rouvrir ne remet pas en vente un
--    plat que la cuisine a déclaré épuisé. Elle ne vaut que pour les clients
--    — l'équipe qui prend une commande sait ce que la cuisine accepte encore.
--
--    Tout se lit en heure de service : l'heure de Paris moins day_end_hour.
--    Une fermeture « dès 22 h » d'un bar qui bascule à 5 h court donc jusqu'à
--    5 h du matin sans cas particulier pour minuit, et chaque journée repart
--    ouverte : un bouton pressé la veille ne s'oublie jamais au lendemain.

-- ---------------------------------------------------------------------------
-- Commande minimum en ligne

alter table public.etablissements
  add column online_min_order numeric
    check (online_min_order > 0);

update public.etablissements set online_min_order = 5 where slug = 'boho';

-- ---------------------------------------------------------------------------
-- Fermetures

create table public.closures (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null
    references public.etablissements (id) on delete cascade,
  -- « Cuisine », « Bar » : ce que l'équipe lit sur son bouton.
  name text not null check (length(btrim(name)) between 1 and 60),
  -- Horaire facultatif : jours ISO (1 = lundi … 7 = dimanche) et heure de
  -- début, donnés ensemble. Sans fin, la fermeture court jusqu'au bout de la
  -- journée de service.
  days smallint[],
  starts_at time,
  ends_at time,
  -- Fermée (true) ou rouverte (false) à la main, pour la seule journée de
  -- service override_day ; le lendemain, l'horaire reprend la main.
  override_closed boolean,
  override_day date,
  created_at timestamptz not null default now(),
  constraint closures_horaire check (
    (days is null) = (starts_at is null)
    and (ends_at is null or starts_at is not null)
  ),
  constraint closures_jours check (
    days is null
    or (cardinality(days) between 1 and 7
      and days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[])
  ),
  constraint closures_forcage check (
    (override_closed is null) = (override_day is null)
  )
);

create index closures_etablissement_idx on public.closures (etablissement_id);

-- Ce que la fermeture coupe : une catégorie entière (un plat ajouté plus tard
-- la suit d'office) ou un article nommé, jamais les deux sur une ligne.
create table public.closure_targets (
  closure_id uuid not null references public.closures (id) on delete cascade,
  category_id uuid references public.categories (id) on delete cascade,
  item_id uuid references public.items (id) on delete cascade,
  constraint closure_targets_cible
    check (num_nonnulls(category_id, item_id) = 1)
);

create unique index closure_targets_categorie_idx
  on public.closure_targets (closure_id, category_id)
  where category_id is not null;
create unique index closure_targets_article_idx
  on public.closure_targets (closure_id, item_id)
  where item_id is not null;
create index closure_targets_closure_idx
  on public.closure_targets (closure_id);

-- Le gérant règle ses fermetures, l'équipe les lit. Le cuisinier les ouvre
-- et les ferme par basculer_fermeture, jamais en écrivant la table. Le
-- client du menu ne lit que articles_fermes.
alter table public.closures enable row level security;
alter table public.closure_targets enable row level security;

create policy "member read" on public.closures
  for select to authenticated
  using (public.current_member_role(etablissement_id) is not null);
create policy "gerant insert" on public.closures
  for insert to authenticated
  with check (public.current_member_role(etablissement_id) = 'gerant');
create policy "gerant update" on public.closures
  for update to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant')
  with check (public.current_member_role(etablissement_id) = 'gerant');
create policy "gerant delete" on public.closures
  for delete to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant');

create policy "member read" on public.closure_targets
  for select to authenticated
  using (
    exists (
      select 1 from public.closures c
      where c.id = closure_id
        and public.current_member_role(c.etablissement_id) is not null
    )
  );
create policy "gerant write" on public.closure_targets
  for all to authenticated
  using (
    exists (
      select 1 from public.closures c
      where c.id = closure_id
        and public.current_member_role(c.etablissement_id) = 'gerant'
    )
  )
  with check (
    exists (
      select 1 from public.closures c
      where c.id = closure_id
        and public.current_member_role(c.etablissement_id) = 'gerant'
    )
  );

-- Un bouton pressé sur la tablette de cuisine se voit sur celle du gérant.
-- Les cibles ne sont pas publiées : elles s'écrivent avec leur fermeture
-- (enregistrer_fermeture), dont l'événement suffit. Identité complète : une
-- suppression porte son etablissement_id, sans quoi le filtre de
-- l'abonnement ne la laisserait jamais passer.
alter table public.closures replica identity full;
alter publication supabase_realtime add table public.closures;

-- ---------------------------------------------------------------------------
-- Calcul

-- L'heure de service d'un établissement : Paris, reculée de day_end_hour.
-- Sa date est la journée de service, son heure se compare aux horaires
-- reculés d'autant.
create function public.horloge_service(p_etablissement uuid, p_at timestamptz)
returns table (service_ts timestamp, day_end_hour int)
language sql
stable
set search_path = public
as $$
  select
    p_at at time zone 'Europe/Paris'
      - make_interval(hours => coalesce(s.day_end_hour, 0)),
    coalesce(s.day_end_hour, 0)::int
  from (select 1) seed
  left join etablissement_settings s on s.etablissement_id = p_etablissement;
$$;

-- L'horaire seul, sans le forçage à la main. Une fin qui tombe à la bascule
-- (minuit en heure de service) vaut fin de journée ; une fin avant le début
-- donne un créneau vide, que le formulaire du gérant refuse.
create function public.fermeture_planifiee(
  p_closure public.closures,
  p_service timestamp,
  p_day_end_hour int
)
returns boolean
language sql
immutable
as $$
  select p_closure.starts_at is not null
    and extract(isodow from p_service)::smallint = any (p_closure.days)
    and p_service::time
      >= p_closure.starts_at - make_interval(hours => p_day_end_hour)
    and (
      p_closure.ends_at is null
      or p_closure.ends_at - make_interval(hours => p_day_end_hour) = '00:00'
      or p_service::time
        < p_closure.ends_at - make_interval(hours => p_day_end_hour)
    );
$$;

create function public.fermeture_active(
  p_closure public.closures,
  p_service timestamp,
  p_day_end_hour int
)
returns boolean
language sql
immutable
as $$
  select case
    when p_closure.override_day = p_service::date then p_closure.override_closed
    else public.fermeture_planifiee(p_closure, p_service, p_day_end_hour)
  end;
$$;

revoke execute on function public.horloge_service(uuid, timestamptz)
  from public, anon, authenticated;
revoke execute on function public.fermeture_planifiee(public.closures, timestamp, int)
  from public, anon, authenticated;
revoke execute on function public.fermeture_active(public.closures, timestamp, int)
  from public, anon, authenticated;

-- Les articles coupés à l'instant donné. Le menu public l'appelle sans
-- session, comme tarifs_actifs : d'où security definer, qui ne livre que des
-- identifiants d'articles déjà publics — pas les noms que le gérant donne à
-- ses fermetures.
create function public.articles_fermes(
  p_etablissement uuid,
  p_at timestamptz default now()
)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select distinct i.id
  from horloge_service(p_etablissement, p_at) h
  join closures c
    on c.etablissement_id = p_etablissement
    and fermeture_active(c, h.service_ts, h.day_end_hour)
  join closure_targets t on t.closure_id = c.id
  join items i
    on i.etablissement_id = p_etablissement
    and (i.id = t.item_id or i.category_id = t.category_id);
$$;

revoke execute on function public.articles_fermes(uuid, timestamptz) from public;
grant execute on function public.articles_fermes(uuid, timestamptz)
  to anon, authenticated;

-- Une fermeture et ses cibles, d'un seul tenant : l'événement realtime de la
-- fermeture n'arrive qu'une fois les cibles écrites, et une cible refusée
-- n'en laisse pas une qui ne coupe plus rien. Droits de l'appelant : RLS
-- réserve l'écriture au gérant. p_closure null ⇒ nouvelle fermeture.
create function public.enregistrer_fermeture(
  p_etablissement uuid,
  p_closure uuid,
  p_name text,
  p_days smallint[],
  p_starts_at time,
  p_ends_at time,
  p_targets jsonb
)
returns public.closures
language plpgsql
set search_path = public
as $$
declare
  v_closure closures;
begin
  if p_closure is null then
    insert into closures (etablissement_id, name, days, starts_at, ends_at)
    values (p_etablissement, p_name, p_days, p_starts_at, p_ends_at)
    returning * into v_closure;
  else
    update closures
    set name = p_name, days = p_days, starts_at = p_starts_at, ends_at = p_ends_at
    where id = p_closure and etablissement_id = p_etablissement
    returning * into v_closure;
    if v_closure.id is null then
      raise exception 'Fermeture introuvable.';
    end if;
    delete from closure_targets where closure_id = v_closure.id;
  end if;
  -- Seules les cibles de l'établissement : un plat supprimé entre-temps
  -- (resté coché dans un écran ouvert) est ignoré, pas une erreur.
  insert into closure_targets (closure_id, category_id, item_id)
  select v_closure.id, (t.value->>'category_id')::uuid, (t.value->>'item_id')::uuid
  from jsonb_array_elements(p_targets) as t(value)
  where exists (
      select 1 from categories c
      where c.id = (t.value->>'category_id')::uuid
        and c.etablissement_id = p_etablissement
    )
    or exists (
      select 1 from items i
      where i.id = (t.value->>'item_id')::uuid
        and i.etablissement_id = p_etablissement
    );
  return v_closure;
end;
$$;

revoke execute on function public.enregistrer_fermeture(
  uuid, uuid, text, smallint[], time, time, jsonb
) from public, anon;
grant execute on function public.enregistrer_fermeture(
  uuid, uuid, text, smallint[], time, time, jsonb
) to authenticated;

-- Fermer ou rouvrir d'un geste, pour le reste de la journée de service. Si
-- l'horaire donne déjà l'état demandé, le forçage s'efface : rouvrir à 16 h
-- une cuisine fermée à la main laisse la fermeture de 22 h se faire.
create function public.basculer_fermeture(p_closure uuid, p_fermee boolean)
returns public.closures
language plpgsql
security definer
set search_path = public
as $$
declare
  v_closure closures;
  v_service timestamp;
  v_day_end_hour int;
begin
  select * into v_closure from closures where id = p_closure for update;
  if v_closure.id is null
     or coalesce(current_member_role(v_closure.etablissement_id)::text, '')
       not in ('gerant', 'cuisinier') then
    raise exception 'Fermeture introuvable.';
  end if;

  select h.service_ts, h.day_end_hour into v_service, v_day_end_hour
  from horloge_service(v_closure.etablissement_id, now()) h;

  if fermeture_planifiee(v_closure, v_service, v_day_end_hour) = p_fermee then
    update closures set override_closed = null, override_day = null
    where id = p_closure
    returning * into v_closure;
  else
    update closures
    set override_closed = p_fermee, override_day = v_service::date
    where id = p_closure
    returning * into v_closure;
  end if;
  return v_closure;
end;
$$;

revoke execute on function public.basculer_fermeture(uuid, boolean)
  from public, anon;
grant execute on function public.basculer_fermeture(uuid, boolean)
  to authenticated;

-- ---------------------------------------------------------------------------
-- place_order : reprise de 20261007000001_collect_menu.sql, signature
-- inchangée. S'y ajoutent les fermetures (refusées au client, pas à
-- l'équipe ; au retrait pour le click & collect) et la commande minimum en
-- ligne.

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
  -- que le gérant changeait le réglage tombe ici.
  if v_min is not null and v_paid > 0 and v_paid < v_min
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

revoke execute on function public.place_order(text, int, jsonb, boolean, text, jsonb) from public;
grant execute on function public.place_order(text, int, jsonb, boolean, text, jsonb) to anon, authenticated;
