-- Retrait au bar. En fast food, le gérant peut faire retirer les commandes
-- au bar : prête, le ticket du client porte un code ; l'équipe le scanne
-- avec l'appareil photo d'un téléphone connecté à l'espace de gestion, et la
-- commande est remise. Le client ne peut pas se la remettre lui-même : il
-- faut un compte de l'équipe. Les QR de table imprimés restent valables, le
-- réglage est celui de l'établissement.

alter table public.etablissements
  add column bar_pickup boolean not null default false;

comment on column public.etablissements.bar_pickup is
  'Fast food : retrait au bar — prête, le client montre un code que l''équipe scanne pour lui remettre sa commande.';

-- L'heure de la remise d'une commande numérotée, par le scan ou par
-- « Remettre » au comptoir : un code scanné une seconde fois la dit.
alter table public.orders add column handed_over_at timestamptz;

create function public.stamp_handed_over()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.order_number is not null and new.status = 'servie'
     and old.status <> 'servie' then
    new.handed_over_at := now();
  end if;
  return new;
end;
$$;

-- Les triggers BEFORE s'exécutent dans l'ordre alphabétique : après
-- orders_counter_hold, une commande numérotée qu'on encaisse est revenue à
-- « payee » et n'est pas remise ; après orders_enforce_update_rights, qui
-- ne voit que ce que le serveur a écrit.
create trigger orders_stamp_handed_over
  before update of status on public.orders
  for each row execute function public.stamp_handed_over();
