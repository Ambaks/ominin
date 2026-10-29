-- Les réglages appliqués par la base.
begin;
\i /work/tests/fixtures.inc

-- Les délais du contrat recopiés dans commercial_settings sont ceux de
-- lib/legal/constants.ts (passés par run.sh).
select pg_temp.ok(
  s.commission_percent = :COMMISSION_PERCENT and s.term_months = :TERM_MONTHS
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
update public.commercial_settings set visit_request_days = 5;
select pg_temp.act(:'a_user');
select pg_temp.ok((select count(*) from public.commercial_settings) = 0, 'A ne lit pas commercial_settings');
update public.commercial_settings set visit_request_days = 1000;
select pg_temp.ok(pg_temp.fails('insert into public.commercial_settings (id) values (false)'), 'A n''insère pas de réglages');
select pg_temp.reset();
select pg_temp.ok((select visit_request_days from public.commercial_settings) = 5, 'la mise à jour de A est sans effet');

-- L'admin, lui, les lit et les écrit.
select pg_temp.act(:'admin');
update public.commercial_settings set visit_request_days = 7;
select pg_temp.reset();
select pg_temp.ok((select visit_request_days from public.commercial_settings) = 7, 'l''admin règle le délai des demandes');

-- Aucune fonction appelable par un commercial ne prend de délai ou de taux
-- en argument.
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
  'commercial_cfg', 'commercial_me', 'commercial_contract_end', 'commercial_release_ended',
  'commercial_release_holds', 'commercial_release_requests', 'commercial_draft_statements',
  'commercial_option_reminders', 'commercial_urssaf_reminders', 'commercial_final_statements',
  'commercial_take', 'commercial_signup_client', 'commercial_pending_signups');
select pg_temp.ok(has_function_privilege('service_role', 'public.commercial_release_ended()', 'execute')
  and has_function_privilege('service_role', 'public.commercial_release_holds()', 'execute')
  and has_function_privilege('service_role', 'public.commercial_draft_statements()', 'execute'),
  'le service_role appelle la tâche quotidienne');

rollback;
