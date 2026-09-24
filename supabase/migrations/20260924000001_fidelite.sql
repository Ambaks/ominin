-- Programme de fidélité du menu QR. Le client laisse son numéro ou son email
-- au moment de commander : chaque euro réglé lui rapporte des points, et ses
-- points lui offrent les articles que le restaurant a choisis, au prix en
-- points qu'il leur a fixé.
--
-- Deux verrous. Ominin ouvre la capacité `fidelite` (etablissement_settings,
-- fermée par défaut : aucune offre ne la comprend d'office), puis le gérant
-- allume ou éteint son programme (etablissements.loyalty_enabled). Il faut
-- les deux, et une offre qui commande à table (Smart, Connect).
--
-- Pas de vérification du contact : c'est un choix assumé. Quiconque connaît
-- un numéro peut en dépenser les points ; l'enjeu est un dessert, pas un
-- compte bancaire.
--
-- Le solde n'est écrit nulle part : c'est la somme du journal. Chaque
-- mouvement lié à une commande y porte son order_id, si bien qu'annuler la
-- commande, c'est effacer ses lignes — les points dépensés reviennent, les
-- points gagnés repartent.

alter table public.etablissements
  add column loyalty_enabled boolean not null default false,
  add column loyalty_points_per_euro numeric(6,2) not null default 1
    check (loyalty_points_per_euro > 0);

comment on column public.etablissements.loyalty_enabled is
  'Le gérant a allumé son programme de fidélité (encore faut-il qu''Ominin ait ouvert la capacité fidelite).';
comment on column public.etablissements.loyalty_points_per_euro is
  'Points gagnés par euro réglé, pourboire et articles offerts exclus ; arrondi à l''entier inférieur par commande.';

-- ---------------------------------------------------------------------------
-- Les paliers de récompense : « 50 points — 1 café ou thé ou soft offert ».
-- Un palier offre un article au choix parmi les siens. Publics : le menu QR
-- les affiche sans compte, comme la carte elle-même.

create table public.loyalty_rewards (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null
    references public.etablissements (id) on delete cascade,
  label text not null check (btrim(label) <> ''),
  points int not null check (points > 0),
  created_at timestamptz not null default now()
);

create index loyalty_rewards_etablissement_idx
  on public.loyalty_rewards (etablissement_id);

create table public.loyalty_reward_items (
  reward_id uuid not null references public.loyalty_rewards (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  primary key (reward_id, item_id)
);

alter table public.loyalty_rewards enable row level security;
alter table public.loyalty_reward_items enable row level security;

create policy "public read" on public.loyalty_rewards
  for select to anon, authenticated using (true);
create policy "gerant insert" on public.loyalty_rewards
  for insert to authenticated
  with check (public.current_member_role(etablissement_id) = 'gerant');
create policy "gerant update" on public.loyalty_rewards
  for update to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant')
  with check (public.current_member_role(etablissement_id) = 'gerant');
create policy "gerant delete" on public.loyalty_rewards
  for delete to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant');

create policy "public read" on public.loyalty_reward_items
  for select to anon, authenticated using (true);
-- L'article doit être de la carte du palier.
create policy "gerant insert" on public.loyalty_reward_items
  for insert to authenticated
  with check (exists (
    select 1
    from public.loyalty_rewards r
    join public.items i on i.etablissement_id = r.etablissement_id
    where r.id = reward_id and i.id = item_id
      and public.current_member_role(r.etablissement_id) = 'gerant'
  ));
create policy "gerant delete" on public.loyalty_reward_items
  for delete to authenticated
  using (exists (
    select 1 from public.loyalty_rewards r
    where r.id = reward_id
      and public.current_member_role(r.etablissement_id) = 'gerant'
  ));

-- ---------------------------------------------------------------------------
-- Les clients, un par contact et par restaurant : les points d'une maison ne
-- valent rien chez la voisine. Aucune policy : le gérant les lit par
-- loyalty_customers_summary, le menu par loyalty_balance.

create table public.loyalty_customers (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null
    references public.etablissements (id) on delete cascade,
  -- Normalisé par loyalty_contact : email en minuscules, ou numéro.
  contact text not null,
  created_at timestamptz not null default now(),
  unique (etablissement_id, contact)
);

alter table public.loyalty_customers enable row level security;

create type public.loyalty_entry_kind as enum ('gain', 'depense', 'ajustement');

create table public.loyalty_entries (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null
    references public.loyalty_customers (id) on delete cascade,
  -- Une commande supprimée (paiement en ligne expiré) emporte ses mouvements.
  order_id uuid references public.orders (id) on delete cascade,
  kind public.loyalty_entry_kind not null,
  points int not null check (points <> 0),
  created_at timestamptz not null default now(),
  constraint loyalty_entries_order_kind check (
    (kind = 'ajustement') = (order_id is null)
  )
);

create index loyalty_entries_customer_idx on public.loyalty_entries (customer_id);
-- Un gain et une dépense au plus par commande.
create unique index loyalty_entries_order_kind_idx
  on public.loyalty_entries (order_id, kind) where order_id is not null;

alter table public.loyalty_entries enable row level security;

alter table public.orders
  add column loyalty_customer_id uuid
    references public.loyalty_customers (id) on delete set null;

-- Points payés par unité ; null = ligne réglée en euros. Une ligne offerte ne
-- coûte que ses suppléments d'options, et ne rapporte rien.
alter table public.order_items
  add column loyalty_points int check (loyalty_points > 0);

-- ---------------------------------------------------------------------------

create function public.loyalty_active(p_etablissement_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    e.offre in ('smart', 'connect')
      and e.loyalty_enabled
      and coalesce((s.features->>'fidelite')::boolean, false),
    false
  )
  from etablissements e
  left join etablissement_settings s on s.etablissement_id = e.id
  where e.id = p_etablissement_id;
$$;

revoke execute on function public.loyalty_active(uuid) from public;
grant execute on function public.loyalty_active(uuid) to anon, authenticated;

-- Un même client s'écrit de plusieurs façons : « 06 12 34 56 78 »,
-- « +33612345678 », « Jean@Mail.fr ». Numéro français ramené au format
-- national ; un numéro étranger garde son indicatif.
create function public.loyalty_contact(p_raw text)
returns text
language plpgsql immutable
as $$
declare
  v_raw text := btrim(coalesce(p_raw, ''));
  v_digits text;
begin
  if position('@' in v_raw) > 0 then
    v_raw := lower(v_raw);
    if v_raw !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      raise exception 'Adresse email invalide.';
    end if;
    return v_raw;
  end if;
  v_digits := regexp_replace(v_raw, '\D', '', 'g');
  if v_raw like '+%' then
    v_digits := '00' || v_digits;
  end if;
  if v_digits like '0033%' then
    v_digits := '0' || substr(v_digits, 5);
  end if;
  -- Longueur maximale E.164 (15 chiffres) plus le préfixe international 00.
  if v_digits !~ '^0\d{8,16}$' then
    raise exception 'Numéro de téléphone invalide.';
  end if;
  return v_digits;
end;
$$;

-- Solde affiché sous le choix du règlement. Null quand le programme est
-- éteint ; 0 pour un contact inconnu — il le deviendra à sa commande.
create function public.loyalty_balance(p_slug text, p_contact text)
returns int
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_etab uuid;
begin
  select id into v_etab from etablissements where slug = p_slug;
  if v_etab is null or not loyalty_active(v_etab) then
    return null;
  end if;
  return coalesce((
    select sum(le.points)
    from loyalty_customers lc
    join loyalty_entries le on le.customer_id = lc.id
    where lc.etablissement_id = v_etab
      and lc.contact = loyalty_contact(p_contact)
  ), 0);
end;
$$;

revoke execute on function public.loyalty_balance(text, text) from public;
grant execute on function public.loyalty_balance(text, text) to anon, authenticated;

-- Les clients du restaurant et leur solde, pour l'onglet Fidélité.
create function public.loyalty_customers_summary(p_etablissement_id uuid)
returns table (
  id uuid,
  contact text,
  points int,
  last_activity timestamptz
)
language plpgsql stable security definer
set search_path = public
as $$
begin
  if current_member_role(p_etablissement_id) is distinct from 'gerant' then
    raise exception 'Réservé au gérant de l''établissement.';
  end if;
  return query
  select lc.id,
         lc.contact,
         coalesce(sum(le.points), 0)::int,
         greatest(lc.created_at, max(le.created_at))
  from loyalty_customers lc
  left join loyalty_entries le on le.customer_id = lc.id
  where lc.etablissement_id = p_etablissement_id
  group by lc.id
  order by 4 desc;
end;
$$;

revoke execute on function public.loyalty_customers_summary(uuid) from public, anon;
grant execute on function public.loyalty_customers_summary(uuid) to authenticated;

-- Geste commercial du gérant : des points en plus ou en moins, sur un client
-- connu ou nouveau. Le solde ne descend pas sous zéro par ce biais.
create function public.loyalty_adjust(
  p_etablissement_id uuid,
  p_contact text,
  p_points int
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_contact text := loyalty_contact(p_contact);
  v_customer uuid;
  v_balance int;
begin
  if current_member_role(p_etablissement_id) is distinct from 'gerant' then
    raise exception 'Réservé au gérant de l''établissement.';
  end if;
  if coalesce(p_points, 0) = 0 then
    raise exception 'Indiquez un nombre de points.';
  end if;
  insert into loyalty_customers (etablissement_id, contact)
  values (p_etablissement_id, v_contact)
  on conflict (etablissement_id, contact) do nothing;
  select id into v_customer from loyalty_customers
  where etablissement_id = p_etablissement_id and contact = v_contact
  for update;
  select coalesce(sum(points), 0) into v_balance
  from loyalty_entries where customer_id = v_customer;
  if v_balance + p_points < 0 then
    raise exception 'Ce client n''a que % points.', v_balance;
  end if;
  insert into loyalty_entries (customer_id, kind, points)
  values (v_customer, 'ajustement', p_points);
end;
$$;

revoke execute on function public.loyalty_adjust(uuid, text, int) from public, anon;
grant execute on function public.loyalty_adjust(uuid, text, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Gain : quand la commande est encaissée — au comptoir, pay_order_items pose
-- le mode une fois toutes les lignes réglées ; en ligne, mark_order_paid_online
-- (Stripe, SumUp, Square). Sur la marchandise payée en euros seulement : ni le
-- pourboire (orders.tip_amount), ni les articles offerts.

create function public.loyalty_earn()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_points int;
begin
  if old.payment_mode is null and new.payment_mode is not null
     and new.loyalty_customer_id is not null and new.status <> 'annulee' then
    select floor(coalesce(sum(oi.quantity * oi.unit_price), 0) * e.loyalty_points_per_euro)
    into v_points
    from etablissements e
    left join order_items oi
      on oi.order_id = new.id and oi.loyalty_points is null
    where e.id = new.etablissement_id
    group by e.loyalty_points_per_euro;
    if v_points > 0 then
      insert into loyalty_entries (customer_id, order_id, kind, points)
      values (new.loyalty_customer_id, new.id, 'gain', v_points)
      on conflict (order_id, kind) where order_id is not null do nothing;
    end if;
  end if;
  return new;
end;
$$;

create trigger orders_loyalty_earn
  after update of payment_mode on public.orders
  for each row execute function public.loyalty_earn();

-- Annulation, encaissée ou non (voidPayment passe aussi par là) : la commande
-- n'a rien rapporté et n'a rien coûté.
create function public.loyalty_cancel()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.status = 'annulee' and old.status <> 'annulee' then
    delete from loyalty_entries where order_id = new.id;
  end if;
  return new;
end;
$$;

create trigger orders_loyalty_cancel
  after update of status on public.orders
  for each row execute function public.loyalty_cancel();

-- ---------------------------------------------------------------------------
-- place_order : copie de 20260915000001_paiement_en_ligne_en_cours.sql, plus
-- le contact du client et les lignes offertes ({"reward_id": …}). Le coût en
-- points est relu en base, jamais pris du navigateur, et débité dans la même
-- transaction, client verrouillé : deux commandes simultanées ne dépensent
-- pas deux fois le même solde. L'ancienne signature est supprimée pour que
-- PostgREST n'ait pas deux surcharges à départager.

drop function public.place_order(text, int, jsonb, boolean);

create function public.place_order(
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

-- ---------------------------------------------------------------------------
-- pay_order_items_internal : copie de 20260912000003_paiement_mixte.sql,
-- renommée par 20260923000002_encaissement_securise.sql (le point d'entrée
-- public vérifie le code d'encaissement avant de l'appeler ; create or
-- replace garde les droits retirés). Seule la scission d'une ligne réglée
-- en partie change : la part détachée garde son loyalty_points, sans quoi
-- une ligne offerte deviendrait une ligne payée et rapporterait des points.

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
        loyalty_points, paid_mode, paid_at
      )
      values (
        v_line.order_id, v_line.item_id, v_line.name, v_sel.quantity,
        v_line.unit_price, v_line.options, v_line.vat_rate,
        v_line.loyalty_points, p_mode, now()
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

-- ---------------------------------------------------------------------------
-- Une unité offerte annulée avant l'encaissement (cancel_order_item,
-- 20260923000002) rend ses points : la dépense de la commande se relit sur
-- ses lignes offertes. La scission d'une ligne par l'encaissement retire
-- puis réinsère la même quantité, la somme n'en bouge pas.

create function public.loyalty_resync_spend()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_order uuid := coalesce(new.order_id, old.order_id);
  v_cost int;
begin
  if coalesce(new.loyalty_points, old.loyalty_points) is null then
    return null;
  end if;
  select coalesce(sum(loyalty_points * quantity), 0) into v_cost
  from order_items
  where order_id = v_order and loyalty_points is not null;
  if v_cost = 0 then
    delete from loyalty_entries where order_id = v_order and kind = 'depense';
  else
    update loyalty_entries set points = -v_cost
    where order_id = v_order and kind = 'depense';
  end if;
  return null;
end;
$$;

create trigger order_items_loyalty_spend
  after insert or delete or update of quantity on public.order_items
  for each row execute function public.loyalty_resync_spend();
