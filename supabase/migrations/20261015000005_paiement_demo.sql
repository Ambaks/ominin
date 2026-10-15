-- Paiement de démonstration : pour présenter le parcours complet à un
-- prospect (Boulangerie Cyprien), la feuille de paiement est imitée dans la
-- page et /api/demo/pay marque la commande payée en ligne — aucun
-- prestataire, aucun débit. La commande vit ensuite exactement comme une
-- vraie : ticket, Retraits, suivi.
--
-- Deux garde-fous :
--   - « demo » propose la carte sans compte relié (il n'y a rien à relier) ;
--   - « demo » ne se pose qu'hors session (Ominin, clé de service ou SQL) :
--     un gérant, qui peut modifier son établissement, ne peut pas se mettre
--     en démonstration et prendre des commandes payées sans paiement.

-- Reprise de 20260910000004 : le mode démonstration n'a pas de compte.
create or replace function public.enforce_online_payment_account()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if not new.online_payment then
    return new;
  end if;

  if new.payment_provider = 'demo' then
    return new;
  end if;

  if new.payment_provider = 'square' then
    if new.square_location_id is null or not exists (
      select 1 from public.square_accounts
      where etablissement_id = new.id
    ) then
      raise exception 'Reliez un compte Square et choisissez un point de vente avant de proposer le paiement par carte.'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if not exists (
    select 1
    from public.payment_accounts
    where etablissement_id = new.id
      and charges_enabled
  ) then
    raise exception 'Reliez un compte Stripe vérifié avant de proposer le paiement par carte.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_demo_payment_provider()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.payment_provider = 'demo'
     and (tg_op = 'INSERT' or old.payment_provider is distinct from 'demo')
     and auth.role() in ('authenticated', 'anon') then
    raise exception 'Le paiement de démonstration se règle chez Ominin.'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger enforce_demo_payment_provider
  before insert or update of payment_provider
  on public.etablissements
  for each row execute function public.enforce_demo_payment_provider();

-- Le règlement de démonstration, d'un bloc (verrou sur la commande) : une
-- commande d'un établissement en démonstration, en attente de son paiement
-- en ligne. Le pourboire suit la règle de /api/stripe/pay : jamais sur une
-- commande à emporter, jamais plus que la commande. Appelée par
-- /api/demo/pay, à la clé de service seulement.
create or replace function public.mark_demo_order_paid(
  p_order_id uuid,
  p_tip numeric default null
)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  v_order record;
  v_goods numeric;
begin
  select o.type, o.status, o.paid_online, o.online_payment_started_at,
         e.payment_provider, e.online_payment
    into v_order
  from orders o
  join etablissements e on e.id = o.etablissement_id
  where o.id = p_order_id
  for update of o;

  if not found
     or v_order.payment_provider is distinct from 'demo'
     or not v_order.online_payment then
    return false;
  end if;
  if v_order.paid_online then
    return true;
  end if;
  if v_order.status <> 'en_attente' or v_order.online_payment_started_at is null then
    return false;
  end if;

  select sum(quantity * unit_price) into v_goods
  from order_items where order_id = p_order_id;
  return mark_order_paid_online(
    p_order_id,
    case
      when v_order.type = 'collect' or p_tip is null or p_tip <= 0 then null
      else least(p_tip, v_goods)
    end
  );
end;
$$;

revoke execute on function public.mark_demo_order_paid(uuid, numeric) from public, anon, authenticated;
