-- ---------------------------------------------------------------------------
-- Ola : tenir la promesse de 20261001000001, « les coordonnées ne sortent
-- jamais de la base ». La politique ola_businesses_select (authenticated,
-- using true) et les droits que Supabase accorde par défaut sur les tables
-- laissaient tout compte connecté lire location par PostgREST ; pour un
-- entrepreneur individuel, ce point est souvent son domicile.
--
-- Désormais, un utilisateur connecté n'atteint l'annuaire que par
-- ola_find_businesses, qui renvoie une distance : la fonction passe en
-- security definer (search_path déjà vide) et la table n'est plus lisible
-- que par son propriétaire et service_role (remplissage par
-- app/services/ola_ingest.py, recherche de l'agent vocal). La RLS reste
-- active, sans politique : elle refuse tout si un droit revient un jour.
-- ---------------------------------------------------------------------------

drop policy "ola_businesses_select" on public.ola_businesses;

revoke all on table public.ola_businesses from public, anon, authenticated;

alter function public.ola_find_businesses(
  double precision, double precision, integer, integer, text[], text
) security definer;

revoke execute on function public.ola_find_businesses(
  double precision, double precision, integer, integer, text[], text
) from public, anon;
grant execute on function public.ola_find_businesses(
  double precision, double precision, integer, integer, text[], text
) to authenticated, service_role;
