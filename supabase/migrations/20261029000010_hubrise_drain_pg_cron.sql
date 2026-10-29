-- Filet HubRise cadencé par la base : le cron « */5 » de GitHub Actions ne
-- passait en réalité que toutes les 3 à 6 heures, si bien que les renvois, les
-- alertes « commande non reprise » et la relecture horaire de la caisse
-- attendaient des heures. pg_cron appelle /api/hubrise/drain toutes les
-- 5 minutes ; hubrise-drain.yml reste, pour son canal d'alerte (pg_net
-- n'alerte personne quand l'appel échoue).
--
-- L'URL et le secret vivent dans Vault, posés à la main (le dépôt est
-- public) :
--   select vault.create_secret('https://menu.ominin.com', 'menu_url');
--   select vault.create_secret('<CRON_SECRET>', 'cron_secret');
-- Tant qu'ils manquent, l'appel échoue dans cron.job_run_details, sans
-- effet ailleurs.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'hubrise-drain',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'menu_url')
      || '/api/hubrise/drain',
    headers := jsonb_build_object(
      'X-Cron-Secret',
      (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    timeout_milliseconds := 120000
  )
  $$
);
