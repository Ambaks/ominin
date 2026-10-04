-- Paiement en ligne abandonné, côté Square. Une commande dont le client a
-- choisi le règlement en ligne reste hors de la caisse tant qu'il paie
-- (online_payment_started_at). Stripe clôt l'affaire quand sa session expire
-- (discard_online_payment) ; Square n'a pas de session : un client qui ferme
-- l'onglet, ou renonce après un refus sans toucher « Payer au comptoir »,
-- laissait sa commande en attente pour toujours, invisible en caisse et son
-- stock retenu. Au BOHO : 164 commandes entre le 16 septembre et le 3 octobre
-- 2026, la plupart recommandées aussitôt à la même table.
--
-- La route /api/square/expire (workflow square-expire.yml) écarte ces
-- tentatives une fois passée la durée de vie d'une session Stripe, comme le
-- fait discard_online_payment. Deux fonctions, réservées au serveur.

-- ---------------------------------------------------------------------------
-- Le débit Square part : la commande est revendiquée pour ce paiement et sa
-- tentative datée de cet instant. L'expiration ne peut donc pas écarter une
-- commande en cours de débit ; si elle vient de l'écarter, la revendication
-- échoue et rien n'est débité. Une commande déjà passée au comptoir (heure
-- effacée) garde son heure nulle : elle reste en caisse.

create function public.begin_square_payment(p_order_id uuid, p_idempotency_key uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  update orders
  set square_idempotency_key = p_idempotency_key,
      online_payment_started_at = case
        when online_payment_started_at is not null then now()
      end
  where id = p_order_id
    and status = 'en_attente'
    and not paid_online
  returning true;
$$;

revoke execute on function public.begin_square_payment(uuid, uuid) from public, anon, authenticated;
grant execute on function public.begin_square_payment(uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Tentative en ligne commencée avant p_started_before, jamais réglée, ni
-- passée au comptoir, ni encaissée en partie : la commande n'a jamais existé
-- pour le restaurant. Annulée d'abord (orders_restore_stock rend le stock),
-- puis supprimée, comme dans discard_online_payment. Le verrou relit la ligne :
-- une tentative relancée entre-temps (begin_square_payment) n'est plus visée.
-- Rend vrai si la commande a été écartée.

create function public.discard_stale_online_payment(p_order_id uuid, p_started_before timestamptz)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order uuid;
begin
  select o.id into v_order from orders o
  where o.id = p_order_id
    and o.status = 'en_attente'
    and not o.paid_online
    and o.online_payment_started_at < p_started_before
    and not exists (select 1 from order_payments p where p.order_id = o.id)
  for update;
  if v_order is null then
    return false;
  end if;
  update orders set status = 'annulee' where id = v_order;
  delete from orders where id = v_order;
  return true;
end;
$$;

revoke execute on function public.discard_stale_online_payment(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.discard_stale_online_payment(uuid, timestamptz) to service_role;
