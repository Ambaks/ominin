-- Paiement en ligne du menu QR : la commande n'entre dans « À encaisser »
-- qu'une fois le client décidé à régler au comptoir.
--
-- Jusqu'ici place_order posait la commande en en_attente quel que soit le
-- mode choisi : l'addition s'affichait à la caisse avant même que le client
-- ait ouvert Stripe, et la salle pouvait l'encaisser pendant qu'il payait
-- (paiement en ligne alors remboursé). Désormais, la commande porte l'heure
-- à laquelle le client a choisi le règlement en ligne : tant qu'elle est
-- récente, la caisse ne la voit pas. Réglée, elle part en cuisine et rejoint
-- l'historique (mark_order_paid_online, inchangée). Abandonnée — annulation
-- chez Stripe, widget refermé, session expirée — l'heure est effacée et
-- l'addition reparaît à encaisser ; si l'onglet client meurt sans rien dire,
-- la gestion la fait reparaître d'elle-même passé le délai de la session
-- (ONLINE_PAYMENT_WINDOW_S, côté front).

alter table public.orders
  add column online_payment_started_at timestamptz;

comment on column public.orders.online_payment_started_at is
  'Heure du choix « payer en ligne » par le client ; null = règlement au comptoir ou tentative abandonnée.';

-- ---------------------------------------------------------------------------
-- place_order : copie de 20260912000004_tarifs_planifies.sql plus le choix
-- du client. L'ancienne signature est supprimée : PostgREST ne saurait pas
-- choisir entre deux surcharges quand le quatrième argument est omis (prise
-- de commande en salle).

drop function public.place_order(text, int, jsonb);

create function public.place_order(
  p_slug text,
  p_table_number int,
  p_items jsonb,
  p_online_payment boolean default false
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
  insert into orders (etablissement_id, table_id, online_payment_started_at)
  values (v_etab, v_table, case when p_online_payment and v_online then now() end)
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

revoke execute on function public.place_order(text, int, jsonb, boolean) from public;
grant execute on function public.place_order(text, int, jsonb, boolean) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Le client renonce au paiement en ligne (« Payer au comptoir », paiement
-- annulé, widget impossible à démarrer) : l'addition redevient à encaisser.
-- Appelable sans compte, comme place_order : l'effet est celui qu'aurait eu
-- le choix « comptoir » d'emblée, et une commande déjà réglée ou close n'est
-- pas touchée.

create function public.abandon_online_payment(p_order_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update orders
  set online_payment_started_at = null
  where id = p_order_id
    and status = 'en_attente'
    and not paid_online;
$$;

revoke execute on function public.abandon_online_payment(uuid) from public;
grant execute on function public.abandon_online_payment(uuid) to anon, authenticated;
