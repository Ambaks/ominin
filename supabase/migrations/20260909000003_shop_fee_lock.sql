-- La commission d'Ominin ne se règle pas depuis la boutique. La policy
-- « owner update » ouvre toute la ligne à la propriétaire : le champ est
-- absent de son écran, mais rien n'empêchait un appel direct de remettre le
-- taux à zéro. Sans conséquence tant qu'il valait zéro ; le jour où il compte,
-- c'est le contrat qui devient modifiable par la cliente.
--
-- Trois colonnes relèvent d'Ominin et non de la vitrine : le taux, l'adresse
-- publique (la changer casserait les liens en circulation) et l'activation.
-- Le backend (clé service) et l'éditeur SQL ne passent pas par ce contrôle,
-- c'est par là qu'Ominin les fixe.

create function public.enforce_shop_update_rights()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'authenticated' then
    return new;
  end if;
  if new.platform_fee_percent is distinct from old.platform_fee_percent
     or new.slug is distinct from old.slug
     or new.is_active is distinct from old.is_active then
    raise exception 'Commission, adresse et activation de la boutique sont réservées à Ominin.';
  end if;
  return new;
end;
$$;

create trigger shops_enforce_update_rights
  before update on public.shops
  for each row execute function public.enforce_shop_update_rights();
