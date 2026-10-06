-- Reconstituée le 2026-10-06 depuis supabase_migrations.schema_migrations :
-- appliquée en production le 2026-10-04 mais jamais versionnée. Le texte est
-- celui que la base a enregistré, instruction par instruction.

-- Un paiement en ligne se confirme par plusieurs voies à la fois : la route
-- de paiement et les webhooks Square, le retour du client et le webhook
-- Stripe, la vérification et le webhook SumUp. Chacune lit paid_online avant
-- d'appeler mark_order_paid_online ; quand deux lectures se croisent, la
-- commande est réglée deux fois. Le second passage réécrivait le statut à
-- l'identique (« servie »), et sync_order_tickets, déclenché par toute
-- écriture de la colonne, abandonnait les tickets que le premier venait de
-- mettre en file : si Omilink n'était pas passé entre les deux, rien ne
-- sortait en cuisine (BOHO, 2 et 3 octobre 2026 — cinq commandes payées).
--
-- Deux verrous : le trigger n'abandonne les tickets que sur un vrai
-- changement de statut, et le règlement en ligne ne se rejoue plus. Il dit à
-- l'appelant s'il a réglé la commande, pour que l'annonce « nouvelle
-- commande » ne parte qu'une fois.

-- ---------------------------------------------------------------------------
-- Reprise de 20260908000001_service_direct.sql, garde de changement en plus.

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
  if (tg_op = 'INSERT' and new.type = 'collect')
     or (tg_op = 'UPDATE' and old.status = 'en_attente'
         and new.status in ('payee', 'servie')) then
    insert into print_jobs (etablissement_id, printer_id, order_id, kind)
    select new.etablissement_id, id, new.id, 'order'
    from printers where etablissement_id = new.etablissement_id;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reprise de 20260912000003_paiement_mixte.sql. Le type de retour change
-- (void → boolean) : la fonction est recréée, ses droits avec.

drop function public.mark_order_paid_online(uuid, numeric);

create function public.mark_order_paid_online(p_order_id uuid, p_tip numeric default null)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_printed boolean;
  v_amount numeric;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found then
    raise exception 'Commande introuvable.';
  end if;
  -- Déjà réglée par une autre voie : le verrou ci-dessus a fait attendre ce
  -- passage jusqu'à la fin du premier, il n'a plus rien à écrire.
  if v_order.paid_online then
    return false;
  end if;
  v_printed := v_order.type = 'sur_place'
    and v_order.status = 'en_attente'
    and printer_online(v_order.etablissement_id);

  select coalesce(sum(quantity * unit_price), 0) into v_amount
  from order_items
  where order_id = p_order_id and paid_mode is null;

  update order_items
  set paid_mode = 'en_ligne',
      paid_at = now(),
      served_at = case when v_printed then now() else served_at end
  where order_id = p_order_id and paid_mode is null;

  if v_amount > 0 then
    insert into order_payments (order_id, mode, amount)
    values (p_order_id, 'en_ligne', v_amount);
  end if;

  update orders
  set paid_online = true,
      payment_mode = 'carte',
      tip_amount = case when coalesce(p_tip, 0) > 0 then p_tip else tip_amount end,
      status = case
        when type <> 'sur_place' or status <> 'en_attente' then status
        when v_printed then 'servie'
        else 'payee'
      end
  where id = p_order_id;
  return true;
end;
$$;

revoke execute on function public.mark_order_paid_online(uuid, numeric)
  from public, anon, authenticated;

grant execute on function public.mark_order_paid_online(uuid, numeric) to service_role;
