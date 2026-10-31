-- menu_rollup recalcule toutes les journées révolues encore présentes dans
-- menu_sessions. Or la purge retire les visites au fil de l'heure, pas par
-- journée entière : une journée à la limite de la rétention est donc recalculée
-- sur ce qu'il en reste, et son chiffre complet était écrasé par un chiffre
-- amputé. Un recalcul ne peut que corriger une journée complète (une étape
-- franchie après minuit), jamais la réduire : moins de visites qu'à la
-- consolidation précédente, c'est que la purge est passée.

create or replace function public.menu_rollup(
  p_session_ttl_days int,
  p_click_ttl_days int
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days int;
begin
  insert into menu_stats_daily (
    etablissement_id, day, sessions, categories, plats,
    paniers, commandes, paiements, item_clicks
  )
  select etablissement_id, started_at::date,
         count(*)::int,
         count(*) filter (where stage >= 'categorie')::int,
         count(*) filter (where stage >= 'plat')::int,
         count(*) filter (where stage >= 'panier')::int,
         count(*) filter (where stage >= 'commande')::int,
         count(*) filter (where stage >= 'paiement')::int,
         coalesce(sum(item_clicks), 0)::int
  from menu_sessions
  where started_at < current_date
  group by 1, 2
  on conflict (etablissement_id, day) do update
    set sessions = excluded.sessions,
        categories = excluded.categories,
        plats = excluded.plats,
        paniers = excluded.paniers,
        commandes = excluded.commandes,
        paiements = excluded.paiements,
        item_clicks = excluded.item_clicks
    where excluded.sessions >= menu_stats_daily.sessions;
  get diagnostics v_days = row_count;

  delete from menu_track_budget where minute < now() - interval '1 hour';
  delete from menu_sessions
    where last_seen_at < now() - make_interval(days => p_session_ttl_days);
  delete from menu_item_clicks
    where day < current_date - p_click_ttl_days;

  return v_days;
end;
$$;
