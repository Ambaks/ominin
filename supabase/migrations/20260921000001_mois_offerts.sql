-- Mois offerts de l'offre Connect. L'offre s'ouvre sur sa commande de
-- démarrage, sans abonnement Stripe ; à la fin des mois offerts, le chiffre
-- d'affaires passé par Ominin tranche une fois pour toutes : au-dessus du
-- seuil annoncé sur la landing, la commission a payé le service et
-- l'abonnement reste à 0 € ; en dessous, les mensualités commencent.
--
-- Le seuil et la durée vivent dans lib/landing-data.ts avec les autres
-- tarifs — la base ne garde que la date de fin et le verdict rendu.

-- C'est le début des mois offerts qu'on garde, pas leur fin : la durée vient
-- de l'offre, et tout ce qui en dépend (la fin, la période jugée) se dérive de
-- la même façon — aucun décalage possible entre les deux.
alter table public.subscriptions
  -- null ⇒ offre sans mois offerts (Digital, click & collect).
  add column trial_started_at timestamptz,
  -- null ⇒ verdict pas encore rendu ; true ⇒ abonnement à 0 € acquis ;
  -- false ⇒ mensualités dues (l'accès attend leur souscription).
  add column fee_exempt boolean;

-- Chiffre d'affaires d'un établissement sur une période, au sens de
-- admin_menu_overview : les lignes de commande sur place réellement payées
-- (carte en ligne, espèces ou comptoir), annulations exclues. Le click &
-- collect a son propre abonnement et sa propre commission : il ne compte pas.
-- Appelée par le service_role seul (app/api/offre/trial) : le verdict ne se
-- calcule jamais depuis le navigateur.
create function public.offre_trial_revenue(
  p_etablissement_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(oi.quantity * oi.unit_price), 0)
  from order_items oi
  join orders o on o.id = oi.order_id
  where o.etablissement_id = p_etablissement_id
    and o.type = 'sur_place'
    and o.status <> 'annulee'
    and oi.paid_at >= p_from
    and oi.paid_at < p_to;
$$;

revoke execute on function
  public.offre_trial_revenue(uuid, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function
  public.offre_trial_revenue(uuid, timestamptz, timestamptz) to service_role;
