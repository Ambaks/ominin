-- Audit HubRise : la caisse tient les stocks et les statuts. Ominin ne lui
-- pousse plus ni rupture, ni « prête », ni « remise » ; il ne lui écrit plus
-- que l'annulation d'une commande et ses règlements. Les genres « stock » et
-- « order_status » restent permis par la contrainte, pour les lignes passées.

drop trigger hubrise_enqueue_stock on public.items;
drop function public.hubrise_enqueue_stock();

drop trigger hubrise_enqueue_status on public.orders;
drop function public.hubrise_enqueue_status();

update public.hubrise_outbox
set status = 'skipped', last_error = 'Plus envoyé à la caisse.'
where kind in ('stock', 'order_status')
  and status in ('pending', 'blocked', 'dead');
