-- Espace commercial, lot 1 : les déclarations (article 4.3 du contrat).
--
-- Un commercial déclare un restaurant de la base commune ; Ominin confirme ou
-- refuse dans le délai contractuel, faute de quoi la déclaration est
-- confirmée de droit ; confirmée, elle réserve le restaurant pendant la
-- fenêtre de signature. Les règles qui font foi entre les parties (délais,
-- refus, invariants) sont tenues ici, en base : le commercial appelle les
-- fonctions directement par l'API, il ne doit rien pouvoir y contourner.
--
-- Ce fichier pose les tables, les réglages et les gardes ; les fonctions
-- appelées par l'espace et par l'admin suivent dans le fichier d'après.

-- ---------------------------------------------------------------------------
-- Réglages appliqués par la base. Une seule ligne, écrite par l'admin seul.
-- Les valeurs du contrat signé sont recopiées de lib/legal/constants.ts (un
-- script d'assertion vérifie l'égalité) ; les autres sont saisies par l'admin
-- dans l'onglet Réglages. Vide : la règle est désactivée (pas de plafond, pas
-- de carence…) ou, quand ce n'est pas possible, l'écran admin la signale.
-- Aucune n'est jamais un argument d'une fonction appelable par un commercial.
create table public.commercial_settings (
  id boolean primary key default true check (id),
  -- Contrat (lib/legal/constants.ts).
  confirm_days int not null check (confirm_days > 0),
  sign_window_months int not null check (sign_window_months > 0),
  commission_percent numeric not null check (commission_percent > 0),
  term_months int not null check (term_months > 0),
  option_years int not null check (option_years > 0),
  notice_months int not null check (notice_months > 0),
  statement_before_day int not null check (statement_before_day between 1 and 28),
  payment_days int not null check (payment_days > 0),
  detail_interval_months int not null check (detail_interval_months > 0),
  detail_response_days int not null check (detail_response_days > 0),
  contest_months int not null check (contest_months > 0),
  final_statement_days int not null check (final_statement_days > 0),
  urssaf_threshold_cents int not null check (urssaf_threshold_cents > 0),
  urssaf_interval_months int not null check (urssaf_interval_months > 0),
  -- Saisis par l'admin.
  declaration_cap int check (declaration_cap > 0),
  cooldown_days int check (cooldown_days > 0),
  in_talks_days int check (in_talks_days > 0),
  search_max_results int check (search_max_results > 0),
  search_daily_quota int check (search_daily_quota > 0),
  places_daily_quota int check (places_daily_quota > 0),
  retained_note_max_chars int check (retained_note_max_chars > 0),
  expiry_warning_days int check (expiry_warning_days > 0),
  option_reminder_days int check (option_reminder_days > 0),
  signup_link_days int check (signup_link_days > 0),
  appointment_reminder_minutes int check (appointment_reminder_minutes > 0),
  nearby_radius_m int check (nearby_radius_m > 0),
  -- Similarité de nom (pg_trgm, 0 à 1) au-delà de laquelle une déclaration
  -- ou une inscription lève l'alerte « déjà client ? » / « nom différent ».
  name_similarity numeric check (name_similarity > 0 and name_similarity < 1),
  -- Démos du Kit (slugs de /menu/demo), choisies par l'admin.
  kit_demo_slugs text[] not null default '{}',
  updated_at timestamptz not null default now()
);

insert into public.commercial_settings (
  confirm_days, sign_window_months, commission_percent, term_months,
  option_years, notice_months,
  statement_before_day, payment_days, detail_interval_months,
  detail_response_days, contest_months, final_statement_days,
  urssaf_threshold_cents, urssaf_interval_months
) values (7, 6, 15, 24, 3, 3, 10, 30, 3, 15, 3, 30, 500000, 6);

create trigger commercial_settings_touch before update on public.commercial_settings
  for each row execute function public.set_updated_at();

alter table public.commercial_settings enable row level security;
create policy "admin read" on public.commercial_settings
  for select to authenticated using ((select public.is_admin()));
create policy "admin update" on public.commercial_settings
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Lecture interne des fonctions : la ligne unique.
create function public.commercial_cfg()
returns public.commercial_settings
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.commercial_settings where id;
$$;
revoke execute on function public.commercial_cfg() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Fin du contrat du commercial (article 7) et option (article 3).
alter table public.commerciaux
  add column option_exercised_at timestamptz,
  add column notice_given_at timestamptz,
  add column ended_at timestamptz,
  add column end_reason text check (end_reason in ('term', 'resignation', 'breach', 'immediate', 'mutual')),
  -- Rappel de l'option envoyé à l'admin (une fois, avant l'échéance).
  add column option_reminded_at timestamptz,
  add constraint commerciaux_end_reason check ((ended_at is null) = (end_reason is null));

-- ---------------------------------------------------------------------------
-- Listes fermées (section 4.8 du cahier).
create type public.commercial_declaration_status as enum
  ('pending', 'confirmed', 'refused', 'abandoned', 'expired', 'signed', 'passage');

create type public.commercial_refusal_reason as enum
  ('client', 'declared', 'in_talks', 'opted_out', 'cap', 'cooldown', 'admin');

-- Motifs de fin d'un abandon ou d'un passage sans suite, puis fins système.
create type public.commercial_end_reason as enum
  ('not_interested', 'equipped', 'contract_elsewhere', 'closed', 'unreachable',
   'head_office', 'opposition', 'other',
   'contract_ended', 'merged', 'reassigned');

create table public.commercial_declarations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.crm_restaurants (id),
  commercial_id uuid not null references public.commerciaux (id),
  -- Version du contrat signée par le commercial au moment de déclarer : la
  -- preuve des règles qui s'appliquaient. Nulle pour un passage sans suite.
  contract_version_id uuid references public.legal_versions (id),
  status public.commercial_declaration_status not null,
  -- 'espace' : depuis l'espace ; 'email' : reçue par e-mail, saisie par l'admin.
  channel text not null default 'espace' check (channel in ('espace', 'email')),
  declared_at timestamptz not null default now(),
  confirm_deadline timestamptz,
  confirmed_at timestamptz,
  -- Null : confirmation tacite (délai échu).
  confirmed_by uuid references auth.users (id) on delete set null,
  reserved_until timestamptz,
  refusal_reason public.commercial_refusal_reason,
  end_reason public.commercial_end_reason,
  -- Motif écrit d'un refus manuel, d'une réattribution ou d'une fusion.
  decision_note text,
  -- Accord écrit du titulaire joint à une réattribution (commercial-docs).
  decision_document text,
  ended_at timestamptz,
  -- Interlocuteur exigé par l'article 4.3.
  contact_id uuid references public.crm_contacts (id) on delete set null,
  -- Déclaration née d'une réattribution.
  reassigned_from uuid references public.commercial_declarations (id),
  -- Alerte « déjà client ? » : nom proche d'un établissement ou d'une
  -- boutique ; la déclaration reste en attente, l'admin tranche.
  client_alert text,
  admin_notified_at timestamptz,
  -- {"1": "2026-10-26T…", "3": …} : date de chaque étape cochée.
  step_done_at jsonb not null default '{}' check (jsonb_typeof(step_done_at) = 'object'),
  retained jsonb not null default '{}' check (jsonb_typeof(retained) = 'object'),
  retained_updated_at timestamptz,
  created_at timestamptz not null default now(),
  check (status <> 'refused' or refusal_reason is not null),
  check (status not in ('pending', 'confirmed') or confirm_deadline is not null),
  check (status <> 'passage' or end_reason is not null)
);

-- Une seule déclaration active par restaurant : deux déclarations
-- simultanées butent ici, la seconde est écrite refusée (commercial_declare).
create unique index commercial_declarations_active_key
  on public.commercial_declarations (restaurant_id)
  where status in ('pending', 'confirmed');
create index commercial_declarations_commercial_idx
  on public.commercial_declarations (commercial_id, declared_at desc);
create index commercial_declarations_restaurant_idx
  on public.commercial_declarations (restaurant_id, declared_at desc);
create index commercial_declarations_pending_idx
  on public.commercial_declarations (confirm_deadline) where status = 'pending';
create index commercial_declarations_confirmed_idx
  on public.commercial_declarations (reserved_until) where status = 'confirmed';

alter table public.commercial_declarations enable row level security;
create policy "admin read" on public.commercial_declarations
  for select to authenticated using ((select public.is_admin()));
-- Pas de lecture directe pour le commercial : la ligne porte l'alerte « déjà
-- client ? », qui nomme un client d'Ominin, et le compte rattaché au lien. Il
-- lit ses déclarations par les fonctions commercial_*.

-- Invariants : un refus seulement depuis l'attente et avant l'échéance ;
-- aucun retour depuis la confirmation (elle crée le droit) ; les fins sont
-- définitives.
create function public.commercial_declarations_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = old.status then
    return new;
  end if;
  if old.status in ('signed', 'abandoned', 'expired', 'refused', 'passage') then
    raise exception 'Déclaration close (%) : son statut ne change plus.', old.status;
  end if;
  if new.status = 'refused' and (old.status <> 'pending' or now() >= old.confirm_deadline) then
    raise exception 'Refus impossible : la déclaration est confirmée ou son délai de confirmation est échu.';
  end if;
  if old.status = 'confirmed' and new.status = 'pending' then
    raise exception 'Une déclaration confirmée ne revient pas en attente.';
  end if;
  if old.status = 'pending' and new.status in ('signed', 'expired') then
    raise exception 'Une déclaration en attente se confirme avant de se signer ou d''expirer.';
  end if;
  return new;
end;
$$;

create trigger commercial_declarations_guard
  before update of status on public.commercial_declarations
  for each row execute function public.commercial_declarations_guard();

create function public.commercial_declarations_insert_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status not in ('pending', 'refused', 'passage') then
    raise exception 'Une déclaration naît en attente, refusée, ou en passage sans suite.';
  end if;
  return new;
end;
$$;

create trigger commercial_declarations_insert_guard
  before insert on public.commercial_declarations
  for each row execute function public.commercial_declarations_insert_guard();

-- ---------------------------------------------------------------------------
-- Statut effectif. Une déclaration en attente dont le délai est échu est
-- confirmée de droit ; une réservation dont la fenêtre est passée est
-- expirée — toute lecture le voit ainsi, sans attendre la tâche quotidienne
-- qui l'écrit.
create function public.commercial_status_at(
  d public.commercial_declarations,
  p_at timestamptz default now()
)
returns public.commercial_declaration_status
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when d.status = 'pending' and p_at >= d.confirm_deadline then
      case when p_at >= d.confirm_deadline
             + make_interval(months => (public.commercial_cfg()).sign_window_months)
           then 'expired'::public.commercial_declaration_status
           else 'confirmed'::public.commercial_declaration_status end
    when d.status = 'confirmed' and p_at >= d.reserved_until then 'expired'
    else d.status
  end;
$$;

create function public.commercial_reserved_until(d public.commercial_declarations)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(d.reserved_until,
    case when d.status = 'pending' then d.confirm_deadline
      + make_interval(months => (public.commercial_cfg()).sign_window_months) end);
$$;

revoke execute on function public.commercial_status_at(public.commercial_declarations, timestamptz) from public, anon;
revoke execute on function public.commercial_reserved_until(public.commercial_declarations) from public, anon;
grant execute on function public.commercial_status_at(public.commercial_declarations, timestamptz) to authenticated;
grant execute on function public.commercial_reserved_until(public.commercial_declarations) to authenticated;

-- ---------------------------------------------------------------------------
-- Interlocuteur réduit à sa fonction : le prénom devient facultatif.
alter table public.crm_contacts alter column first_name drop not null;
alter table public.crm_contacts drop constraint crm_contacts_first_name_check;
alter table public.crm_contacts
  add constraint crm_contacts_first_name_check
    check (first_name is null or length(trim(first_name)) between 1 and 120),
  add constraint crm_contacts_identified check (first_name is not null or role is not null);

-- Journal, relances et rendez-vous d'une déclaration : visibles de son seul
-- titulaire (par les fonctions de l'espace) et des admins.
alter table public.crm_activities
  add column declaration_id uuid references public.commercial_declarations (id);
alter table public.crm_tasks
  add column declaration_id uuid references public.commercial_declarations (id);
alter table public.crm_appointments
  add column declaration_id uuid references public.commercial_declarations (id);
create index crm_activities_declaration_idx
  on public.crm_activities (declaration_id, created_at desc) where declaration_id is not null;
create index crm_tasks_declaration_idx
  on public.crm_tasks (declaration_id) where declaration_id is not null;
create index crm_appointments_declaration_idx
  on public.crm_appointments (declaration_id, start_at) where declaration_id is not null;

alter table public.projet_clients
  add column declaration_id uuid references public.commercial_declarations (id);

-- Étapes vues par le commercial : quand elles sont remplies, ces colonnes
-- remplacent le texte des fondateurs.
alter table public.projet_step_templates
  add column commercial_title text,
  add column commercial_detail text;

update public.projet_step_templates
set commercial_title = 'Démo montrée sur sa carte ou une démo proche',
    commercial_detail = case when shop
      then 'Lui montrer sur téléphone une boutique de démo à ses produits (demandée depuis le Kit) ou la démo la plus proche de ce qu''elle vend. Fini quand elle a vu la démo.'
      else 'Lui montrer sur téléphone une démo à sa carte (demandée depuis le Kit) ou la démo la plus proche de son restaurant. Fini quand il a vu la démo.' end
where position = 2;

update public.projet_step_templates
set commercial_title = 'Le restaurant a choisi une offre publiée et veut s''inscrire',
    commercial_detail = 'Il a choisi une des offres publiées par Ominin, à ses prix, et veut s''inscrire : envoyez-lui le lien d''inscription. Vous ne négociez rien ; la date de mise en service se fixe avec Ominin. Fini quand il est prêt à s''inscrire.'
where position = 5;

-- ---------------------------------------------------------------------------
-- E-mails exigés par le contrat : la file d'envoi et la preuve. Chaque
-- événement y écrit sa ligne dans sa propre transaction ; la route qui vient
-- d'agir, puis en filet la tâche quotidienne, envoient les lignes sans
-- sent_at. sent_at est posé avant l'appel à Gmail (au plus un envoi) :
-- sent_at sans gmail_message_id signale un envoi interrompu, à vérifier.
create table public.commercial_emails (
  id uuid primary key default gen_random_uuid(),
  commercial_id uuid not null references public.commerciaux (id),
  declaration_id uuid references public.commercial_declarations (id),
  kind text not null check (kind in (
    'confirmed', 'refused', 'signed', 'opposition', 'lea_reply',
    'released', 'statement', 'detail', 'demo_ready', 'urssaf')),
  -- Précision propre à la sorte (classification d'une réponse à Léa…).
  detail text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  gmail_message_id text,
  last_error text
);
create index commercial_emails_unsent_idx
  on public.commercial_emails (created_at) where sent_at is null;
create index commercial_emails_declaration_idx
  on public.commercial_emails (declaration_id);

alter table public.commercial_emails enable row level security;
create policy "admin read" on public.commercial_emails
  for select to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Le reflet dans crm_leads. Les écrans Restaurants et Carte de l'admin lisent
-- crm_leads.status : le travail des commerciaux s'y reflète, écrit par les
-- seules fonctions de l'espace, qui posent le drapeau de transaction
-- ominin.crm_reflect. Toute autre écriture du statut d'un restaurant déclaré
-- (Léa, l'écran admin) est sans effet.

create function public.crm_leads_reflect_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.status is distinct from old.status or new.lost_reason is distinct from old.lost_reason)
     and coalesce(current_setting('ominin.crm_reflect', true), '') <> 'on'
     and exists (
       select 1 from public.commercial_declarations d
       where d.restaurant_id = new.restaurant_id and d.status in ('pending', 'confirmed')
     ) then
    new.status := old.status;
    new.lost_reason := old.lost_reason;
  end if;
  return new;
end;
$$;

create trigger crm_leads_reflect_guard
  before update on public.crm_leads
  for each row execute function public.crm_leads_reflect_guard();

-- Le journal automatique marque les changements écrits par le reflet : la
-- règle « un fondateur le travaille » ne les compte pas.
create or replace function public.crm_log_status_change()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.crm_activities
      (restaurant_id, lead_id, type, metadata, created_by)
    values
      (new.restaurant_id, new.id, 'status_change',
       jsonb_build_object('from', old.status, 'to', new.status)
         || case when coalesce(current_setting('ominin.crm_reflect', true), '') = 'on'
              then jsonb_build_object('reflect', true) else '{}'::jsonb end,
       auth.uid());
  end if;
  return new;
end;
$$;

-- Étape la plus haute cochée (0 : aucune).
create function public.commercial_top_step(p_steps jsonb)
returns int
language sql
immutable
set search_path = ''
as $$
  select coalesce(max(key::int), 0) from jsonb_object_keys(p_steps) as key;
$$;

-- Écrit le reflet d'une déclaration (tableau 4.3 du cahier). Seule voie
-- d'écriture du statut d'un restaurant déclaré : appelée par les fonctions
-- de l'espace, de l'admin et de la tâche quotidienne.
create function public.commercial_reflect(p_declaration uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.commercial_declarations;
  v_status public.crm_lead_status;
  v_lost text;
begin
  select * into d from public.commercial_declarations where id = p_declaration;
  case public.commercial_status_at(d)
    when 'pending' then return;
    when 'refused' then return;
    when 'signed' then v_status := 'signed';
    when 'passage' then v_status := 'not_interested';
    when 'confirmed' then
      v_status := case public.commercial_top_step(d.step_done_at)
        when 3 then 'contacted'
        when 4 then 'visited'
        when 5 then 'negotiation'
        else 'to_contact' end;
    else
      v_status := 'lost';
      v_lost := coalesce(d.end_reason::text, 'expired');
  end case;

  perform set_config('ominin.crm_reflect', 'on', true);
  update public.crm_leads
  set status = v_status,
      lost_reason = case when v_status = 'lost' then v_lost else lost_reason end
  where restaurant_id = d.restaurant_id;
  perform set_config('ominin.crm_reflect', 'off', true);
end;
$$;
revoke execute on function public.commercial_reflect(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Opposition du restaurant, par n'importe quel canal (/api/desinscription,
-- réponse « désinscription » à Léa, bouton du commercial) : la déclaration
-- active est abandonnée (motif opposition) et son titulaire prévenu, pour
-- qu'il arrête de démarcher (RGPD art. 21, contrat art. 6.1).
create function public.commercial_on_opt_out()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.commercial_declarations;
begin
  for d in
    select * from public.commercial_declarations
    where restaurant_id = new.id and status in ('pending', 'confirmed')
  loop
    update public.commercial_declarations
    set status = 'abandoned', end_reason = 'opposition', ended_at = now()
    where id = d.id;
    perform public.commercial_reflect(d.id);
    insert into public.commercial_emails (commercial_id, declaration_id, kind)
    values (d.commercial_id, d.id, 'opposition');
  end loop;
  return new;
end;
$$;

create trigger crm_restaurants_opt_out
  after update of outreach_opted_out_at on public.crm_restaurants
  for each row
  when (old.outreach_opted_out_at is null and new.outreach_opted_out_at is not null)
  execute function public.commercial_on_opt_out();

-- Réponse tardive d'un restaurant réservé à un ancien e-mail de Léa : l'admin
-- la traite ; le titulaire apprend seulement que le restaurant a répondu, et
-- dans quel sens — jamais le contenu.
create function public.commercial_on_lea_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.commercial_emails (commercial_id, declaration_id, kind, detail)
  select d.commercial_id, d.id, 'lea_reply', new.classification::text
  from public.commercial_declarations d
  where d.restaurant_id = new.restaurant_id and d.status in ('pending', 'confirmed');
  return new;
end;
$$;

create trigger outreach_emails_commercial_reply
  after insert or update of classification on public.outreach_emails
  for each row
  when (new.direction = 'inbound' and new.classification is not null
        and new.classification not in ('bounce', 'other'))
  execute function public.commercial_on_lea_reply();

-- Léa (service_role) demande si un restaurant est réservé avant de le
-- sélectionner, de lui écrire ou de préparer une réponse.
create function public.crm_is_reserved(p_restaurant uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.commercial_declarations
    where restaurant_id = p_restaurant and status in ('pending', 'confirmed')
  );
$$;
revoke execute on function public.crm_is_reserved(uuid) from public, anon, authenticated;
grant execute on function public.crm_is_reserved(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Compteur du jour des recherches (et, au lot 2, des recherches Google) :
-- une ligne par commercial et par jour, jamais lisible par l'admin (aucune
-- policy) — l'article 2.3 interdit tout suivi d'assiduité.
create table public.commercial_quota_usage (
  commercial_id uuid not null references public.commerciaux (id) on delete cascade,
  day date not null,
  searches int not null default 0,
  places int not null default 0,
  primary key (commercial_id, day)
);
alter table public.commercial_quota_usage enable row level security;

-- Pièces du commercial (accord de réattribution, factures, SIRENE, URSSAF) :
-- bucket privé, lu par son titulaire et par les admins.
insert into storage.buckets (id, name, public)
values ('commercial-docs', 'commercial-docs', false);

create policy "commercial-docs admin" on storage.objects
  for all to authenticated
  using (bucket_id = 'commercial-docs' and (select public.is_admin()))
  with check (bucket_id = 'commercial-docs' and (select public.is_admin()));
create policy "commercial-docs self read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'commercial-docs'
    and (storage.foldername(name))[1] in (
      select id::text from public.commerciaux where user_id = (select auth.uid())
    )
  );
-- Le deck du Kit (kit/), déposé par l'admin : lu par le commercial dont le
-- contrat est signé et court (avant la signature, rien ; après la fin :
-- argent, relevés et contrat seulement).
create policy "commercial-docs kit read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'commercial-docs' and (storage.foldername(name))[1] = 'kit'
    and exists (
      select 1 from public.commerciaux c
      join public.legal_acceptances a on a.commercial_id = c.id and a.scope = 'commercial'
      where c.user_id = (select auth.uid()) and (c.ended_at is null or c.ended_at > now())
    )
  );
create policy "commercial-docs self upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'commercial-docs'
    and (storage.foldername(name))[1] in (
      select id::text from public.commerciaux where user_id = (select auth.uid())
    )
  );
-- Aucune réécriture : chaque dépôt a son propre nom (horodaté), une facture
-- ou une attestation reçue ne se remplace pas.
