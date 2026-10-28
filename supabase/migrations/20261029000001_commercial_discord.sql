-- Refonte de l'espace commercial (28/10) : le membre Discord de chaque
-- commercial, choisi par l'admin, pour que le site le mentionne dans les
-- salons ; et le délai d'une demande de visite, saisi par l'admin.

alter table public.commerciaux
  add column discord_user_id text unique;

-- Une demande de visite sans réponse, ou refusée sans que le restaurant
-- avance, le libère pour tous après ce délai. Vide : pas de libération.
alter table public.commercial_settings
  add column visit_request_days int check (visit_request_days > 0);
