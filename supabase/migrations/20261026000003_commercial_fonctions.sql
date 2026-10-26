-- Espace commercial, lot 1 : les fonctions. Un commercial ne lit aucune table
-- crm_* en direct ; tout passe par ces fonctions security definer, qui
-- vérifient d'abord qu'il est actif, puis ne servent que ce que le tableau
-- 4.5 du cahier lui ouvre. Les écritures du reflet dans crm_leads passent par
-- commercial_reflect (drapeau ominin.crm_reflect).

-- ---------------------------------------------------------------------------
-- Accès

-- Fin du contrat : celle posée par l'admin, sinon le terme (durée ferme, ou
-- durée totale si l'option est levée) compté depuis la première signature.
create function public.commercial_contract_end(c public.commerciaux)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(c.ended_at,
    (select min(a.accepted_at) from public.legal_acceptances a
     where a.commercial_id = c.id and a.scope = 'commercial')
    + make_interval(months => cfg.term_months)
    + case when c.option_exercised_at is not null
        then make_interval(years => cfg.option_years) else interval '0' end)
  from public.commercial_cfg() cfg;
$$;
revoke execute on function public.commercial_contract_end(public.commerciaux) from public, anon, authenticated;

-- Version du contrat en vigueur (la plus récente entrée en vigueur).
create function public.commercial_version_in_force()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.legal_versions
  where doc = 'commercial' and effective_from <= now()
  order by effective_from desc
  limit 1;
$$;
revoke execute on function public.commercial_version_in_force() from public, anon, authenticated;

-- Le commercial connecté, s'il a le droit demandé :
--   'money'   : a signé au moins une version (même après la fin du contrat :
--               Argent, relevés et contrat restent ouverts) ;
--   'work'    : en plus, contrat non terminé ;
--   'declare' : en plus, a signé la version en vigueur.
create function public.commercial_me(p_need text)
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
  if p_need in ('work', 'declare') and public.commercial_contract_end(c) <= now() then
    raise exception 'Votre contrat est terminé : seuls l''argent, les relevés et le contrat restent accessibles.'
      using errcode = '42501';
  end if;
  if p_need = 'declare' and not exists (
    select 1 from public.legal_acceptances
    where commercial_id = c.id and scope = 'commercial'
      and version_id = public.commercial_version_in_force()
  ) then
    raise exception 'Signez la nouvelle version du contrat pour déclarer de nouveaux restaurants.'
      using errcode = '42501';
  end if;
  return c;
end;
$$;
revoke execute on function public.commercial_me(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- États calculés d'un restaurant

-- Déjà client : fiche reliée à un client en service, ou même téléphone qu'un
-- établissement ou une boutique (hors démos et hors le client parti de cette
-- même fiche).
create function public.commercial_is_client(r public.crm_restaurants)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select ((r.etablissement_id is not null or r.shop_id is not null) and r.client_ended_at is null)
    or (r.phone_normalized is not null and (
      exists (
        select 1 from public.etablissements e
        where not e.demo and public.phone_digits(e.phone) = r.phone_normalized
          and e.id is distinct from r.etablissement_id
      )
      or exists (
        select 1 from public.shops s
        where not s.demo and public.phone_digits(s.contact_phone) = r.phone_normalized
          and s.id is distinct from r.shop_id
      )));
$$;

-- « En discussion avec Ominin » (section 4.3 et 13.2 n° 3).
create function public.commercial_in_talks(r public.crm_restaurants)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with cfg as (select * from public.commercial_cfg()),
  window_start as (
    select now() - make_interval(days => cfg.in_talks_days) as since from cfg
    where cfg.in_talks_days is not null
  ),
  founder as (
    select a.created_at,
           a.type = 'status_change' and a.metadata ->> 'to' in ('lost', 'not_interested') as closing
    from public.crm_activities a
    join public.admin_users u on u.user_id = a.created_by, window_start w
    where a.restaurant_id = r.id and a.created_at > w.since
      and not coalesce((a.metadata ->> 'reflect')::boolean, false)
    union all
    select ap.created_at, false
    from public.crm_appointments ap
    join public.admin_users u on u.user_id = ap.created_by, window_start w
    where ap.restaurant_id = r.id and ap.created_at > w.since
  )
  select coalesce(r.in_talks_override,
    exists (select 1 from public.projet_clients p where p.restaurant_id = r.id)
    or exists (
      select 1 from public.outreach_emails o, window_start w
      where o.restaurant_id = r.id and o.direction = 'inbound'
        and o.classification in ('interested', 'meeting_request', 'question')
        and coalesce(o.received_at, o.created_at) > w.since
    )
    or coalesce((select not closing from founder order by created_at desc limit 1), false));
$$;

-- Ce que tout commercial voit d'un restaurant : libre, réservé (étape la plus
-- haute, depuis quand — jamais par qui), client ou opposition ; et s'il est
-- en discussion avec Ominin. « mine » : la déclaration active est la sienne.
create function public.commercial_state(r public.crm_restaurants, p_commercial uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with active as (
    select d.*, public.commercial_status_at(d) as eff
    from public.commercial_declarations d
    where d.restaurant_id = r.id and d.status in ('pending', 'confirmed')
  ),
  live as (select * from active where eff in ('pending', 'confirmed'))
  select jsonb_build_object(
    'kind', case
      when public.commercial_is_client(r) then 'client'
      when r.outreach_opted_out_at is not null then 'opted_out'
      when exists (select 1 from live) then 'reserved'
      else 'free' end,
    'in_talks', public.commercial_in_talks(r),
    'mine', coalesce((select commercial_id = p_commercial from live), false),
    'pending', coalesce((select eff = 'pending' from live), false),
    'step', (select public.commercial_top_step(step_done_at) from live),
    'since', (select declared_at from live));
$$;

revoke execute on function public.commercial_is_client(public.crm_restaurants) from public, anon, authenticated;
revoke execute on function public.commercial_in_talks(public.crm_restaurants) from public, anon, authenticated;
revoke execute on function public.commercial_state(public.crm_restaurants, uuid) from public, anon, authenticated;

-- Refus d'office applicable à ce commercial sur ce restaurant, ou null.
-- « declared » ne voit que les déclarations des autres : redéclarer la
-- sienne est une erreur, pas un refus.
create function public.commercial_refusal(r public.crm_restaurants, p_commercial uuid)
returns public.commercial_refusal_reason
language sql
stable
security definer
set search_path = ''
as $$
  with cfg as (select * from public.commercial_cfg())
  select case
    when public.commercial_is_client(r) then 'client'::public.commercial_refusal_reason
    when exists (
      select 1 from public.commercial_declarations d
      where d.restaurant_id = r.id and d.status in ('pending', 'confirmed')
        and d.commercial_id <> p_commercial
    ) then 'declared'
    when public.commercial_in_talks(r) then 'in_talks'
    when r.outreach_opted_out_at is not null then 'opted_out'
    when cfg.declaration_cap is not null and (
      select count(*) from public.commercial_declarations d
      where d.commercial_id = p_commercial and d.status in ('pending', 'confirmed')
    ) >= cfg.declaration_cap then 'cap'
    when cfg.cooldown_days is not null and exists (
      select 1 from public.commercial_declarations d
      where d.commercial_id = p_commercial and d.restaurant_id = r.id
        and d.status in ('abandoned', 'expired')
        and d.ended_at > now() - make_interval(days => cfg.cooldown_days)
    ) then 'cooldown'
  end
  from cfg;
$$;
revoke execute on function public.commercial_refusal(public.crm_restaurants, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Échéances : confirmation de droit et expiration, pour un restaurant (avant
-- d'écrire dessus) ou pour tous (tâche quotidienne).

create function public.commercial_confirm_due_for(p_restaurant uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.commercial_declarations;
  v_count int := 0;
  v_window int := (public.commercial_cfg()).sign_window_months;
begin
  for d in
    select * from public.commercial_declarations
    where status = 'pending' and confirm_deadline <= now()
      and (p_restaurant is null or restaurant_id = p_restaurant)
    for update
  loop
    update public.commercial_declarations
    set status = 'confirmed',
        confirmed_at = d.confirm_deadline,
        confirmed_by = null,
        reserved_until = d.confirm_deadline + make_interval(months => v_window)
    where id = d.id;
    insert into public.commercial_emails (commercial_id, declaration_id, kind, detail)
    values (d.commercial_id, d.id, 'confirmed', 'tacit');
    perform public.commercial_reflect(d.id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create function public.commercial_expire_due_for(p_restaurant uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.commercial_declarations;
  v_count int := 0;
begin
  for d in
    select * from public.commercial_declarations
    where status = 'confirmed' and reserved_until <= now()
      and (p_restaurant is null or restaurant_id = p_restaurant)
    for update
  loop
    update public.commercial_declarations
    set status = 'expired', ended_at = d.reserved_until
    where id = d.id;
    perform public.commercial_reflect(d.id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create function public.commercial_settle(p_restaurant uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.commercial_confirm_due_for(p_restaurant);
  perform public.commercial_expire_due_for(p_restaurant);
end;
$$;

create function public.commercial_confirm_due()
returns int
language sql
security definer
set search_path = ''
as $$ select public.commercial_confirm_due_for(null); $$;

create function public.commercial_expire_due()
returns int
language sql
security definer
set search_path = ''
as $$ select public.commercial_expire_due_for(null); $$;

-- Contrats terminés : la date posée par l'admin, ou le terme atteint sans
-- option ; les réservations sont libérées (motif « fin de contrat »).
create function public.commercial_release_ended()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.commerciaux;
  d public.commercial_declarations;
  v_count int := 0;
begin
  for c in
    select * from public.commerciaux
    where ended_at is null and public.commercial_contract_end(commerciaux) <= now()
  loop
    update public.commerciaux
    set ended_at = public.commercial_contract_end(c), end_reason = 'term'
    where id = c.id;
  end loop;

  for d in
    select dd.* from public.commercial_declarations dd
    join public.commerciaux cc on cc.id = dd.commercial_id
    where dd.status in ('pending', 'confirmed') and cc.ended_at <= now()
    for update of dd
  loop
    update public.commercial_declarations
    set status = 'abandoned', end_reason = 'contract_ended', ended_at = now()
    where id = d.id;
    perform public.commercial_reflect(d.id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke execute on function public.commercial_confirm_due_for(uuid) from public, anon, authenticated;
revoke execute on function public.commercial_expire_due_for(uuid) from public, anon, authenticated;
revoke execute on function public.commercial_settle(uuid) from public, anon, authenticated;
revoke execute on function public.commercial_confirm_due() from public, anon, authenticated;
revoke execute on function public.commercial_expire_due() from public, anon, authenticated;
revoke execute on function public.commercial_release_ended() from public, anon, authenticated;
grant execute on function public.commercial_confirm_due() to service_role;
grant execute on function public.commercial_expire_due() to service_role;
grant execute on function public.commercial_release_ended() to service_role;

-- ---------------------------------------------------------------------------
-- Validation des saisies

-- Fiche retenue : champs fermés (visibles de tous dans l'historique) et une
-- précision libre courte (titulaire et admins seuls).
create function public.commercial_clean_retained(p jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_max int := (public.commercial_cfg()).retained_note_max_chars;
  v_key text;
begin
  if jsonb_typeof(p) <> 'object' then
    raise exception 'Fiche retenue invalide.';
  end if;
  for v_key in select jsonb_object_keys(p) loop
    if v_key not in ('till', 'tpe', 'competitor', 'competitor_name', 'tables',
                     'objections', 'interest', 'best_time', 'note') then
      raise exception 'Champ inconnu dans la fiche retenue : %.', v_key;
    end if;
  end loop;
  if (p ? 'till' and jsonb_typeof(p -> 'till') <> 'string')
     or (p ? 'tpe' and p ->> 'tpe' not in ('sumup', 'stripe', 'square', 'banque', 'autre', 'aucun'))
     or (p ? 'competitor' and jsonb_typeof(p -> 'competitor') <> 'boolean')
     or (p ? 'competitor_name' and jsonb_typeof(p -> 'competitor_name') <> 'string')
     or (p ? 'tables' and (jsonb_typeof(p -> 'tables') <> 'number' or (p ->> 'tables')::numeric < 0))
     or (p ? 'interest' and p ->> 'interest' not in ('froid', 'tiede', 'chaud'))
     or (p ? 'best_time' and p ->> 'best_time' not in ('matin', 'apres_midi_service', 'apres_midi', 'soir'))
     or (p ? 'note' and jsonb_typeof(p -> 'note') <> 'string')
     or (p ? 'objections' and (jsonb_typeof(p -> 'objections') <> 'array' or exists (
       select 1 from jsonb_array_elements_text(p -> 'objections') o
       where o not in ('prix', 'deja_equipe', 'contrat_ailleurs', 'pas_decideur',
                       'pas_le_temps', 'clientele_qr', 'service_salle', 'autre'))))
  then
    raise exception 'Fiche retenue : une valeur n''est pas dans la liste.';
  end if;
  if v_max is not null and length(p ->> 'note') > v_max then
    raise exception 'La précision dépasse % caractères.', v_max;
  end if;
  return jsonb_strip_nulls(p);
end;
$$;

-- Interlocuteur : sa fonction au moins (article 4.3), son nom s'il est connu.
-- Le champ notes n'est jamais écrit depuis l'espace.
create function public.commercial_clean_contact(p jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v jsonb := jsonb_build_object(
    'role', nullif(btrim(p ->> 'role'), ''),
    'first_name', nullif(btrim(p ->> 'first_name'), ''),
    'last_name', nullif(btrim(p ->> 'last_name'), ''),
    'phone', nullif(btrim(p ->> 'phone'), ''),
    'email', lower(nullif(btrim(p ->> 'email'), '')),
    'is_decision_maker', coalesce((p ->> 'is_decision_maker')::boolean, false));
begin
  if v ->> 'role' is null or v ->> 'role' not in ('Gérant', 'Associé', 'Responsable de salle', 'Autre') then
    raise exception 'Indiquez la fonction de l''interlocuteur.';
  end if;
  return v;
end;
$$;

revoke execute on function public.commercial_clean_retained(jsonb) from public, anon, authenticated;
revoke execute on function public.commercial_clean_contact(jsonb) from public, anon, authenticated;

-- Déclaration active du commercial connecté, verrouillée, ou erreur.
create function public.commercial_my_active(p_declaration uuid)
returns public.commercial_declarations
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.commerciaux := public.commercial_me('work');
  d public.commercial_declarations;
begin
  select * into d from public.commercial_declarations
  where id = p_declaration and commercial_id = me.id
  for update;
  if d.id is null then
    raise exception 'Déclaration introuvable.' using errcode = 'P0002';
  end if;
  if public.commercial_status_at(d) not in ('pending', 'confirmed') then
    raise exception 'Cette déclaration n''est plus active.';
  end if;
  return d;
end;
$$;
revoke execute on function public.commercial_my_active(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Lecture (commercial)

create function public.commercial_public(r public.crm_restaurants)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', r.id, 'name', r.name, 'category', r.category, 'cuisine', r.cuisine,
    'address', r.address, 'city', r.city, 'postal_code', r.postal_code,
    'latitude', r.latitude, 'longitude', r.longitude, 'phone', r.phone,
    'website', r.website, 'menu_url', r.menu_url,
    'google_maps_url', r.google_maps_url, 'instagram_url', r.instagram_url);
$$;
revoke execute on function public.commercial_public(public.crm_restaurants) from public, anon, authenticated;

-- Compteur du jour (Paris) ; erreur au-delà du quota réglé.
create function public.commercial_count_search(p_commercial uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quota int := (public.commercial_cfg()).search_daily_quota;
  v_used int;
begin
  insert into public.commercial_quota_usage (commercial_id, day, searches)
  values (p_commercial, (now() at time zone 'Europe/Paris')::date, 1)
  on conflict (commercial_id, day) do update
    set searches = public.commercial_quota_usage.searches + 1
  returning searches into v_used;
  if v_quota is not null and v_used > v_quota then
    raise exception 'Vous avez atteint le nombre de recherches du jour. Réessayez demain.';
  end if;
end;
$$;
revoke execute on function public.commercial_count_search(uuid) from public, anon, authenticated;

create function public.commercial_search_limit()
returns int
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v int := (public.commercial_cfg()).search_max_results;
begin
  if v is null then
    raise exception 'La recherche n''est pas encore ouverte : Ominin doit régler le nombre de résultats.';
  end if;
  return v;
end;
$$;
revoke execute on function public.commercial_search_limit() from public, anon, authenticated;

-- Recherche par nom, rue ou téléphone.
create function public.commercial_search(p_query text)
returns table (
  id uuid, name text, address text, city text,
  category public.crm_restaurant_category, state jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.commerciaux := public.commercial_me('work');
  v_limit int := public.commercial_search_limit();
  v_q text := btrim(coalesce(p_query, ''));
  v_like text;
  v_digits text := public.phone_digits(p_query);
begin
  if v_q = '' then
    return;
  end if;
  perform public.commercial_count_search(me.id);
  v_like := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  return query
    select r.id, r.name, r.address, r.city, r.category, public.commercial_state(r, me.id)
    from public.crm_restaurants r
    where r.deleted_at is null and (
      r.name ilike v_like or r.address ilike v_like
      or (v_q !~ '[[:alpha:]]' and v_digits is not null and r.phone_normalized like '%' || v_digits || '%'))
    order by extensions.similarity(lower(r.name), lower(v_q)) desc, r.name, r.id
    limit v_limit;
end;
$$;

-- Doublons probables avant une création à la main (4.1) : même identifiant
-- externe, même téléphone, même e-mail, nom proche dans la même ville ou à
-- quelques pas. Compte comme une recherche.
create function public.commercial_find_duplicates(
  p_name text,
  p_city text default null,
  p_phone text default null,
  p_email text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_source text default null,
  p_external_id text default null
)
returns table (
  id uuid, name text, address text, city text, reason text, state jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.commerciaux := public.commercial_me('work');
  v_limit int := public.commercial_search_limit();
begin
  perform public.commercial_count_search(me.id);
  return query
    with found as (
      select r.id as rid, 'external_id'::text as why
      from public.crm_restaurants r
      where p_external_id is not null and r.source = p_source and r.external_id = p_external_id
        and r.deleted_at is null
      union all
      select f.restaurant_id, f.reason
      from public.crm_find_duplicates(p_name, p_city, p_phone, p_email, p_lat, p_lng) f
    )
    select distinct on (r.id) r.id, r.name, r.address, r.city, found.why,
           public.commercial_state(r, me.id)
    from found join public.crm_restaurants r on r.id = found.rid
    order by r.id
    limit v_limit;
end;
$$;

-- Fiche d'un restaurant (tableau 4.5).
create function public.commercial_restaurant(p_restaurant uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.commerciaux := public.commercial_me('work');
  r public.crm_restaurants;
  mine public.commercial_declarations;
  v_shop boolean;
begin
  select * into r from public.crm_restaurants where id = p_restaurant and deleted_at is null;
  if r.id is null then
    raise exception 'Restaurant introuvable.' using errcode = 'P0002';
  end if;
  select * into mine from public.commercial_declarations d
  where d.restaurant_id = r.id and d.commercial_id = me.id
    and d.status in ('pending', 'confirmed')
    and public.commercial_status_at(d) in ('pending', 'confirmed');
  select coalesce(l.target_products = '{shop}', false) into v_shop
  from public.crm_leads l where l.restaurant_id = r.id;

  return jsonb_build_object(
    'restaurant', public.commercial_public(r)
      || case when mine.id is not null then jsonb_build_object(
           'email', r.email, 'owner_name', r.owner_name,
           'owner_phone', r.owner_phone, 'owner_email', r.owner_email)
         else '{}'::jsonb end,
    'state', public.commercial_state(r, me.id),
    'products', (select to_jsonb(l.target_products) from public.crm_leads l where l.restaurant_id = r.id),
    'mine', case when mine.id is not null then jsonb_build_object(
      'id', mine.id,
      'status', public.commercial_status_at(mine),
      'declared_at', mine.declared_at,
      'confirm_deadline', mine.confirm_deadline,
      'confirmed_at', coalesce(mine.confirmed_at,
        case when public.commercial_status_at(mine) = 'confirmed' then mine.confirm_deadline end),
      'reserved_until', public.commercial_reserved_until(mine),
      'step_done_at', mine.step_done_at,
      'retained', mine.retained,
      'retained_updated_at', mine.retained_updated_at) end,
    'history', coalesce((
      select jsonb_agg(jsonb_build_object(
        'declared_at', d.declared_at,
        'ended_at', coalesce(d.ended_at, public.commercial_reserved_until(d)),
        'status', public.commercial_status_at(d),
        'end_reason', d.end_reason,
        'step', public.commercial_top_step(d.step_done_at),
        'mine', d.commercial_id = me.id,
        'retained', case when d.commercial_id = me.id then d.retained else d.retained - 'note' end)
        order by d.declared_at desc)
      from public.commercial_declarations d
      where d.restaurant_id = r.id
        and public.commercial_status_at(d) in ('abandoned', 'expired', 'signed', 'passage')), '[]'),
    'contacts', case when mine.id is not null then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'first_name', c.first_name, 'last_name', c.last_name, 'role', c.role,
        'phone', c.phone, 'email', c.email, 'is_decision_maker', c.is_decision_maker)
        order by c.is_decision_maker desc, c.created_at)
      from public.crm_contacts c where c.restaurant_id = r.id), '[]') else '[]' end,
    'activities', case when mine.id is not null then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'type', a.type, 'description', a.description, 'created_at', a.created_at)
        order by a.created_at desc)
      from public.crm_activities a where a.declaration_id = mine.id), '[]') else '[]' end,
    'tasks', case when mine.id is not null then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id, 'title', t.title, 'due_at', t.due_at, 'status', t.status)
        order by t.due_at nulls last)
      from public.crm_tasks t where t.declaration_id = mine.id and t.status = 'open'), '[]') else '[]' end,
    'appointments', case when mine.id is not null then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', ap.id, 'title', ap.title, 'start_at', ap.start_at, 'end_at', ap.end_at,
        'location', ap.location, 'type', ap.type, 'status', ap.status, 'contact_id', ap.contact_id)
        order by ap.start_at)
      from public.crm_appointments ap
      where ap.declaration_id = mine.id and ap.status = 'scheduled'), '[]') else '[]' end,
    'lea', case when mine.id is not null then coalesce((
      select jsonb_agg(jsonb_build_object(
        'at', coalesce(o.received_at, o.sent_at, o.created_at),
        'direction', o.direction, 'classification', o.classification)
        order by coalesce(o.received_at, o.sent_at, o.created_at) desc)
      from public.outreach_emails o
      where o.restaurant_id = r.id
        and (o.direction = 'inbound' or o.status = 'sent')), '[]') else '[]' end,
    'steps', (
      select jsonb_agg(jsonb_build_object(
        'position', t.position,
        'title', coalesce(t.commercial_title, t.title),
        'detail', coalesce(t.commercial_detail, t.detail)) order by t.position)
      from public.projet_step_templates t
      where t.shop = coalesce(v_shop, false) and t.position between 1 and 5),
    'note_max', (public.commercial_cfg()).retained_note_max_chars);
end;
$$;

-- Les déclarations actives du commercial, pour « Mes restaurants ».
create function public.commercial_my_restaurants()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  with me as (select * from public.commercial_me('work'))
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', d.id, 'restaurant_id', r.id, 'name', r.name, 'address', r.address, 'city', r.city,
      'status', public.commercial_status_at(d),
      'step', public.commercial_top_step(d.step_done_at),
      'confirm_deadline', d.confirm_deadline,
      'reserved_until', public.commercial_reserved_until(d),
      'next_task_at', (select min(t.due_at) from public.crm_tasks t
                       where t.declaration_id = d.id and t.status = 'open'))
      order by public.commercial_top_step(d.step_done_at) desc, r.name), '[]')
  from public.commercial_declarations d
  join public.crm_restaurants r on r.id = d.restaurant_id, me
  where d.commercial_id = me.id and d.status in ('pending', 'confirmed')
    and public.commercial_status_at(d) in ('pending', 'confirmed');
$$;

-- Écran Aujourd'hui. p_since : dernière ouverture, gardée sur l'appareil.
create function public.commercial_today(p_since timestamptz)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  with me as (select * from public.commercial_me('work')),
  cfg as (select * from public.commercial_cfg()),
  day as (
    select (date_trunc('day', now() at time zone 'Europe/Paris')) at time zone 'Europe/Paris' as start
  ),
  mine as (
    select d.id, d.restaurant_id, d.status, d.refusal_reason, d.end_reason, d.ended_at,
           d.declared_at, d.confirmed_by,
           coalesce(d.confirmed_at, case when d.status = 'pending' then d.confirm_deadline end) as confirmed_at,
           r.name, r.address, r.latitude, r.longitude, r.phone as restaurant_phone,
           public.commercial_status_at(d) as eff,
           public.commercial_reserved_until(d) as until
    from public.commercial_declarations d
    join public.crm_restaurants r on r.id = d.restaurant_id, me
    where d.commercial_id = me.id
  ),
  since as (select coalesce(p_since, '-infinity'::timestamptz) as at)
  select jsonb_build_object(
    'appointments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', ap.id, 'declaration_id', m.id, 'restaurant_id', m.restaurant_id, 'name', m.name,
        'title', ap.title, 'start_at', ap.start_at, 'location', coalesce(ap.location, m.address),
        'latitude', m.latitude, 'longitude', m.longitude) order by ap.start_at)
      from public.crm_appointments ap join mine m on m.id = ap.declaration_id, day
      where ap.status = 'scheduled' and m.eff in ('pending', 'confirmed')
        and ap.start_at >= day.start and ap.start_at < day.start + interval '1 day'), '[]'),
    'tasks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id, 'declaration_id', m.id, 'restaurant_id', m.restaurant_id, 'name', m.name,
        'title', t.title, 'due_at', t.due_at,
        'phone', coalesce((select c.phone from public.crm_contacts c
                           where c.restaurant_id = m.restaurant_id and c.phone is not null
                           order by c.is_decision_maker desc, c.created_at limit 1),
                          m.restaurant_phone)) order by t.due_at)
      from public.crm_tasks t join mine m on m.id = t.declaration_id, day
      where t.status = 'open' and m.eff in ('pending', 'confirmed')
        and t.due_at < day.start + interval '1 day'), '[]'),
    'expiring', coalesce((
      select jsonb_agg(jsonb_build_object(
        'declaration_id', m.id, 'restaurant_id', m.restaurant_id, 'name', m.name,
        'reserved_until', m.until) order by m.until)
      from mine m, cfg
      where m.eff = 'confirmed' and cfg.expiry_warning_days is not null
        and m.until < now() + make_interval(days => cfg.expiry_warning_days)), '[]'),
    'news', coalesce((
      select jsonb_agg(n order by n ->> 'at' desc) from (
        select jsonb_build_object('kind', 'confirmed', 'restaurant_id', m.restaurant_id,
                                  'name', m.name, 'at', m.confirmed_at,
                                  'tacit', m.confirmed_by is null) as n
        from mine m, since
        where m.eff not in ('pending', 'refused', 'passage')
          and m.confirmed_at > since.at and m.confirmed_at <= now()
        union all
        select jsonb_build_object('kind', 'refused', 'restaurant_id', m.restaurant_id,
                                  'name', m.name, 'at', m.ended_at, 'reason', m.refusal_reason)
        from mine m, since
        where m.status = 'refused' and m.ended_at > since.at
        union all
        select jsonb_build_object('kind', m.status, 'restaurant_id', m.restaurant_id,
                                  'name', m.name, 'at', m.ended_at, 'reason', m.end_reason)
        from mine m, since
        where m.ended_at > since.at
          and (m.status = 'signed'
               or m.end_reason in ('opposition', 'contract_ended', 'merged', 'reassigned'))
      ) news(n)), '[]'));
$$;

-- ---------------------------------------------------------------------------
-- Écriture (commercial)

create function public.commercial_create_restaurant(p jsonb)
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

-- Déclarer : un seul écran, un seul appel. Rend la déclaration écrite, en
-- attente ou refusée d'office (avec son motif).
create function public.commercial_declare(
  p_restaurant uuid,
  p_products public.ominin_product[],
  p_contact jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.commerciaux := public.commercial_me('declare');
  cfg public.commercial_settings := public.commercial_cfg();
  v_contact jsonb := public.commercial_clean_contact(p_contact);
  r public.crm_restaurants;
  v_reason public.commercial_refusal_reason;
  v_version uuid := public.commercial_version_in_force();
  v_id uuid;
  v_contact_id uuid;
  v_alert text;
begin
  if coalesce(cardinality(p_products), 0) = 0 then
    raise exception 'Choisissez l''offre visée.';
  end if;
  select * into r from public.crm_restaurants
  where id = p_restaurant and deleted_at is null
  for update;
  if r.id is null then
    raise exception 'Restaurant introuvable.' using errcode = 'P0002';
  end if;
  perform public.commercial_settle(r.id);
  if exists (
    select 1 from public.commercial_declarations
    where restaurant_id = r.id and commercial_id = me.id and status in ('pending', 'confirmed')
  ) then
    raise exception 'Vous avez déjà déclaré ce restaurant.';
  end if;

  v_reason := public.commercial_refusal(r, me.id);
  if v_reason is null then
    begin
      insert into public.commercial_declarations (
        restaurant_id, commercial_id, contract_version_id, status, confirm_deadline)
      values (r.id, me.id, v_version, 'pending', now() + make_interval(days => cfg.confirm_days))
      returning id into v_id;
    exception when unique_violation then
      v_reason := 'declared';
    end;
  end if;

  if v_reason is not null then
    insert into public.commercial_declarations (
      restaurant_id, commercial_id, contract_version_id, status, refusal_reason, ended_at)
    values (r.id, me.id, v_version, 'refused', v_reason, now())
    returning id into v_id;
    insert into public.commercial_emails (commercial_id, declaration_id, kind, detail)
    values (me.id, v_id, 'refused', v_reason::text);
    return jsonb_build_object('id', v_id, 'status', 'refused', 'refusal_reason', v_reason);
  end if;

  insert into public.crm_contacts (
    restaurant_id, first_name, last_name, role, phone, email, is_decision_maker)
  values (r.id, v_contact ->> 'first_name', v_contact ->> 'last_name', v_contact ->> 'role',
          v_contact ->> 'phone', v_contact ->> 'email', (v_contact ->> 'is_decision_maker')::boolean)
  returning id into v_contact_id;

  if cfg.name_similarity is not null then
    select 'Nom proche de « ' || n.name || ' », déjà client' into v_alert
    from (
      select e.name from public.etablissements e
      where not e.demo and e.id is distinct from r.etablissement_id
        and extensions.similarity(lower(e.name), lower(r.name)) >= cfg.name_similarity
      union all
      select s.name from public.shops s
      where not s.demo and s.id is distinct from r.shop_id
        and extensions.similarity(lower(s.name), lower(r.name)) >= cfg.name_similarity
    ) n
    limit 1;
  end if;

  update public.commercial_declarations
  set contact_id = v_contact_id, client_alert = v_alert
  where id = v_id;
  update public.crm_leads set target_products = p_products where restaurant_id = r.id;
  update public.outreach_emails
  set status = 'cancelled', error = 'reserved_by_commercial'
  where restaurant_id = r.id and direction = 'outbound'
    and status in ('draft', 'pending_approval', 'approved');

  return jsonb_build_object(
    'id', v_id, 'status', 'pending',
    'confirm_deadline', now() + make_interval(days => cfg.confirm_days),
    'client_alert', v_alert is not null);
end;
$$;

-- Passage sans suite (4.2 bis) : vu, pas intéressé, sans réserver.
create function public.commercial_passage(
  p_restaurant uuid,
  p_retained jsonb,
  p_reason public.commercial_end_reason
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.commerciaux := public.commercial_me('work');
  v_retained jsonb := public.commercial_clean_retained(coalesce(p_retained, '{}'));
  r public.crm_restaurants;
  v_id uuid;
begin
  if p_reason is null or p_reason not in (
    'not_interested', 'equipped', 'contract_elsewhere', 'closed', 'unreachable', 'head_office', 'other') then
    raise exception 'Choisissez le motif du passage.';
  end if;
  select * into r from public.crm_restaurants
  where id = p_restaurant and deleted_at is null
  for update;
  if r.id is null then
    raise exception 'Restaurant introuvable.' using errcode = 'P0002';
  end if;
  perform public.commercial_settle(r.id);
  if exists (
    select 1 from public.commercial_declarations
    where restaurant_id = r.id and status in ('pending', 'confirmed') and commercial_id = me.id
  ) then
    raise exception 'Vous avez déclaré ce restaurant : abandonnez la déclaration plutôt.';
  end if;
  if exists (
    select 1 from public.commercial_declarations
    where restaurant_id = r.id and status in ('pending', 'confirmed')
  ) then
    raise exception 'Ce restaurant est réservé par un autre commercial.';
  end if;
  if public.commercial_is_client(r) then
    raise exception 'Ce restaurant est déjà client d''Ominin.';
  end if;
  if r.outreach_opted_out_at is not null then
    raise exception 'Ce restaurant ne veut plus être contacté.';
  end if;
  if public.commercial_in_talks(r) then
    raise exception 'Ce restaurant est en discussion avec Ominin.';
  end if;

  insert into public.commercial_declarations (
    restaurant_id, commercial_id, contract_version_id, status, end_reason,
    retained, retained_updated_at, ended_at)
  values (r.id, me.id, public.commercial_version_in_force(), 'passage', p_reason,
          v_retained, now(), now())
  returning id into v_id;
  perform public.commercial_reflect(v_id);
  return v_id;
end;
$$;

create function public.commercial_abandon(p_declaration uuid, p_reason public.commercial_end_reason)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.commercial_declarations := public.commercial_my_active(p_declaration);
begin
  if p_reason is null or p_reason not in (
    'not_interested', 'equipped', 'contract_elsewhere', 'closed', 'unreachable', 'head_office', 'other') then
    raise exception 'Choisissez le motif de l''abandon.';
  end if;
  perform public.commercial_settle(d.restaurant_id);
  update public.commercial_declarations
  set status = 'abandoned', end_reason = p_reason, ended_at = now()
  where id = d.id;
  perform public.commercial_reflect(d.id);
end;
$$;

create function public.commercial_set_step(p_declaration uuid, p_position int, p_done boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.commercial_declarations := public.commercial_my_active(p_declaration);
  v_steps jsonb;
begin
  if p_position not between 1 and 5 then
    raise exception 'Étape inconnue.';
  end if;
  v_steps := case when p_done
    then d.step_done_at || jsonb_build_object(p_position::text, coalesce(d.step_done_at -> p_position::text, to_jsonb(now())))
    else d.step_done_at - p_position::text end;
  update public.commercial_declarations set step_done_at = v_steps where id = d.id;
  perform public.commercial_reflect(d.id);
  return v_steps;
end;
$$;

create function public.commercial_save_retained(p_declaration uuid, p_retained jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.commercial_declarations := public.commercial_my_active(p_declaration);
begin
  update public.commercial_declarations
  set retained = public.commercial_clean_retained(p_retained), retained_updated_at = now()
  where id = d.id;
end;
$$;

-- « Le restaurant ne veut plus être contacté » (art. 6.1) : l'opposition est
-- posée sur la fiche et chaque adresse connue entre dans la liste
-- d'opposition ; le trigger d'opposition abandonne la déclaration.
create function public.commercial_opt_out(p_restaurant uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.commerciaux := public.commercial_me('work');
  r public.crm_restaurants;
begin
  select * into r from public.crm_restaurants
  where id = p_restaurant and deleted_at is null
  for update;
  if r.id is null then
    raise exception 'Restaurant introuvable.' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from public.commercial_declarations
    where restaurant_id = r.id and status in ('pending', 'confirmed') and commercial_id <> me.id
  ) then
    raise exception 'Ce restaurant est réservé par un autre commercial : transmettez sa demande à Ominin.';
  end if;
  insert into public.outreach_suppressions (email, reason, restaurant_id)
  select distinct lower(e), 'manual', r.id
  from unnest(array[r.email, r.owner_email]
              || array(select c.email from public.crm_contacts c where c.restaurant_id = r.id)) e
  where e is not null and btrim(e) <> ''
  on conflict (email) do nothing;
  update public.crm_restaurants
  set outreach_opted_out_at = now()
  where id = r.id and outreach_opted_out_at is null;
end;
$$;

create function public.commercial_log(
  p_declaration uuid,
  p_type public.crm_activity_type,
  p_text text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.commercial_declarations := public.commercial_my_active(p_declaration);
  v_id uuid;
begin
  if p_type = 'status_change' then
    raise exception 'Type de note réservé au système.';
  end if;
  insert into public.crm_activities (restaurant_id, type, description, created_by, declaration_id)
  values (d.restaurant_id, p_type, nullif(btrim(p_text), ''), auth.uid(), d.id)
  returning id into v_id;
  return v_id;
end;
$$;

create function public.commercial_contact_upsert(p_declaration uuid, p_contact jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.commercial_declarations := public.commercial_my_active(p_declaration);
  v jsonb := public.commercial_clean_contact(p_contact);
  v_id uuid := (p_contact ->> 'id')::uuid;
begin
  if v_id is null then
    insert into public.crm_contacts (
      restaurant_id, first_name, last_name, role, phone, email, is_decision_maker)
    values (d.restaurant_id, v ->> 'first_name', v ->> 'last_name', v ->> 'role',
            v ->> 'phone', v ->> 'email', (v ->> 'is_decision_maker')::boolean)
    returning id into v_id;
  else
    update public.crm_contacts
    set first_name = v ->> 'first_name', last_name = v ->> 'last_name', role = v ->> 'role',
        phone = v ->> 'phone', email = v ->> 'email',
        is_decision_maker = (v ->> 'is_decision_maker')::boolean
    where id = v_id and restaurant_id = d.restaurant_id;
    if not found then
      raise exception 'Interlocuteur introuvable.' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;

-- Relance du commercial : sans lead_id, elle ne remonte ni dans
-- crm_leads.next_follow_up_at, ni dans la Carte ou le Pipeline de l'admin.
create function public.commercial_task_upsert(p_declaration uuid, p_task jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.commercial_declarations := public.commercial_my_active(p_declaration);
  v_id uuid := (p_task ->> 'id')::uuid;
  v_status public.crm_task_status := coalesce((p_task ->> 'status')::public.crm_task_status, 'open');
begin
  if v_id is null then
    if nullif(btrim(p_task ->> 'title'), '') is null then
      raise exception 'Donnez un titre à la relance.';
    end if;
    insert into public.crm_tasks (restaurant_id, title, due_at, status, created_by, declaration_id)
    values (d.restaurant_id, btrim(p_task ->> 'title'), (p_task ->> 'due_at')::timestamptz,
            v_status, auth.uid(), d.id)
    returning id into v_id;
  else
    update public.crm_tasks
    set title = coalesce(nullif(btrim(p_task ->> 'title'), ''), title),
        due_at = case when p_task ? 'due_at' then (p_task ->> 'due_at')::timestamptz else due_at end,
        status = v_status,
        completed_at = case when v_status = 'done' then now() end
    where id = v_id and declaration_id = d.id;
    if not found then
      raise exception 'Relance introuvable.' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;

create function public.commercial_appointment_upsert(p_declaration uuid, p_appointment jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.commercial_declarations := public.commercial_my_active(p_declaration);
  v jsonb := p_appointment;
  v_id uuid := (p_appointment ->> 'id')::uuid;
begin
  if (v ->> 'contact_id') is not null and not exists (
    select 1 from public.crm_contacts
    where id = (v ->> 'contact_id')::uuid and restaurant_id = d.restaurant_id
  ) then
    raise exception 'Interlocuteur introuvable.' using errcode = 'P0002';
  end if;
  if v_id is null then
    insert into public.crm_appointments (
      restaurant_id, contact_id, title, start_at, end_at, location, type, status,
      created_by, declaration_id)
    values (d.restaurant_id, (v ->> 'contact_id')::uuid, btrim(v ->> 'title'),
            (v ->> 'start_at')::timestamptz, (v ->> 'end_at')::timestamptz,
            nullif(btrim(v ->> 'location'), ''),
            coalesce((v ->> 'type')::public.crm_appointment_type, 'visit'),
            coalesce((v ->> 'status')::public.crm_appointment_status, 'scheduled'),
            auth.uid(), d.id)
    returning id into v_id;
  else
    update public.crm_appointments
    set contact_id = (v ->> 'contact_id')::uuid,
        title = coalesce(nullif(btrim(v ->> 'title'), ''), title),
        start_at = coalesce((v ->> 'start_at')::timestamptz, start_at),
        end_at = (v ->> 'end_at')::timestamptz,
        location = nullif(btrim(v ->> 'location'), ''),
        type = coalesce((v ->> 'type')::public.crm_appointment_type, type),
        status = coalesce((v ->> 'status')::public.crm_appointment_status, status)
    where id = v_id and declaration_id = d.id;
    if not found then
      raise exception 'Rendez-vous introuvable.' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;

-- Résiliation par le commercial (art. 7.2), avec le préavis du contrat.
create function public.commercial_resign()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.commerciaux := public.commercial_me('work');
  v_end timestamptz := now() + make_interval(months => (public.commercial_cfg()).notice_months);
begin
  if me.notice_given_at is not null then
    raise exception 'Votre résiliation est déjà enregistrée.';
  end if;
  update public.commerciaux
  set notice_given_at = now(),
      ended_at = least(v_end, public.commercial_contract_end(me)),
      end_reason = 'resignation'
  where id = me.id;
  return least(v_end, public.commercial_contract_end(me));
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin

create function public.admin_require()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé à l''admin.' using errcode = '42501';
  end if;
end;
$$;
revoke execute on function public.admin_require() from public, anon, authenticated;

-- Confirmer ou refuser, tant que le délai court (art. 4.3).
create function public.admin_decide_declaration(p_declaration uuid, p_decision text, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.commercial_declarations;
begin
  perform public.admin_require();
  select * into d from public.commercial_declarations where id = p_declaration for update;
  if d.id is null then
    raise exception 'Déclaration introuvable.' using errcode = 'P0002';
  end if;
  if d.status <> 'pending' or now() >= d.confirm_deadline then
    raise exception 'Cette déclaration n''est plus en attente : le délai de confirmation est échu ou elle est déjà tranchée.';
  end if;
  if p_decision = 'confirm' then
    update public.commercial_declarations
    set status = 'confirmed', confirmed_at = now(), confirmed_by = auth.uid(),
        reserved_until = now() + make_interval(months => (public.commercial_cfg()).sign_window_months),
        decision_note = nullif(btrim(p_reason), '')
    where id = d.id;
    insert into public.commercial_emails (commercial_id, declaration_id, kind)
    values (d.commercial_id, d.id, 'confirmed');
    perform public.commercial_reflect(d.id);
  elsif p_decision = 'refuse' then
    if nullif(btrim(p_reason), '') is null then
      raise exception 'Un refus se motive (article 4.3).';
    end if;
    update public.commercial_declarations
    set status = 'refused', refusal_reason = 'admin', decision_note = btrim(p_reason), ended_at = now()
    where id = d.id;
    insert into public.commercial_emails (commercial_id, declaration_id, kind, detail)
    values (d.commercial_id, d.id, 'refused', 'admin');
  else
    raise exception 'Décision inconnue.';
  end if;
end;
$$;

-- Déclaration reçue par e-mail (art. 4.3), avec sa date d'origine. Une
-- concurrente plus récente encore en attente est refusée d'abord ; une
-- concurrente confirmée, même tacitement, garde le restaurant.
create function public.admin_record_email_declaration(
  p_commercial uuid,
  p_restaurant uuid,
  p_declared_at timestamptz,
  p_products public.ominin_product[],
  p_contact jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  cfg public.commercial_settings := public.commercial_cfg();
  v_contact jsonb := public.commercial_clean_contact(p_contact);
  r public.crm_restaurants;
  other public.commercial_declarations;
  v_version uuid;
  v_reason public.commercial_refusal_reason;
  v_id uuid;
  v_contact_id uuid;
begin
  perform public.admin_require();
  if p_declared_at is null or p_declared_at > now() then
    raise exception 'Date de l''e-mail invalide.';
  end if;
  select a.version_id into v_version
  from public.legal_acceptances a
  where a.commercial_id = p_commercial and a.scope = 'commercial' and a.accepted_at <= p_declared_at
  order by a.accepted_at desc limit 1;
  if v_version is null then
    raise exception 'Ce commercial n''avait pas signé son contrat à cette date.';
  end if;
  select * into r from public.crm_restaurants
  where id = p_restaurant and deleted_at is null
  for update;
  if r.id is null then
    raise exception 'Restaurant introuvable.' using errcode = 'P0002';
  end if;
  perform public.commercial_settle(r.id);

  select * into other from public.commercial_declarations
  where restaurant_id = r.id and status in ('pending', 'confirmed');
  if other.id is not null then
    if other.commercial_id = p_commercial then
      raise exception 'Ce commercial a déjà déclaré ce restaurant.';
    end if;
    if other.status = 'confirmed' or other.declared_at <= p_declared_at then
      raise exception 'Une déclaration plus ancienne ou déjà confirmée garde ce restaurant : conflit à trancher.';
    end if;
    update public.commercial_declarations
    set status = 'refused', refusal_reason = 'declared',
        decision_note = 'Déclaration antérieure reçue par e-mail', ended_at = now()
    where id = other.id;
    insert into public.commercial_emails (commercial_id, declaration_id, kind, detail)
    values (other.commercial_id, other.id, 'refused', 'declared');
  end if;

  v_reason := public.commercial_refusal(r, p_commercial);
  if v_reason is not null then
    insert into public.commercial_declarations (
      restaurant_id, commercial_id, contract_version_id, status, channel, declared_at,
      refusal_reason, ended_at)
    values (r.id, p_commercial, v_version, 'refused', 'email', p_declared_at, v_reason, now())
    returning id into v_id;
    insert into public.commercial_emails (commercial_id, declaration_id, kind, detail)
    values (p_commercial, v_id, 'refused', v_reason::text);
    return jsonb_build_object('id', v_id, 'status', 'refused', 'refusal_reason', v_reason);
  end if;

  insert into public.crm_contacts (
    restaurant_id, first_name, last_name, role, phone, email, is_decision_maker)
  values (r.id, v_contact ->> 'first_name', v_contact ->> 'last_name', v_contact ->> 'role',
          v_contact ->> 'phone', v_contact ->> 'email', (v_contact ->> 'is_decision_maker')::boolean)
  returning id into v_contact_id;
  insert into public.commercial_declarations (
    restaurant_id, commercial_id, contract_version_id, status, channel, declared_at,
    confirm_deadline, contact_id)
  values (r.id, p_commercial, v_version, 'pending', 'email', p_declared_at,
          p_declared_at + make_interval(days => cfg.confirm_days), v_contact_id)
  returning id into v_id;
  if coalesce(cardinality(p_products), 0) > 0 then
    update public.crm_leads set target_products = p_products where restaurant_id = r.id;
  end if;
  update public.outreach_emails
  set status = 'cancelled', error = 'reserved_by_commercial'
  where restaurant_id = r.id and direction = 'outbound'
    and status in ('draft', 'pending_approval', 'approved');
  perform public.commercial_settle(r.id);
  return jsonb_build_object('id', v_id, 'status', 'pending');
end;
$$;

-- Réattribution pendant une réservation : seulement sur accord écrit du
-- titulaire, joint par l'admin. La nouvelle déclaration reprend la fenêtre
-- de signature en cours.
create function public.admin_reassign_declaration(
  p_declaration uuid,
  p_commercial uuid,
  p_reason text,
  p_document text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.commercial_declarations;
  v_until timestamptz;
  v_id uuid;
begin
  perform public.admin_require();
  if nullif(btrim(p_reason), '') is null or nullif(btrim(p_document), '') is null then
    raise exception 'Une réattribution demande un motif et l''accord écrit du titulaire.';
  end if;
  select * into d from public.commercial_declarations where id = p_declaration for update;
  if d.id is null then
    raise exception 'Déclaration introuvable.' using errcode = 'P0002';
  end if;
  perform public.commercial_settle(d.restaurant_id);
  select * into d from public.commercial_declarations where id = p_declaration;
  if d.status not in ('pending', 'confirmed') then
    raise exception 'Cette déclaration n''est plus active : le restaurant est libre.';
  end if;
  if d.commercial_id = p_commercial then
    raise exception 'Choisissez un autre commercial.';
  end if;
  if not exists (select 1 from public.legal_acceptances where commercial_id = p_commercial and scope = 'commercial') then
    raise exception 'Ce commercial n''a pas signé son contrat.';
  end if;
  v_until := public.commercial_reserved_until(d);

  update public.commercial_declarations
  set status = 'abandoned', end_reason = 'reassigned', decision_note = btrim(p_reason),
      decision_document = btrim(p_document), ended_at = now()
  where id = d.id;
  insert into public.commercial_declarations (
    restaurant_id, commercial_id, contract_version_id, status, confirm_deadline,
    reassigned_from, decision_note, decision_document, contact_id)
  values (d.restaurant_id, p_commercial, public.commercial_version_in_force(), 'pending', now(),
          d.id, btrim(p_reason), btrim(p_document), d.contact_id)
  returning id into v_id;
  update public.commercial_declarations
  set status = 'confirmed', confirmed_at = now(), confirmed_by = auth.uid(), reserved_until = v_until
  where id = v_id;
  insert into public.commercial_emails (commercial_id, declaration_id, kind, detail)
  values (d.commercial_id, d.id, 'released', 'reassigned'),
         (p_commercial, v_id, 'confirmed', 'reassigned');
  perform public.commercial_reflect(v_id);
  return v_id;
end;
$$;

-- Inscription constatée par l'admin avant le lien d'inscription (lot 1), ou
-- inscription sans lien rattachée : la déclaration est signée, la fiche
-- reliée au client. Une déclaration en attente est d'abord confirmée.
create function public.admin_mark_signed(
  p_declaration uuid,
  p_etablissement uuid default null,
  p_shop uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.commercial_declarations;
begin
  perform public.admin_require();
  if num_nonnulls(p_etablissement, p_shop) <> 1 then
    raise exception 'Choisir l''établissement ou la boutique inscrite.';
  end if;
  select * into d from public.commercial_declarations where id = p_declaration for update;
  if d.id is null then
    raise exception 'Déclaration introuvable.' using errcode = 'P0002';
  end if;
  perform public.commercial_settle(d.restaurant_id);
  select * into d from public.commercial_declarations where id = p_declaration;
  if d.status = 'pending' then
    update public.commercial_declarations
    set status = 'confirmed', confirmed_at = now(), confirmed_by = auth.uid(),
        reserved_until = now() + make_interval(months => (public.commercial_cfg()).sign_window_months)
    where id = d.id;
    insert into public.commercial_emails (commercial_id, declaration_id, kind)
    values (d.commercial_id, d.id, 'confirmed');
  elsif d.status <> 'confirmed' then
    raise exception 'Seule une déclaration active peut être marquée signée.';
  end if;
  perform public.crm_assert_client_free(d.restaurant_id, p_etablissement, p_shop);
  update public.commercial_declarations
  set status = 'signed', ended_at = now()
  where id = d.id;
  update public.crm_restaurants
  set etablissement_id = p_etablissement, shop_id = p_shop, client_ended_at = null
  where id = d.restaurant_id;
  insert into public.commercial_emails (commercial_id, declaration_id, kind)
  values (d.commercial_id, d.id, 'signed');
  perform public.commercial_reflect(d.id);
end;
$$;

create function public.admin_set_in_talks(p_restaurant uuid, p_value boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_require();
  update public.crm_restaurants set in_talks_override = p_value where id = p_restaurant;
end;
$$;

-- File de l'onglet Déclarations : statut effectif et ce qu'il faut trancher.
create function public.admin_declarations()
returns table (
  id uuid, restaurant_id uuid, restaurant_name text, restaurant_city text,
  commercial_id uuid, commercial_email text, commercial_name text,
  status public.commercial_declaration_status, effective_status public.commercial_declaration_status,
  channel text, declared_at timestamptz, confirm_deadline timestamptz, confirmed_at timestamptz,
  tacit boolean, reserved_until timestamptz, refusal_reason public.commercial_refusal_reason,
  end_reason public.commercial_end_reason, decision_note text, ended_at timestamptz,
  client_alert text, step int, in_talks boolean, in_talks_override boolean,
  emails jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require();
  return query
    select d.id, r.id, r.name, r.city, c.id, c.email,
           nullif(btrim(concat_ws(' ', c.first_name, c.last_name)), ''),
           d.status, public.commercial_status_at(d), d.channel, d.declared_at, d.confirm_deadline,
           coalesce(d.confirmed_at, case when public.commercial_status_at(d) <> 'pending'
                                          and d.status = 'pending' then d.confirm_deadline end),
           (d.status = 'pending' and now() >= d.confirm_deadline)
             or (d.status <> 'pending' and d.confirmed_at is not null and d.confirmed_by is null),
           public.commercial_reserved_until(d), d.refusal_reason, d.end_reason, d.decision_note,
           d.ended_at, d.client_alert, public.commercial_top_step(d.step_done_at),
           public.commercial_in_talks(r), r.in_talks_override,
           coalesce((select jsonb_agg(jsonb_build_object(
                       'kind', e.kind, 'created_at', e.created_at, 'sent_at', e.sent_at,
                       'gmail_message_id', e.gmail_message_id, 'last_error', e.last_error)
                       order by e.created_at)
                     from public.commercial_emails e where e.declaration_id = d.id), '[]')
    from public.commercial_declarations d
    join public.crm_restaurants r on r.id = d.restaurant_id
    join public.commerciaux c on c.id = d.commercial_id
    where d.status <> 'passage'
    order by (public.commercial_status_at(d) = 'pending') desc, d.confirm_deadline, d.declared_at desc;
end;
$$;

-- ---------------------------------------------------------------------------
-- Droits : les fonctions de l'espace et de l'admin s'appellent connecté ;
-- chacune vérifie elle-même qui appelle.
do $$
declare
  v_fn text;
begin
  foreach v_fn in array array[
    'commercial_search(text)',
    'commercial_find_duplicates(text, text, text, text, double precision, double precision, text, text)',
    'commercial_restaurant(uuid)',
    'commercial_my_restaurants()',
    'commercial_today(timestamptz)',
    'commercial_create_restaurant(jsonb)',
    'commercial_declare(uuid, public.ominin_product[], jsonb)',
    'commercial_passage(uuid, jsonb, public.commercial_end_reason)',
    'commercial_abandon(uuid, public.commercial_end_reason)',
    'commercial_set_step(uuid, int, boolean)',
    'commercial_save_retained(uuid, jsonb)',
    'commercial_opt_out(uuid)',
    'commercial_log(uuid, public.crm_activity_type, text)',
    'commercial_contact_upsert(uuid, jsonb)',
    'commercial_task_upsert(uuid, jsonb)',
    'commercial_appointment_upsert(uuid, jsonb)',
    'commercial_resign()',
    'admin_decide_declaration(uuid, text, text)',
    'admin_record_email_declaration(uuid, uuid, timestamptz, public.ominin_product[], jsonb)',
    'admin_reassign_declaration(uuid, uuid, text, text)',
    'admin_mark_signed(uuid, uuid, uuid)',
    'admin_set_in_talks(uuid, boolean)',
    'admin_declarations()'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', v_fn);
    execute format('grant execute on function public.%s to authenticated', v_fn);
  end loop;
end $$;
