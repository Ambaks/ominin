-- Retours de Marwan (03/11) : le taux d'un commercial peut être à 0 %.

alter table public.commerciaux
  drop constraint commerciaux_commission_percent_check,
  add constraint commerciaux_commission_percent_check check (commission_percent >= 0 and commission_percent <= 100);
