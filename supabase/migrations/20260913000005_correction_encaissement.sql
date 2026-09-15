-- Corriger un encaissement au comptoir, quel qu'en soit le mode. La page
-- Paiements ne savait retoucher que les espèces (montant reçu, monnaie) et
-- n'annulait qu'elles : une addition passée en carte par erreur, ou partagée
-- entre les deux, restait figée. Le gérant réécrit désormais le mode et sa
-- répartition. L'annulation, elle, était déjà ouverte à tout mode par la
-- transition payee/servie → annulee (20260908000001) — seul l'écran la
-- retenait aux espèces.
--
-- Le règlement en ligne reste hors d'atteinte : c'est une transaction réelle
-- chez Stripe, SumUp ou Square, elle ne se réécrit pas d'ici. Le pourboire ne
-- bouge pas non plus : il vit sur orders.tip_amount, la répartition porte sur
-- la marchandise, comme les jambes de order_payments.

create function public.update_order_payment(
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
     or v_order.status not in ('payee', 'servie') then
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

revoke execute on function public.update_order_payment(uuid, public.payment_mode, numeric, numeric, numeric) from public, anon;
grant execute on function public.update_order_payment(uuid, public.payment_mode, numeric, numeric, numeric) to authenticated;
