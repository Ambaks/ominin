-- Durcissement : badgeuse, offre, codes et plafonds des routes publiques.

-- --------------------------------------------------------------------------
-- Badgeuse. Arrivées et départs passent par clock_in / clock_out, qui
-- vérifient le code de la fiche. Écrire time_entries à la main revient à
-- corriger un badgeage : c'est au gérant.
-- --------------------------------------------------------------------------

drop policy "member insert" on public.time_entries;
create policy "gerant insert" on public.time_entries
  for insert to authenticated
  with check (
    public.current_member_role(etablissement_id) = 'gerant'
    and exists (
      select 1 from public.staff s
      where s.id = time_entries.staff_id
        and s.etablissement_id = time_entries.etablissement_id
    )
  );

drop policy "member update" on public.time_entries;
create policy "gerant update" on public.time_entries
  for update to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant')
  with check (public.current_member_role(etablissement_id) = 'gerant');

-- --------------------------------------------------------------------------
-- Offre. Choisie à l'inscription (create_etablissement), elle ne change
-- ensuite que par Ominin, comme la commission.
-- --------------------------------------------------------------------------

create or replace function public.enforce_etablissement_fee_rights()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'authenticated' then
    return new;
  end if;
  if new.platform_fee_percent is distinct from old.platform_fee_percent
     or new.collect_fee_percent is distinct from old.collect_fee_percent
     or new.collect_slot_minutes is distinct from old.collect_slot_minutes
     or new.table_fee_percent is distinct from old.table_fee_percent
     or new.table_deposit_percent is distinct from old.table_deposit_percent then
    raise exception 'La commission plateforme est réservée à Ominin.';
  end if;
  if new.offre is distinct from old.offre then
    raise exception 'Le changement d''offre passe par Ominin.';
  end if;
  return new;
end;
$$;

-- --------------------------------------------------------------------------
-- Codes (Admin, encaissement, badgeage). Cinq codes erronés en quinze
-- minutes, par utilisateur et par code visé : le code est refusé tant que
-- la fenêtre n'est pas libérée. Un bon code efface les échecs. Les échecs
-- s'inscrivent dans la transaction de l'appel : une fonction qui veut les
-- garder ne lève donc pas d'exception sur un mauvais code, elle répond
-- false (ou null pour clock_in). pin_guard verrouille (utilisateur, code)
-- jusqu'à la fin de la transaction : des essais lancés en parallèle passent
-- un par un et voient chacun les échecs des précédents.
-- --------------------------------------------------------------------------

create table public.pin_failures (
  user_id uuid not null references auth.users (id) on delete cascade,
  scope text not null,
  failed_at timestamptz not null default now()
);

create index pin_failures_lookup on public.pin_failures (user_id, scope, failed_at);

alter table public.pin_failures enable row level security;
revoke all on public.pin_failures from anon, authenticated;

create function public.pin_guard(p_scope text)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text || ':' || p_scope));
  if (
    select count(*) from pin_failures
    where user_id = auth.uid()
      and scope = p_scope
      and failed_at > now() - interval '15 minutes'
  ) >= 5 then
    raise exception 'Trop de codes erronés : réessayez dans quelques minutes.';
  end if;
end;
$$;

create function public.pin_attempt(p_scope text, p_ok boolean)
returns boolean
language plpgsql security definer
set search_path = public
as $$
begin
  if p_ok then
    delete from pin_failures where user_id = auth.uid() and scope = p_scope;
  else
    insert into pin_failures (user_id, scope) values (auth.uid(), p_scope);
  end if;
  return p_ok;
end;
$$;

revoke execute on function public.pin_guard(text) from public, anon, authenticated;
revoke execute on function public.pin_attempt(text, boolean) from public, anon, authenticated;

create or replace function public.verify_admin_pin(
  p_etablissement_id uuid,
  p_code text
)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  v_scope text := 'admin:' || p_etablissement_id;
  v_hash text;
begin
  if current_member_role(p_etablissement_id) is null then
    return false;
  end if;
  perform pin_guard(v_scope);
  if is_ominin_admin_pin(p_code) then
    return pin_attempt(v_scope, true);
  end if;
  select pin_hash into v_hash
  from admin_pins where etablissement_id = p_etablissement_id;
  return pin_attempt(
    v_scope,
    coalesce(v_hash is not null and extensions.crypt(p_code, v_hash) = v_hash, false)
  );
end;
$$;

create or replace function public.verify_payment_pin(
  p_etablissement_id uuid,
  p_code text
)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  v_scope text := 'payment:' || p_etablissement_id;
  v_hash text;
begin
  if current_member_role(p_etablissement_id) is null then
    return false;
  end if;
  perform pin_guard(v_scope);
  select pin_hash into v_hash
  from payment_pins
  where etablissement_id = p_etablissement_id;
  return pin_attempt(
    v_scope,
    coalesce(v_hash is not null and extensions.crypt(p_code, v_hash) = v_hash, false)
  );
end;
$$;

-- set_payment_pin, pay_order_items et clock_out changent de type de retour :
-- recréées, avec les droits d'origine (authenticated, service_role ; pas
-- anon).

-- Le refus d'un code égal au code Ominin dit au gérant qu'il l'a trouvé :
-- chaque refus compte comme un essai du code Admin, sous le même plafond.
-- Une pose réussie n'efface rien : elle ne prouve pas la connaissance du
-- code Admin.
drop function public.set_payment_pin(uuid, text);

create function public.set_payment_pin(
  p_etablissement_id uuid,
  p_code text
)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  v_scope text := 'admin:' || p_etablissement_id;
  v_admin_hash text;
begin
  if current_member_role(p_etablissement_id) is distinct from 'gerant' then
    raise exception 'Réservé au gérant de l''établissement.';
  end if;
  if p_code is null or p_code !~ '^[0-9]{4}$' then
    raise exception 'Le code d''encaissement doit compter exactement 4 chiffres.';
  end if;
  select pin_hash into v_admin_hash
  from admin_pins
  where etablissement_id = p_etablissement_id;
  if v_admin_hash is not null
     and extensions.crypt(p_code, v_admin_hash) = v_admin_hash then
    raise exception 'Le code d''encaissement doit être différent du code Admin.';
  end if;
  perform pin_guard(v_scope);
  if is_ominin_admin_pin(p_code) then
    return pin_attempt(v_scope, false);
  end if;
  insert into payment_pins (etablissement_id, pin_hash)
  values (
    p_etablissement_id,
    extensions.crypt(p_code, extensions.gen_salt('bf'))
  )
  on conflict (etablissement_id) do update
    set pin_hash = excluded.pin_hash, updated_at = now();
  update etablissements
  set payment_pin_set = true
  where id = p_etablissement_id;
  return true;
end;
$$;

revoke execute on function public.set_payment_pin(uuid, text) from public, anon;
grant execute on function public.set_payment_pin(uuid, text) to authenticated, service_role;
drop function public.pay_order_items(jsonb, public.payment_mode, text, numeric, numeric, numeric, numeric);

create function public.pay_order_items(
  p_items jsonb,
  p_mode public.payment_mode,
  p_payment_code text,
  p_cash_given numeric default null,
  p_cash_change numeric default null,
  p_tip numeric default null,
  p_cash_amount numeric default null
)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  v_etab uuid;
  v_scope text;
  v_hash text;
begin
  select o.etablissement_id into v_etab
  from order_items oi
  join orders o on o.id = oi.order_id
  where oi.id = (p_items->0->>'item_id')::uuid;
  if v_etab is null then
    raise exception 'Aucun article sélectionné.';
  end if;
  select pin_hash into v_hash
  from payment_pins
  where etablissement_id = v_etab;
  if v_hash is null then
    raise exception 'Configurez d''abord le code d''encaissement dans les réglages Admin.';
  end if;
  if current_member_role(v_etab) is null then
    raise exception 'Code d''encaissement incorrect.';
  end if;
  v_scope := 'payment:' || v_etab;
  perform pin_guard(v_scope);
  if not pin_attempt(
    v_scope,
    coalesce(extensions.crypt(p_payment_code, v_hash) = v_hash, false)
  ) then
    return false;
  end if;
  perform public.pay_order_items_internal(
    p_items,
    p_mode,
    p_cash_given,
    p_cash_change,
    p_tip,
    p_cash_amount
  );
  return true;
end;
$$;

revoke execute on function public.pay_order_items(jsonb, public.payment_mode, text, numeric, numeric, numeric, numeric) from public, anon;
grant execute on function public.pay_order_items(jsonb, public.payment_mode, text, numeric, numeric, numeric, numeric) to authenticated, service_role;

create or replace function public.clock_in(
  p_staff_id uuid,
  p_code text,
  p_signature text
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_staff public.staff;
  v_scope text;
  v_id uuid;
begin
  select * into v_staff from staff where id = p_staff_id;
  if v_staff.id is null or current_member_role(v_staff.etablissement_id) is null then
    raise exception 'Fiche introuvable.';
  end if;
  if v_staff.hidden then
    raise exception 'Cette fiche est masquée : le gérant la réaffiche depuis Équipe.';
  end if;
  v_scope := 'staff:' || v_staff.id;
  perform pin_guard(v_scope);
  if not pin_attempt(v_scope, staff_code_ok(v_staff.id, p_code)) then
    return null;
  end if;
  if p_signature is null or length(p_signature) = 0 then
    raise exception 'Signature manquante.';
  end if;
  begin
    insert into time_entries (etablissement_id, staff_id, member_name, signature_in, created_by)
    values (v_staff.etablissement_id, v_staff.id, v_staff.name, p_signature, auth.uid())
    returning id into v_id;
  exception when unique_violation then
    -- Index partiel time_entries_open_idx : déjà en service.
    raise exception '% a déjà badgé son arrivée.', v_staff.name;
  end;
  return v_id;
end;
$$;

drop function public.clock_out(uuid, text, text);

create function public.clock_out(
  p_entry_id uuid,
  p_code text,
  p_signature text
)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  v_entry public.time_entries;
  v_scope text;
begin
  select * into v_entry from time_entries where id = p_entry_id;
  if v_entry.id is null or current_member_role(v_entry.etablissement_id) is null then
    raise exception 'Badgeage introuvable.';
  end if;
  if v_entry.ended_at is not null then
    raise exception 'Ce badgeage est déjà clos.';
  end if;
  if v_entry.staff_id is null then
    raise exception 'La fiche a été retirée : le gérant clôt ce badgeage depuis le journal.';
  end if;
  v_scope := 'staff:' || v_entry.staff_id;
  perform pin_guard(v_scope);
  if not pin_attempt(v_scope, staff_code_ok(v_entry.staff_id, p_code)) then
    return false;
  end if;
  if p_signature is null or length(p_signature) = 0 then
    raise exception 'Signature manquante.';
  end if;
  update time_entries
  set ended_at = now(), signature_out = p_signature
  where id = p_entry_id;
  return true;
end;
$$;

revoke execute on function public.clock_out(uuid, text, text) from public, anon;
grant execute on function public.clock_out(uuid, text, text) to authenticated, service_role;

-- --------------------------------------------------------------------------
-- Plafonds des routes publiques (contact boutique, newsletter, codes promo,
-- appel serveur, invitations, légendes IA), comptés ici plutôt qu'en mémoire
-- pour tenir sur toutes les instances. Les plafonds vivent côté application
-- (lib/rate-limit/constants.ts) ; la fonction ne fait que compter.
-- --------------------------------------------------------------------------

create table public.rate_limit_hits (
  key text not null,
  hit_at timestamptz not null default now()
);

create index rate_limit_hits_key on public.rate_limit_hits (key, hit_at);

alter table public.rate_limit_hits enable row level security;
revoke all on public.rate_limit_hits from anon, authenticated;

-- true : la requête passe (et compte) ; false : plafond atteint.
create function public.rate_limit_hit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext(p_key));
  delete from rate_limit_hits
  where key = p_key and hit_at <= now() - make_interval(secs => p_window_seconds);
  if (select count(*) from rate_limit_hits where key = p_key) >= p_max then
    return false;
  end if;
  insert into rate_limit_hits (key) values (p_key);
  return true;
end;
$$;

revoke execute on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;

-- --------------------------------------------------------------------------
-- Annuaire Ola : rayon et nombre de résultats bornés, distance arrondie au
-- demi-kilomètre pour qu'aucun recoupement de recherches ne retrouve
-- l'emplacement exact d'une entreprise (souvent un domicile).
-- --------------------------------------------------------------------------

create or replace function public.ola_find_businesses(
  p_lat double precision,
  p_lng double precision,
  p_radius_m integer,
  p_limit integer,
  p_activities text[] default null,
  p_name text default null
)
returns table (
  id uuid,
  name text,
  legal_name text,
  activity text,
  activity_label text,
  address text,
  distance_m integer,
  phones text[],
  websites text[],
  socials text[]
)
language sql stable security definer
set search_path = ''
as $$
  with origin as (
    select extensions.st_setsrid(
      extensions.st_makepoint(p_lng, p_lat), 4326
    )::extensions.geography as point
  )
  select b.id, b.name, b.legal_name, b.activity, a.label, b.address,
         (round(extensions.st_distance(b.location, origin.point) / 500) * 500)::integer,
         b.phones, b.websites, b.socials
  from public.ola_businesses b
  join public.ola_activities a on a.code = b.activity
  cross join origin
  where extensions.st_dwithin(b.location, origin.point, least(p_radius_m, 50000))
    and (p_activities is null or b.activity = any (p_activities))
    and (p_name is null
         or p_name operator(extensions.<%) (b.name || ' ' || b.legal_name))
  order by extensions.st_distance(b.location, origin.point)
  limit least(p_limit, 50);
$$;
