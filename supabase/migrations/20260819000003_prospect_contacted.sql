-- Nouveau verdict 'contacted' : l'agent sort un prospect de l'ensemble
-- 'qualified' dès que son e-mail à froid est parti. Sans ce statut, la
-- requête de composition rechargeait l'intégralité des prospects qualifiés
-- à chaque run (PostgREST tronque silencieusement à 1000 lignes : au-delà,
-- les nouveaux qualifiés ne sont plus jamais servis et le pipeline stalle).

alter table public.outreach_prospects
  drop constraint outreach_prospects_qualification_check;

alter table public.outreach_prospects
  add constraint outreach_prospects_qualification_check
  check (qualification in ('pending', 'qualified', 'disqualified', 'contacted'));
