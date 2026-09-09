-- Commission plateforme d'Ominin sur les paiements en ligne des restaurants.
-- Le même mécanisme que shops.platform_fee_percent, appliqué au menu QR :
-- Stripe reçoit un application_fee_amount, Square un app_fee_money, et la
-- commission transite directement vers le compte plateforme.

alter table public.etablissements
  add column platform_fee_percent numeric(5,2) not null default 1
    constraint etablissements_fee_range check (
      platform_fee_percent >= 0 and platform_fee_percent <= 100
    );

alter table public.orders
  add column platform_fee_cents integer;

-- Le gérant ne peut pas modifier la commission — même logique que le trigger
-- shops.enforce_shop_update_rights. Le backend (service_role) et l'éditeur
-- SQL passent outre.
create or replace function public.enforce_etablissement_fee_rights()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'authenticated' then
    return new;
  end if;
  if new.platform_fee_percent is distinct from old.platform_fee_percent then
    raise exception 'La commission plateforme est réservée à Ominin.';
  end if;
  return new;
end;
$$;

create trigger etablissements_enforce_fee_rights
  before update on public.etablissements
  for each row execute function public.enforce_etablissement_fee_rights();
