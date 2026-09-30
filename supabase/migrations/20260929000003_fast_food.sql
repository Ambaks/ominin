-- Fast food. Un établissement choisit son type de service : « restaurant »
-- (le client scanne le QR de sa table, la salle lui apporte sa commande) ou
-- « fast food » (un seul QR, au comptoir ou au mur : le client commande sans
-- table et reçoit un numéro, qu'on appelle quand c'est prêt).
--
-- Une commande fast food reste une commande « sur place » : même encaissement
-- (comptoir ou en ligne), mêmes tickets, même historique. Seules changent sa
-- clé — un numéro du jour au lieu d'une table — et sa fin : payée, elle n'est
-- pas close d'un coup comme à table, elle attend d'être prête puis remise
-- (payee → prete → servie). C'est ce que le client suit sur son téléphone.

-- Le suivi en direct passe par realtime.send (plus bas) : sans lui, chaque
-- changement d'état d'une commande numérotée échouerait — encaissement,
-- « Prête », « Remettre ». Mieux vaut que la migration s'arrête ici.
do $$
begin
  if to_regprocedure('realtime.send(jsonb, text, text, boolean)') is null then
    raise exception 'realtime.send introuvable : Realtime doit être actif sur le projet';
  end if;
end $$;

create type public.service_mode as enum ('restaurant', 'fast_food');

-- Sur etablissements : le gérant règle son type de service lui-même (policy
-- « gerant update »), comme le paiement en ligne.
alter table public.etablissements
  add column service_mode public.service_mode not null default 'restaurant';

comment on column public.etablissements.service_mode is
  'restaurant : commande à table (QR par table) ; fast_food : commande au comptoir, numérotée.';

-- LZ.FOOD (snack, Montpellier) sert au comptoir : ses clients commandent sans
-- table et repartent avec un numéro.
update public.etablissements
set service_mode = 'fast_food'
where slug = 'lz-food';

-- L'heure locale (Paris) où les numéros repartent de 1. Réglage d'Ominin
-- (etablissement_settings ne s'écrit que depuis l'admin), distinct de
-- day_end_hour : un fast food que personne n'a réglé doit quand même repartir
-- à 1 au petit matin, pas en plein service de minuit.
alter table public.etablissement_settings
  add column order_number_reset_hour smallint not null default 4
    check (order_number_reset_hour between 0 and 23);

-- ---------------------------------------------------------------------------
-- Numéro de commande. Une commande sur place a une table ou un numéro, jamais
-- les deux ; une commande collect n'a ni l'un ni l'autre.

alter table public.orders
  add column order_number int check (order_number > 0);

alter table public.orders
  drop constraint orders_type_table_check,
  add constraint orders_type_table_check check (
    case type
      when 'sur_place' then (table_id is null) <> (order_number is null)
      else table_id is null and order_number is null
    end
  );

-- Un compteur par établissement : le jour qu'il compte et le dernier numéro
-- donné. Un jour plus récent le remet à 1 — la table ne grossit jamais. Un
-- jour plus ancien (l'heure de remise à zéro reculée en pleine journée) ne
-- relance pas la série : elle continue. Sans policy : seul le trigger
-- ci-dessous (security definer) y touche.
create table public.order_number_counters (
  etablissement_id uuid primary key
    references public.etablissements (id) on delete cascade,
  day date not null,
  last_number int not null
);

alter table public.order_number_counters enable row level security;

-- Toute commande sur place sans table prend le numéro suivant, quelle que
-- soit la voie d'insertion (menu du client, prise de commande en salle).
-- L'upsert verrouille la ligne du compteur : deux commandes simultanées ne
-- tirent jamais le même numéro.
create function public.assign_order_number()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_day date;
  v_number int;
begin
  if new.type <> 'sur_place' or new.table_id is not null
     or new.order_number is not null then
    return new;
  end if;
  select (now() at time zone 'Europe/Paris'
          - make_interval(hours => s.order_number_reset_hour))::date
  into v_day
  from etablissement_settings s
  where s.etablissement_id = new.etablissement_id;

  insert into order_number_counters (etablissement_id, day, last_number)
  values (new.etablissement_id, v_day, 1)
  on conflict (etablissement_id) do update
    set last_number = case
          when excluded.day > order_number_counters.day then 1
          else order_number_counters.last_number + 1
        end,
        day = greatest(order_number_counters.day, excluded.day)
  returning last_number into v_number;
  new.order_number := v_number;
  return new;
end;
$$;

create trigger orders_assign_number
  before insert on public.orders
  for each row execute function public.assign_order_number();

-- ---------------------------------------------------------------------------
-- Payée n'est pas finie. À table, l'encaissement clôt la commande quand son
-- ticket part en cuisine (en_attente → servie, pay_order_items et
-- mark_order_paid_online). Au comptoir, le client attend son numéro : la
-- commande numérotée s'arrête sur « payee » (en préparation), le comptoir la
-- passe « prete » puis « servie » à la remise. Réécrire ici plutôt que dans
-- ces deux longues fonctions couvre toutes les voies de règlement.
-- Le nom précède orders_enforce_transition : les triggers BEFORE d'une table
-- s'exécutent dans l'ordre alphabétique.

create function public.hold_numbered_order()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.order_number is not null and old.status = 'en_attente'
     and new.status = 'servie' and new.payment_mode is not null then
    new.status := 'payee';
  end if;
  return new;
end;
$$;

create trigger orders_counter_hold
  before update of status on public.orders
  for each row execute function public.hold_numbered_order();

-- Le numéro d'une commande ne change plus une fois donné : c'est lui que le
-- client a en main, et que le comptoir appelle.
create function public.freeze_order_number()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.order_number is distinct from old.order_number then
    raise exception 'Le numéro d''une commande ne se modifie pas.';
  end if;
  return new;
end;
$$;

create trigger orders_freeze_number
  before update of order_number on public.orders
  for each row execute function public.freeze_order_number();

-- Transitions : copie de 20260908000001_service_direct.sql, plus « prête »
-- pour les commandes numérotées — et son retour en préparation, pour un
-- « Prête » touché trop tôt.
create or replace function public.enforce_order_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status = old.status then
    return new;
  end if;
  if new.type = 'collect' then
    if not (case old.status
      when 'en_attente' then new.status in ('en_preparation', 'annulee')
      when 'en_preparation' then new.status in ('prete', 'annulee')
      when 'prete' then new.status in ('retiree', 'annulee')
      else false
    end) then
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

-- ---------------------------------------------------------------------------
-- Le client suit sa commande. Son identifiant (uuid tiré au hasard, connu de
-- lui seul) sert de clé : order_ticket rend le numéro, l'état et le contenu
-- du ticket, et chaque changement d'état est diffusé sur le canal Realtime
-- « commande:<id> ». Canal public : le connaître suppose l'identifiant, et il
-- ne porte que l'état. Un numéro vaut pour son jour : passé l'heure de remise
-- à zéro, le ticket n'est plus rendu — sauf une commande de la veille encore
-- en cours (passée à 3 h 55, prête après 4 h), jusqu'à la remise suivante.

create function public.order_ticket(p_order uuid)
returns table (
  order_number int,
  status public.order_status,
  created_at timestamptz,
  total numeric,
  -- Ce qui reste à régler : une addition peut l'être en partie au comptoir.
  due numeric,
  paid boolean,
  -- Règlement en ligne commencé et pas encore abouti : le client peut le
  -- terminer, ou choisir de payer au comptoir.
  paying boolean,
  items jsonb
)
language sql stable security definer
set search_path = public
as $$
  select
    o.order_number,
    o.status,
    o.created_at,
    (select coalesce(sum(oi.quantity * oi.unit_price), 0)
     from order_items oi where oi.order_id = o.id),
    (select coalesce(sum(oi.quantity * oi.unit_price), 0)
     from order_items oi where oi.order_id = o.id and oi.paid_mode is null),
    o.payment_mode is not null,
    o.online_payment_started_at is not null and not o.paid_online,
    -- Par nom et par choix : une ligne réglée en deux fois est scindée en
    -- base, le client n'a commandé qu'une chose ; deux compositions d'un plat
    -- restent deux lignes. Les choix, pour vérifier sa boisson au comptoir.
    (select coalesce(jsonb_agg(jsonb_build_object(
              'name', l.name, 'quantity', l.quantity, 'choices', l.choices)
            order by l.name), '[]'::jsonb)
     from (select oi.name, sum(oi.quantity) as quantity,
                  (select coalesce(jsonb_agg(c.value->>'choiceName' order by c.ordinality), '[]'::jsonb)
                   from jsonb_array_elements(oi.options) with ordinality c) as choices
           from order_items oi where oi.order_id = o.id
           group by oi.name, oi.options) l)
  from orders o
  join etablissement_settings s on s.etablissement_id = o.etablissement_id
  cross join lateral (
    select
      (o.created_at at time zone 'Europe/Paris'
       - make_interval(hours => s.order_number_reset_hour))::date as ordered,
      (now() at time zone 'Europe/Paris'
       - make_interval(hours => s.order_number_reset_hour))::date as today
  ) d
  where o.id = p_order
    and o.order_number is not null
    and (d.ordered = d.today
         or (d.ordered = d.today - 1 and o.status not in ('servie', 'annulee')));
$$;

revoke execute on function public.order_ticket(uuid) from public;
grant execute on function public.order_ticket(uuid) to anon, authenticated;

-- Le règlement en ligne abandonné (abandon_online_payment) ne change pas
-- l'état mais change le ticket (« Paiement en cours » → « À régler ») : il
-- est signalé aussi. Le signal ne porte que l'état ; le client relit
-- order_ticket, qui fait foi.
create function public.broadcast_order_status()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.order_number is not null
     and (new.status is distinct from old.status
          or new.online_payment_started_at is distinct from old.online_payment_started_at) then
    perform realtime.send(
      jsonb_build_object('status', new.status),
      'statut',
      'commande:' || new.id::text,
      false
    );
  end if;
  return new;
end;
$$;

create trigger orders_broadcast_status
  after update of status, online_payment_started_at on public.orders
  for each row execute function public.broadcast_order_status();

-- Une ligne annulée au comptoir (cancel_order_item) ou réglée à part change
-- le montant du ticket sans changer l'état : signalée aussi, une fois par
-- commande et par requête.
create function public.broadcast_order_lines()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_order record;
begin
  for v_order in
    select o.id, o.status
    from orders o
    where o.order_number is not null
      and o.id in (select order_id from changed)
  loop
    perform realtime.send(
      jsonb_build_object('status', v_order.status),
      'statut',
      'commande:' || v_order.id::text,
      false
    );
  end loop;
  return null;
end;
$$;

create trigger order_items_broadcast_update
  after update on public.order_items
  referencing new table as changed
  for each statement execute function public.broadcast_order_lines();

create trigger order_items_broadcast_delete
  after delete on public.order_items
  referencing old table as changed
  for each statement execute function public.broadcast_order_lines();

-- ---------------------------------------------------------------------------
-- place_order : copie de 20260929000002_formules_tickets.sql. En fast food,
-- pas de table : la commande prend son numéro du jour (orders_assign_number).
-- La carte fast food n'envoie jamais de table (elle ignore un ancien QR de
-- table) : un numéro de table vient d'une carte restée ouverte d'avant le
-- passage au comptoir, qui annoncerait « pour la table 4 » une commande
-- numérotée — refusée, avec de quoi la recharger ; l'inverse aussi, une
-- carte fast food qui commande sans table dans un restaurant. En restaurant,
-- une table manquante reste refusée.

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
  v_mode public.service_mode;
begin
  select id, offre, online_payment, service_mode
  into v_etab, v_offre, v_online, v_mode
  from etablissements where slug = p_slug;
  if v_etab is null then
    raise exception 'Établissement introuvable.';
  end if;
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

revoke execute on function public.place_order(text, int, jsonb, boolean, text) from public;
grant execute on function public.place_order(text, int, jsonb, boolean, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- update_order_payment : copie de 20260913000005_correction_encaissement.sql.
-- Une commande numérotée réglée au comptoir attend « prête » que son client
-- passe : son encaissement se corrige là aussi. Une commande collect prête,
-- réglée en ligne (payment_mode 'en_ligne', sans paid_online), reste
-- refusée : seules les commandes numérotées gagnent l'état « prête ». Même
-- signature : les droits restent ceux posés alors.

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
begin
  select * into v_order from orders where id = p_order_id for update;
  if v_order.id is null
     or current_member_role(v_order.etablissement_id) is distinct from 'gerant' then
    raise exception 'Réservé au gérant de l''établissement.';
  end if;
  if v_order.payment_mode is null or v_order.paid_online
     or (v_order.status not in ('payee', 'servie')
         and not (v_order.status = 'prete' and v_order.order_number is not null)) then
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
  -- de la page Paiements, il doit dire exactement ce que le gérant a saisi.
  delete from order_payments where order_id = p_order_id;
  if v_cash > 0 then
    insert into order_payments (order_id, mode, amount, cash_given, cash_change)
    values (p_order_id, 'especes', v_cash, p_cash_given, p_cash_change);
  end if;
  if v_goods - v_cash > 0 then
    insert into order_payments (order_id, mode, amount)
    values (p_order_id, 'carte', v_goods - v_cash);
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
