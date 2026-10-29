-- Deux décisions de la caisse HubRise qu'Ominin ne savait pas suivre.
--
-- Refusée ou annulée par la caisse après un paiement en ligne : la commande
-- est remboursée chez son prestataire (lib/hubrise/refund.ts), et le dit.
-- refunded_at reste vide tant que l'argent n'est pas rendu : la page
-- Paiements la montre alors « à rembourser ».
alter table public.orders
  add column refunded_at timestamptz,
  add column refund_id text;

-- Terminée à la caisse sans règlement transmis : réglée à la caisse, mode
-- inconnu. Une seule jambe « caisse » pour toute la marchandise, venue de la
-- caisse (till_payment : elle n'y repart pas), et la commande est close —
-- servie, remise si elle est numérotée. Ne fait rien (false) d'une commande
-- déjà réglée, même en partie, réglée en ligne ou en cours de paiement :
-- la garde de hubrise_record_till_payment.
create function public.hubrise_close_at_till(p_order uuid)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_due numeric;
begin
  select * into v_order from orders where id = p_order for update;
  if v_order.id is null
     or v_order.type <> 'sur_place'
     or v_order.status <> 'en_attente'
     or v_order.payment_mode is not null
     or v_order.paid_online
     or v_order.online_payment_started_at is not null
     or exists (select 1 from order_items where order_id = p_order and paid_mode is not null) then
    return false;
  end if;

  select coalesce(sum(quantity * unit_price), 0) into v_due
  from order_items where order_id = p_order;
  if v_due > 0 then
    insert into order_payments (order_id, mode, amount, till_payment)
    values (p_order, 'caisse', v_due, true);
  end if;
  update order_items
  set paid_mode = 'caisse', paid_at = now(), served_at = coalesce(served_at, now())
  where order_id = p_order;

  -- En deux temps : réglée d'abord, close ensuite — une commande numérotée
  -- réglée resterait sinon à remettre (hold_numbered_order). Les tickets que
  -- le règlement met en file, la clôture les abandonne (sync_order_tickets) :
  -- la commande est terminée, la cuisine n'a rien à préparer.
  update orders set status = 'payee', payment_mode = 'caisse' where id = p_order;
  update orders
  set status = 'servie',
      handed_over_at = coalesce(handed_over_at, case when order_number is not null then now() end)
  where id = p_order;
  return true;
end;
$$;

revoke execute on function public.hubrise_close_at_till(uuid) from public, anon, authenticated;
grant execute on function public.hubrise_close_at_till(uuid) to service_role;
