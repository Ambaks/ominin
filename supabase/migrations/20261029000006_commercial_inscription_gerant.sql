-- Le gérant lit l'inscription de son établissement : tant qu'aucune offre
-- n'est active, son espace de gestion affiche « Votre menu est en création »
-- au lieu de l'activation payante.
create policy "member read" on public.commercial_signups
  for select to authenticated
  using (exists (
    select 1 from public.memberships m
    where m.etablissement_id = commercial_signups.etablissement_id and m.user_id = (select auth.uid())
  ));
