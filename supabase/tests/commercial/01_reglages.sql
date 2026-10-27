-- Critère 2 bis et 13.2 n° 12/15 : les réglages appliqués par la base.
begin;
\i /work/tests/fixtures.inc

-- Les délais du contrat recopiés dans commercial_settings sont ceux de
-- lib/legal/constants.ts (passés par run.sh).
select pg_temp.ok(
  s.confirm_days = :CONFIRM_DAYS and s.sign_window_months = :SIGN_WINDOW_MONTHS
  and s.commission_percent = :COMMISSION_PERCENT and s.term_months = :TERM_MONTHS
  and s.option_years = :OPTION_YEARS and s.notice_months = :NOTICE_MONTHS
  and s.statement_before_day = :STATEMENT_BEFORE_DAY and s.payment_days = :PAYMENT_DAYS
  and s.detail_interval_months = :DETAIL_INTERVAL_MONTHS
  and s.detail_response_days = :DETAIL_RESPONSE_DAYS and s.contest_months = :CONTEST_MONTHS
  and s.final_statement_days = :FINAL_STATEMENT_DAYS
  and s.urssaf_threshold_cents = :URSSAF_THRESHOLD_EUROS * 100
  and s.urssaf_interval_months = :URSSAF_INTERVAL_MONTHS,
  'commercial_settings recopie lib/legal/constants.ts')
from public.commercial_settings s;

-- A ne lit ni n'écrit les réglages.
select pg_temp.act(:'a_user');
select pg_temp.ok((select count(*) from public.commercial_settings) = 0, 'A ne lit pas commercial_settings');
update public.commercial_settings set declaration_cap = 1000;
select pg_temp.ok(pg_temp.fails('insert into public.commercial_settings (id) values (false)'), 'A n''insère pas de réglages');
select pg_temp.reset();
select pg_temp.ok((select declaration_cap from public.commercial_settings) = 5, 'la mise à jour de A est sans effet');

-- L'admin, lui, les lit et les écrit.
select pg_temp.act(:'admin');
update public.commercial_settings set declaration_cap = 7;
select pg_temp.reset();
select pg_temp.ok((select declaration_cap from public.commercial_settings) = 7, 'l''admin règle le plafond');

-- Aucune fonction appelable par un commercial ne prend de plafond, de délai
-- ou de quota en argument.
select pg_temp.ok(not exists (
  select 1
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace,
       unnest(coalesce(p.proargnames, '{}')) arg
  where n.nspname = 'public'
    and has_function_privilege('authenticated', p.oid, 'execute')
    and p.proname like 'commercial%'
    and arg ~* '(cap|limit|quota|days|months|minutes|deadline|window|max|percent|radius|threshold|similar)'
), 'aucun paramètre de règle dans les fonctions du commercial');

-- Les fonctions internes et celles de la tâche quotidienne ne sont pas
-- appelables connecté.
select pg_temp.ok(not has_function_privilege('authenticated', p.oid, 'execute'), p.proname || ' fermée aux comptes connectés')
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in (
  'commercial_cfg', 'commercial_reflect', 'commercial_confirm_due', 'commercial_expire_due',
  'commercial_release_ended', 'commercial_settle', 'commercial_confirm_due_for',
  'commercial_expire_due_for', 'commercial_me', 'commercial_refusal', 'commercial_count_search',
  'crm_is_reserved');
select pg_temp.ok(has_function_privilege('service_role', 'public.commercial_confirm_due()', 'execute')
  and has_function_privilege('service_role', 'public.crm_is_reserved(uuid)', 'execute'),
  'le service_role appelle la tâche quotidienne et la garde de Léa');

-- Le compteur de recherches n'est lisible par personne d'autre que le
-- service_role (pas même l'admin).
select pg_temp.act(:'a_user');
select count(*) from public.commercial_search('Bistrot');
select pg_temp.act(:'admin');
select pg_temp.ok((select count(*) from public.commercial_quota_usage) = 0, 'l''admin ne lit pas les quotas');
select pg_temp.reset();
select pg_temp.ok((select searches from public.commercial_quota_usage where commercial_id = :'a') = 1, 'la recherche est comptée');

rollback;
