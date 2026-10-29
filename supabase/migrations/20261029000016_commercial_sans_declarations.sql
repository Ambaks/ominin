-- L'ancien espace commercial disparaît : déclarations (confirmation de droit,
-- réservation, fenêtre de signature, abandon, passage, fiche retenue,
-- rendez-vous, relances, interlocuteurs), lien d'inscription envoyé au
-- gérant, démos demandées, quotas de recherche, « en discussion », reflet
-- dans crm_leads et garde de Léa. Un Client Apporté ne naît plus que d'une
-- inscription faite pendant la visite (commercial_signups).
--
-- Restent le contrat, ses pièces, la commission, les relevés et leurs
-- e-mails, la fin de client, la carte, les visites, les inscriptions et les
-- demandes de visite.

do $$
begin
  if exists (select 1 from public.commercial_clients where signup_id is null) then
    raise exception 'Des Clients Apportés sont nés d''une déclaration : à reprendre avant de supprimer les déclarations.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Déclencheurs

drop trigger commercial_declarations_guard on public.commercial_declarations;
drop trigger commercial_declarations_insert_guard on public.commercial_declarations;
drop trigger crm_leads_reflect_guard on public.crm_leads;
drop trigger crm_restaurants_opt_out on public.crm_restaurants;
drop trigger outreach_emails_commercial_reply on public.outreach_emails;
drop trigger crm_appointments_followups on public.crm_appointments;
drop trigger legal_acceptances_commercial_signup on public.legal_acceptances;
drop trigger commercial_clients_from_declaration on public.commercial_clients;
drop trigger commercial_settings_normalize on public.commercial_settings;

drop function public.commercial_declarations_guard();
drop function public.commercial_declarations_insert_guard();
drop function public.crm_leads_reflect_guard();
drop function public.commercial_on_opt_out();
drop function public.commercial_on_lea_reply();
drop function public.commercial_drop_followups();
drop function public.commercial_on_client_acceptance();
drop function public.commercial_clients_from_declaration();
drop function public.commercial_settings_normalize();

-- Le journal automatique ne marque plus d'écriture du reflet.
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
       jsonb_build_object('from', old.status, 'to', new.status), auth.uid());
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Fonctions

drop function public.commercial_today(timestamptz);
drop function public.commercial_today_base(timestamptz);
drop function public.commercial_my_restaurants();
drop function public.commercial_my_clients();
drop function public.commercial_restaurant(uuid);
drop function public.commercial_search(text);
drop function public.commercial_find_duplicates(text, text, text, text, double precision, double precision, text, text);
drop function public.commercial_nearby(double precision, double precision);
drop function public.commercial_count_places();
drop function public.commercial_count_search(uuid);
drop function public.commercial_search_limit();
drop function public.commercial_declare(uuid, public.ominin_product[], jsonb);
drop function public.commercial_passage(uuid, jsonb, public.commercial_end_reason);
drop function public.commercial_abandon(uuid, public.commercial_end_reason);
drop function public.commercial_set_step(uuid, int, boolean);
drop function public.commercial_save_retained(uuid, jsonb);
drop function public.commercial_opt_out(uuid);
drop function public.commercial_log(uuid, public.crm_activity_type, text);
drop function public.commercial_contact_upsert(uuid, jsonb);
drop function public.commercial_task_upsert(uuid, jsonb);
drop function public.commercial_appointment_upsert(uuid, jsonb);
drop function public.commercial_appointment(uuid);
drop function public.commercial_appointment_followups();
drop function public.commercial_morning();
drop function public.commercial_request_demo(uuid, text, text[]);
drop function public.commercial_demo_requests_of(uuid);
drop function public.commercial_signup_link(uuid);
drop function public.signup_link_info(text);
drop function public.signup_link_claim(text, public.ominin_product);
drop function public.commercial_by_token(text);
drop function public.commercial_confirm_due();
drop function public.commercial_expire_due();
drop function public.commercial_settle(uuid);
drop function public.commercial_confirm_due_for(uuid);
drop function public.commercial_expire_due_for(uuid);
drop function public.commercial_close_for_opposition(uuid);
drop function public.commercial_close_for_client(uuid, text);
drop function public.commercial_reflect(uuid);
drop function public.commercial_top_step(jsonb);
drop function public.commercial_my_active(uuid);
drop function public.commercial_clean_retained(jsonb);
drop function public.commercial_clean_contact(jsonb);
drop function public.commercial_public(public.crm_restaurants);
drop function public.commercial_state(public.crm_restaurants, uuid);
drop function public.commercial_refusal(public.crm_restaurants, uuid, uuid);
drop function public.commercial_in_talks(public.crm_restaurants);
drop function public.commercial_add_client(public.commercial_declarations, uuid, uuid, boolean);
drop function public.commercial_signup_alert(public.commercial_declarations, uuid, uuid);
drop function public.commercial_in_service(timestamptz, uuid, uuid, uuid);
drop function public.commercial_departed_before(timestamptz, uuid, uuid);
drop function public.commercial_first_acceptance(timestamptz, uuid, uuid);
drop function public.commercial_status_at(public.commercial_declarations, timestamptz);
drop function public.commercial_reserved_until(public.commercial_declarations);
drop function public.crm_is_reserved(uuid);
drop function public.admin_decide_declaration(uuid, text, text);
drop function public.admin_record_email_declaration(uuid, uuid, timestamptz, public.ominin_product[], jsonb);
drop function public.admin_reassign_declaration(uuid, uuid, text, text);
drop function public.admin_mark_signed(uuid, uuid, uuid);
drop function public.admin_add_client(uuid, uuid, uuid);
drop function public.admin_validate_client(uuid);
drop function public.admin_signup_matches();
drop function public.admin_deliver_demo(uuid, text);
drop function public.admin_merge_restaurants(uuid, uuid, text);
drop function public.admin_set_in_talks(uuid, boolean);
drop function public.admin_declarations();
drop function public.admin_restaurant_declarations(uuid);

-- Le commercial connecté, s'il a le droit demandé :
--   'money' : a signé au moins une version (même après la fin du contrat :
--             Argent, relevés et contrat restent ouverts) ;
--   'work'  : en plus, contrat non terminé.
create or replace function public.commercial_me(p_need text)
returns public.commerciaux
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c public.commerciaux;
begin
  select * into c from public.commerciaux where user_id = auth.uid();
  if c.id is null or not exists (
    select 1 from public.legal_acceptances
    where commercial_id = c.id and scope = 'commercial'
  ) then
    raise exception 'Réservé aux commerciaux d''Ominin sous contrat.' using errcode = '42501';
  end if;
  if p_need = 'work' and public.commercial_contract_end(c) <= now() then
    raise exception 'Votre contrat est terminé : seuls l''argent, les relevés et le contrat restent accessibles.'
      using errcode = '42501';
  end if;
  return c;
end;
$$;

-- Contrats terminés : la date posée par l'admin, ou le terme atteint sans
-- option. Plus de notification sur leurs appareils ; leurs restaurants sont
-- rendus libres par commercial_release_holds.
create or replace function public.commercial_release_ended()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  update public.commerciaux c
  set ended_at = public.commercial_contract_end(c), end_reason = 'term'
  where c.ended_at is null and public.commercial_contract_end(c) <= now();
  get diagnostics v_count = row_count;
  delete from public.commercial_push_subscriptions s
  using public.commerciaux cc
  where cc.id = s.commercial_id and cc.ended_at <= now();
  return v_count;
end;
$$;

-- Ce que l'espace affiche du compte : identité, contrat, fin, et les démos
-- de la page Ressources. Ouverte à tout compte invité, signé ou non :
-- l'écran de signature s'en sert aussi.
create or replace function public.commercial_account()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c public.commerciaux;
  v_end timestamptz;
begin
  select * into c from public.commerciaux where user_id = auth.uid();
  if c.id is null then
    return null;
  end if;
  v_end := public.commercial_contract_end(c);
  return jsonb_build_object(
    'id', c.id, 'email', c.email, 'first_name', c.first_name, 'last_name', c.last_name,
    'siret', c.siret, 'address', c.address, 'phone', c.phone,
    'signed', exists (select 1 from public.legal_acceptances a where a.commercial_id = c.id and a.scope = 'commercial'),
    'signed_in_force', exists (select 1 from public.legal_acceptances a
                               where a.commercial_id = c.id and a.scope = 'commercial'
                                 and a.version_id = public.commercial_version_in_force()),
    'contract_end', v_end,
    'ended', v_end <= now(),
    'notice_given_at', c.notice_given_at,
    'option_exercised_at', c.option_exercised_at,
    'kit_demo_slugs', to_jsonb((public.commercial_cfg()).kit_demo_slugs));
end;
$$;

-- Relie une fiche à un établissement ou à une boutique (un seul des deux).
-- Sans fiche (p_restaurant null), en crée une à partir du client : chaque
-- client en service doit avoir la sienne pour être reconnu.
create or replace function public.admin_link_client(
  p_restaurant uuid,
  p_etablissement uuid default null,
  p_shop uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := p_restaurant;
  v_name text;
  v_address text;
  v_phone text;
begin
  if not public.is_admin() then
    raise exception 'Réservé à l''admin.' using errcode = '42501';
  end if;
  if num_nonnulls(p_etablissement, p_shop) <> 1 then
    raise exception 'Choisir un établissement ou une boutique.';
  end if;

  if p_etablissement is not null then
    select name, address, phone into v_name, v_address, v_phone
    from public.etablissements where id = p_etablissement;
  else
    select name, null, contact_phone into v_name, v_address, v_phone
    from public.shops where id = p_shop;
  end if;
  if v_name is null then
    raise exception 'Client introuvable.';
  end if;

  perform public.crm_assert_client_free(v_id, p_etablissement, p_shop);
  if v_id is null then
    v_id := gen_random_uuid();
    insert into public.crm_restaurants (id, name, slug, address, phone, source)
    values (v_id, v_name, public.crm_restaurant_slug(v_name, v_id), v_address, v_phone, 'client');
  end if;

  update public.crm_restaurants
  set etablissement_id = p_etablissement,
      shop_id = p_shop,
      client_ended_at = null
  where id = v_id and deleted_at is null;
  if not found then
    raise exception 'Fiche introuvable.';
  end if;
  return v_id;
end;
$$;

-- Départ du client (date choisie par l'admin), ou retour (null).
create or replace function public.admin_set_client_ended(p_restaurant uuid, p_ended_at timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé à l''admin.' using errcode = '42501';
  end if;
  update public.crm_restaurants
  set client_ended_at = p_ended_at
  where id = p_restaurant
    and (etablissement_id is not null or shop_id is not null);
  if not found then
    raise exception 'Cette fiche n''est reliée à aucun client.';
  end if;
end;
$$;

-- Départ posé par erreur : la fiche redevient cliente et le Client Apporté
-- qu'il avait clos est rouvert, comme si de rien n'était ; la régularisation
-- automatique rend au commercial ce que les relevés avaient retranché.
create or replace function public.admin_cancel_client_departure(p_restaurant uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.crm_restaurants;
begin
  perform public.admin_require();
  select * into r from public.crm_restaurants where id = p_restaurant and deleted_at is null for update;
  if r.client_ended_at is null then
    raise exception 'Aucun départ posé sur cette fiche.';
  end if;
  if exists (
    select 1 from public.commercial_clients c
    where c.ended_at is null
      and ((r.etablissement_id is not null and c.etablissement_id = r.etablissement_id)
           or (r.shop_id is not null and c.shop_id = r.shop_id))
  ) then
    raise exception 'Ce client est revenu par un autre commercial : le départ ne s''annule plus.';
  end if;
  update public.commercial_clients
  set ended_at = null
  where ended_at = r.client_ended_at
    and ((r.etablissement_id is not null and etablissement_id = r.etablissement_id)
         or (r.shop_id is not null and shop_id = r.shop_id));
  update public.crm_restaurants set client_ended_at = null where id = r.id;
end;
$$;

-- Ajout d'un restaurant depuis la carte.
create or replace function public.commercial_create_restaurant(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.commerciaux := public.commercial_me('work');
  v_id uuid := gen_random_uuid();
  v_name text := btrim(p ->> 'name');
begin
  if v_name is null or v_name = '' then
    raise exception 'Le nom du restaurant est obligatoire.';
  end if;
  insert into public.crm_restaurants (
    id, name, slug, category, cuisine, address, city, postal_code, phone, website,
    latitude, longitude, source)
  values (
    v_id, v_name, public.crm_restaurant_slug(v_name, v_id),
    coalesce((p ->> 'category')::public.crm_restaurant_category, 'restaurant'),
    nullif(btrim(p ->> 'cuisine'), ''), nullif(btrim(p ->> 'address'), ''),
    nullif(btrim(p ->> 'city'), ''), nullif(btrim(p ->> 'postal_code'), ''),
    nullif(btrim(p ->> 'phone'), ''), nullif(btrim(p ->> 'website'), ''),
    (p ->> 'latitude')::double precision, (p ->> 'longitude')::double precision,
    'commercial');
  return v_id;
end;
$$;

-- Préférences de notification : seul le relevé disponible notifie encore.
update public.commerciaux
set push_prefs = push_prefs - array['relance', 'demo', 'inscription', 'expiration', 'opposition'];

create or replace function public.commercial_set_push_prefs(p_prefs jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.commerciaux := public.commercial_me('money');
begin
  if jsonb_typeof(p_prefs) <> 'object' or exists (
    select 1 from jsonb_each(p_prefs) e
    where e.key <> 'releve' or jsonb_typeof(e.value) <> 'boolean'
  ) then
    raise exception 'Préférences invalides.';
  end if;
  update public.commerciaux set push_prefs = p_prefs where id = me.id;
end;
$$;

-- Projet : le client créé à l'inscription garde sa fiche.
drop function public.projet_add_client(text, public.ominin_product, uuid, uuid, uuid, uuid);
create function public.projet_add_client(
  p_name text,
  p_product public.ominin_product,
  p_etablissement uuid default null,
  p_shop uuid default null,
  p_restaurant uuid default null
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into projet_clients (name, product, etablissement_id, shop_id, restaurant_id)
  values (p_name, p_product, p_etablissement, p_shop, p_restaurant)
  returning id into v_id;

  insert into projet_steps (client_id, phase, position, title, detail)
  select v_id, t.phase, t.position, t.title, t.detail
  from projet_step_templates t
  where t.shop = (p_product = 'shop');

  return v_id;
end;
$$;
revoke execute on function public.projet_add_client(text, public.ominin_product, uuid, uuid, uuid)
  from public, anon;
grant execute on function public.projet_add_client(text, public.ominin_product, uuid, uuid, uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Colonnes, tables et types

alter table public.commercial_clients
  drop column declaration_id,
  alter column signup_id set not null;

delete from public.commercial_emails where kind not in ('statement', 'detail', 'urssaf');
alter table public.commercial_emails
  drop column declaration_id,
  drop column detail,
  drop constraint commercial_emails_kind_check,
  add constraint commercial_emails_kind_check check (kind in ('statement', 'detail', 'urssaf'));

alter table public.crm_activities drop column declaration_id;
alter table public.crm_tasks
  drop column declaration_id,
  drop column followup_of,
  drop column followup_day;
alter table public.crm_appointments drop column declaration_id;
alter table public.crm_contacts drop column created_by;
alter table public.crm_restaurants
  drop column in_talks_override,
  drop column merged_into;
alter table public.projet_clients drop column declaration_id;
alter table public.projet_step_templates
  drop column commercial_title,
  drop column commercial_detail;

alter table public.commercial_settings
  drop column confirm_days,
  drop column sign_window_months,
  drop column declaration_cap,
  drop column cooldown_days,
  drop column in_talks_days,
  drop column search_max_results,
  drop column search_daily_quota,
  drop column places_daily_quota,
  drop column retained_note_max_chars,
  drop column expiry_warning_days,
  drop column signup_link_days,
  drop column followup_days,
  drop column nearby_radius_m,
  drop column name_similarity;

drop table public.commercial_demo_requests;
drop table public.commercial_quota_usage;
drop table public.commercial_declarations;

drop type public.commercial_declaration_status;
drop type public.commercial_refusal_reason;
drop type public.commercial_end_reason;
