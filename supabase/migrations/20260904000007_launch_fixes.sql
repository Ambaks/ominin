-- Correctifs de lancement : Stripe seul fournisseur du paiement à table,
-- annulation des commandes non réglées ouverte au serveur, stock restitué
-- à l'annulation.

-- ---------------------------------------------------------------------------
-- SumUp mis en attente : le scope OAuth « payments » n'est pas accordé, aucun
-- checkout SumUp ne peut aboutir. Tout établissement le portant (BOHO, seed
-- 20260817000001) repasse sur Stripe — null vaut Stripe partout.

update public.etablissements
set payment_provider = null
where payment_provider = 'sumup';

-- ---------------------------------------------------------------------------
-- Le serveur annule une commande encore à encaisser (erreur de saisie, client
-- parti) : aucun règlement à défaire. Une commande payée reste du ressort du
-- gérant. Copie de 20260904000005_service_flow.sql, une clause ajoutée.

create or replace function public.enforce_order_update_rights()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_role public.member_role;
begin
  if auth.role() is distinct from 'authenticated' then
    return new;
  end if;
  v_role := current_member_role(new.etablissement_id);
  if v_role = 'gerant' then
    return new;
  end if;
  if v_role = 'serveur' then
    if to_jsonb(new) - 'status' - 'payment_mode' - 'cash_given' - 'cash_change' - 'tip_amount' - 'estimated_ready_at'
         is distinct from to_jsonb(old) - 'status' - 'payment_mode' - 'cash_given' - 'cash_change' - 'tip_amount' - 'estimated_ready_at'
       or old.status in ('servie', 'annulee', 'retiree')
       or (new.status <> old.status
           and new.status not in ('payee', 'servie', 'en_preparation', 'prete', 'retiree')
           and not (new.status = 'annulee' and old.status = 'en_attente')) then
      raise exception 'Le rôle serveur ne permet pas cette modification.';
    end if;
    return new;
  end if;
  raise exception 'Modification non autorisée.';
end;
$$;

-- ---------------------------------------------------------------------------
-- Stock : place_order le décrémente à la commande ; une annulation le laissait
-- perdu (article « indisponible » à tort sur le menu). Restitué à l'annulation,
-- toutes lignes d'un même article confondues.

create function public.restore_stock_on_cancel()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.status = 'annulee' and old.status <> 'annulee' then
    update items i
    set stock = i.stock + q.quantity
    from (
      select item_id, sum(quantity) as quantity
      from order_items
      where order_id = new.id and item_id is not null
      group by item_id
    ) q
    where q.item_id = i.id and i.stock is not null;
  end if;
  return new;
end;
$$;

create trigger orders_restore_stock
  after update of status on public.orders
  for each row execute function public.restore_stock_on_cancel();
