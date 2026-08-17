-- Capacité par créneau horaire pour le click & collect : nombre maximal de
-- commandes qu'un restaurant peut accepter sur un même créneau de retrait.
-- Le front génère les créneaux à partir de cette valeur ; le back la vérifie
-- avant d'insérer une commande programmée.

alter table public.etablissements
  add column collect_slot_capacity int not null default 5;

alter table public.etablissements
  add constraint etablissements_collect_slot_capacity_positive
    check (collect_slot_capacity >= 1);
