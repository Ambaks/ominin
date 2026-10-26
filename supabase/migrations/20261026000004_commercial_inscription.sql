-- Espace commercial, lot 2 : le restaurant s'inscrit par le lien de son
-- commercial, et devient son Client Apporté.
--
-- Le lien porte un jeton aléatoire dont seule l'empreinte est gardée. Ouvert
-- par le gérant, il est rattaché à son compte (signup_user_id) ; à son
-- acceptation des CGV — par /api/legal/accept ou par le paiement de
-- démarrage, peu importe : c'est l'écriture de legal_acceptances qui compte —
-- la déclaration est signée, la fiche reliée, le Client Apporté créé, le
-- client entre dans le Projet. Aussi : démos à faire, push, quota Google,
-- « Autour de moi », fusion de fiches.

-- ---------------------------------------------------------------------------
-- Tables

alter table public.crm_restaurants
  add column merged_into uuid references public.crm_restaurants (id);

alter table public.commercial_declarations
  add column signup_token_hash text unique,
  add column signup_token_expires_at timestamptz,
  add column signup_user_id uuid references auth.users (id) on delete set null,
  -- Offre du tunnel par lequel le gérant s'est inscrit (menu, collect, shop).
  add column signup_product public.ominin_product;
create index commercial_declarations_signup_user_idx
  on public.commercial_declarations (signup_user_id) where signup_user_id is not null;

-- Client Apporté : un établissement ou une boutique né d'une déclaration
-- (plusieurs pour un même exploitant, art. 4.4). La fin de commission ne se
-- stocke pas : commission_from + durée du contrat, bornée par le départ du
-- client (crm_restaurants.client_ended_at). validated_at nul : inscription
-- suspecte (nom ou téléphone trop différents), hors de tout relevé avant
-- validation par l'admin. commission_from nul : CGV pas encore acceptées.
create table public.commercial_clients (
  id uuid primary key default gen_random_uuid(),
  declaration_id uuid not null references public.commercial_declarations (id),
  etablissement_id uuid references public.etablissements (id),
  shop_id uuid references public.shops (id),
  commission_from timestamptz,
  validated_at timestamptz,
  alert text,
  created_at timestamptz not null default now(),
  check (num_nonnulls(etablissement_id, shop_id) = 1)
);
create unique index commercial_clients_etablissement_key
  on public.commercial_clients (etablissement_id) where etablissement_id is not null;
create unique index commercial_clients_shop_key
  on public.commercial_clients (shop_id) where shop_id is not null;
create index commercial_clients_declaration_idx on public.commercial_clients (declaration_id);

alter table public.commercial_clients enable row level security;
create policy "admin read" on public.commercial_clients
  for select to authenticated using ((select public.is_admin()));
create policy "self read" on public.commercial_clients
  for select to authenticated
  using (declaration_id in (
    select d.id from public.commercial_declarations d
    join public.commerciaux c on c.id = d.commercial_id
    where c.user_id = (select auth.uid())
  ));

-- Démo aux couleurs du restaurant, demandée depuis le Kit avec des photos de
-- la carte prises sur place (commercial-docs/<commercial>/demos/…) ; livrée
-- par l'admin (/new-restaurant), elle coche l'étape 2.
create table public.commercial_demo_requests (
  id uuid primary key default gen_random_uuid(),
  declaration_id uuid not null references public.commercial_declarations (id),
  status text not null default 'requested' check (status in ('requested', 'done', 'cancelled')),
  note text,
  photos text[] not null default '{}',
  demo_url text,
  created_at timestamptz not null default now(),
  done_at timestamptz,
  check (status <> 'done' or demo_url is not null)
);
create index commercial_demo_requests_status_idx on public.commercial_demo_requests (status, created_at);

alter table public.commercial_demo_requests enable row level security;
create policy "admin read" on public.commercial_demo_requests
  for select to authenticated using ((select public.is_admin()));
create policy "self read" on public.commercial_demo_requests
  for select to authenticated
  using (declaration_id in (
    select d.id from public.commercial_declarations d
    join public.commerciaux c on c.id = d.commercial_id
    where c.user_id = (select auth.uid())
  ));

-- Abonnements push de l'espace commercial (modèle admin_push_subscriptions) :
-- écrits et lus par les routes /api/commercial/push (clé service).
create table public.commercial_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  commercial_id uuid not null references public.commerciaux (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.commercial_push_subscriptions enable row level security;

-- Préférences de notification : événement → reçu ou non (absent : reçu).
alter table public.commerciaux
  add column push_prefs jsonb not null default '{}' check (jsonb_typeof(push_prefs) = 'object');

-- Rappel d'un rendez-vous envoyé (une fois).
alter table public.crm_appointments add column reminded_at timestamptz;

-- ---------------------------------------------------------------------------
-- Projet : le client créé à l'inscription garde sa fiche et sa déclaration.
drop function public.projet_add_client(text, public.ominin_product, uuid, uuid);
create function public.projet_add_client(
  p_name text,
  p_product public.ominin_product,
  p_etablissement uuid default null,
  p_shop uuid default null,
  p_restaurant uuid default null,
  p_declaration uuid default null
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into projet_clients (name, product, etablissement_id, shop_id, restaurant_id, declaration_id)
  values (p_name, p_product, p_etablissement, p_shop, p_restaurant, p_declaration)
  returning id into v_id;

  insert into projet_steps (client_id, phase, position, title, detail)
  select v_id, t.phase, t.position, t.title, t.detail
  from projet_step_templates t
  where t.shop = (p_product = 'shop');

  return v_id;
end;
$$;
revoke execute on function public.projet_add_client(text, public.ominin_product, uuid, uuid, uuid, uuid)
  from public, anon;
grant execute on function public.projet_add_client(text, public.ominin_product, uuid, uuid, uuid, uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Le Client Apporté : la ligne commercial_clients d'une déclaration signée.

-- Première acceptation des CGV de ce client postérieure à la déclaration.
create function public.commercial_first_acceptance(
  p_declared_at timestamptz,
  p_etablissement uuid,
  p_shop uuid
)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select min(accepted_at) from public.legal_acceptances
  where accepted_at >= p_declared_at
    and ((p_etablissement is not null and scope = 'etablissement' and etablissement_id = p_etablissement)
         or (p_shop is not null and scope = 'shop' and shop_id = p_shop));
$$;

-- Nom ou téléphone trop différents de la fiche : l'inscription attend la
-- validation de l'admin (null : rien à signaler).
create function public.commercial_signup_alert(
  r public.crm_restaurants,
  p_etablissement uuid,
  p_shop uuid
)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  with client as (
    select e.name, public.phone_digits(e.phone) as phone from public.etablissements e where e.id = p_etablissement
    union all
    select s.name, public.phone_digits(s.contact_phone) from public.shops s where s.id = p_shop
  ),
  cfg as (select name_similarity from public.commercial_cfg())
  select nullif(concat_ws(' ; ',
    case when cfg.name_similarity is not null
              and extensions.similarity(lower(client.name), lower(r.name)) < cfg.name_similarity
         then 'nom « ' || client.name || ' » loin de la fiche « ' || r.name || ' »' end,
    case when client.phone is not null and r.phone_normalized is not null and client.phone <> r.phone_normalized
         then 'téléphone différent de la fiche' end), '')
  from client, cfg;
$$;

create function public.commercial_add_client(
  d public.commercial_declarations,
  p_etablissement uuid,
  p_shop uuid,
  p_validated boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.crm_restaurants;
  v_alert text;
  v_id uuid;
begin
  select * into r from public.crm_restaurants where id = d.restaurant_id;
  v_alert := case when p_validated then null else public.commercial_signup_alert(r, p_etablissement, p_shop) end;
  insert into public.commercial_clients (declaration_id, etablissement_id, shop_id, commission_from, validated_at, alert)
  values (d.id, p_etablissement, p_shop,
          public.commercial_first_acceptance(d.declared_at, p_etablissement, p_shop),
          case when v_alert is null then now() end, v_alert)
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.commercial_first_acceptance(timestamptz, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.commercial_signup_alert(public.crm_restaurants, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.commercial_add_client(public.commercial_declarations, uuid, uuid, boolean) from public, anon, authenticated;

-- Déclarations déjà marquées signées par l'admin au lot 1 : leur Client
-- Apporté, validé (l'admin a constaté l'inscription).
insert into public.commercial_clients (declaration_id, etablissement_id, shop_id, commission_from, validated_at)
select d.id, r.etablissement_id, r.shop_id,
       public.commercial_first_acceptance(d.declared_at, r.etablissement_id, r.shop_id), d.ended_at
from public.commercial_declarations d
join public.crm_restaurants r on r.id = d.restaurant_id
where d.status = 'signed' and num_nonnulls(r.etablissement_id, r.shop_id) = 1;

-- L'admin marque signée (inscription constatée, ou inscription sans lien
-- rattachée) : le Client Apporté naît validé.
create or replace function public.admin_mark_signed(
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
  set status = 'signed', ended_at = now(), signup_token_hash = null
  where id = d.id;
  update public.crm_restaurants
  set etablissement_id = p_etablissement, shop_id = p_shop, client_ended_at = null
  where id = d.restaurant_id;
  perform public.commercial_add_client(d, p_etablissement, p_shop, true);
  insert into public.commercial_emails (commercial_id, declaration_id, kind)
  values (d.commercial_id, d.id, 'signed');
  perform public.commercial_reflect(d.id);
end;
$$;

-- Nouvel établissement du même exploitant (art. 4.4) : même déclaration.
create function public.admin_add_client(p_declaration uuid, p_etablissement uuid default null, p_shop uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.commercial_declarations;
begin
  perform public.admin_require();
  select * into d from public.commercial_declarations where id = p_declaration;
  if d.status is distinct from 'signed' then
    raise exception 'Seul un restaurant inscrit ajoute un établissement du même exploitant.';
  end if;
  if num_nonnulls(p_etablissement, p_shop) <> 1 then
    raise exception 'Choisir l''établissement ou la boutique.';
  end if;
  return public.commercial_add_client(d, p_etablissement, p_shop, true);
end;
$$;

create function public.admin_validate_client(p_client uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_require();
  update public.commercial_clients set validated_at = now() where id = p_client and validated_at is null;
  if not found then
    raise exception 'Inscription introuvable ou déjà validée.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Le lien d'inscription

-- Généré par le titulaire d'une déclaration confirmée ; un nouveau lien
-- remplace le précédent. Seule l'empreinte du jeton est gardée.
create function public.commercial_signup_link(p_declaration uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.commercial_declarations := public.commercial_my_active(p_declaration);
  v_days int := (public.commercial_cfg()).signup_link_days;
  v_token text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  if public.commercial_status_at(d) <> 'confirmed' then
    raise exception 'Le lien d''inscription s''ouvre une fois la déclaration confirmée.';
  end if;
  if v_days is null then
    raise exception 'Les liens d''inscription ne sont pas encore ouverts : Ominin doit en régler la validité.';
  end if;
  update public.commercial_declarations
  set signup_token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex'),
      signup_token_expires_at = now() + make_interval(days => v_days),
      signup_user_id = null
  where id = d.id;
  return v_token;
end;
$$;

-- Déclaration désignée par un jeton encore valable (actif, non consommé).
create function public.commercial_by_token(p_token text)
returns public.commercial_declarations
language sql
stable
security definer
set search_path = ''
as $$
  select d.* from public.commercial_declarations d
  where d.signup_token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
    and d.signup_token_expires_at > now()
    and public.commercial_status_at(d) in ('pending', 'confirmed');
$$;
revoke execute on function public.commercial_by_token(text) from public, anon, authenticated;

-- Ce que la page d'inscription affiche d'un lien : le restaurant, pour
-- pré-remplir, et qui le propose. Null : lien expiré, consommé ou inconnu.
create function public.signup_link_info(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'name', r.name, 'address', r.address, 'postal_code', r.postal_code, 'city', r.city,
    'phone', r.phone, 'commercial', nullif(btrim(concat_ws(' ', c.first_name, c.last_name)), ''))
  from public.commercial_by_token(p_token) d
  join public.crm_restaurants r on r.id = d.restaurant_id
  join public.commerciaux c on c.id = d.commercial_id
  where d.id is not null;
$$;

-- Rattache le lien au compte qui l'ouvre (à la création du compte, ou à
-- l'ouverture si le gérant est déjà connecté). Un lien sert un seul compte.
create function public.signup_link_claim(p_token text, p_product public.ominin_product)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.commercial_declarations := public.commercial_by_token(p_token);
begin
  if d.id is null then
    return false;
  end if;
  if d.signup_user_id is not null and d.signup_user_id <> auth.uid() then
    raise exception 'Ce lien d''inscription a déjà servi à un autre compte.';
  end if;
  update public.commercial_declarations
  set signup_user_id = auth.uid(), signup_product = p_product
  where id = d.id;
  return true;
end;
$$;

-- La signature : à l'acceptation des CGV par le compte rattaché au lien.
-- Une déclaration encore en attente est d'abord confirmée (13.2 n° 11).
create function public.commercial_on_client_acceptance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.commercial_declarations;
  r public.crm_restaurants;
  v_name text;
  v_product public.ominin_product;
  v_projet uuid;
begin
  -- Un Client Apporté rattaché avant ses CGV commence à les compter ici.
  update public.commercial_clients
  set commission_from = new.accepted_at
  where commission_from is null
    and ((new.scope = 'etablissement' and etablissement_id = new.etablissement_id)
         or (new.scope = 'shop' and shop_id = new.shop_id));

  if new.user_id is null then
    return new;
  end if;
  -- L'acceptation des CGV ne doit jamais échouer à cause de l'attribution :
  -- en cas d'erreur, l'inscription reste, l'attribution est annulée (et
  -- l'admin la retrouve parmi les inscriptions sans lien).
  begin
  select dd.* into d from public.commercial_declarations dd
  where dd.signup_user_id = new.user_id and dd.signup_token_hash is not null
    and dd.status in ('pending', 'confirmed')
  order by dd.declared_at desc
  limit 1
  for update;
  if d.id is null then
    return new;
  end if;
  perform public.commercial_settle(d.restaurant_id);
  select * into d from public.commercial_declarations where id = d.id;
  if d.status = 'pending' then
    update public.commercial_declarations
    set status = 'confirmed', confirmed_at = now(), confirmed_by = null,
        reserved_until = now() + make_interval(months => (public.commercial_cfg()).sign_window_months)
    where id = d.id;
    insert into public.commercial_emails (commercial_id, declaration_id, kind, detail)
    values (d.commercial_id, d.id, 'confirmed', 'signup');
  elsif d.status <> 'confirmed' then
    return new;
  end if;

  update public.commercial_declarations
  set status = 'signed', ended_at = now(), signup_token_hash = null
  where id = d.id;
  select * into r from public.crm_restaurants where id = d.restaurant_id;
  if not exists (
    select 1 from public.crm_restaurants
    where deleted_at is null and id <> r.id
      and ((new.scope = 'etablissement' and etablissement_id = new.etablissement_id)
           or (new.scope = 'shop' and shop_id = new.shop_id))
  ) then
    update public.crm_restaurants
    set etablissement_id = case when new.scope = 'etablissement' then new.etablissement_id end,
        shop_id = case when new.scope = 'shop' then new.shop_id end,
        client_ended_at = null
    where id = r.id;
  end if;
  if not exists (
    select 1 from public.commercial_clients
    where (new.scope = 'etablissement' and etablissement_id = new.etablissement_id)
       or (new.scope = 'shop' and shop_id = new.shop_id)
  ) then
    perform public.commercial_add_client(
      d,
      case when new.scope = 'etablissement' then new.etablissement_id end,
      case when new.scope = 'shop' then new.shop_id end,
      false);
  end if;

  if new.scope = 'shop' then
    select name into v_name from public.shops where id = new.shop_id;
    v_product := 'shop';
  else
    select name into v_name from public.etablissements where id = new.etablissement_id;
    v_product := coalesce(d.signup_product, 'menu');
  end if;
  -- Déjà suivi dans le Projet (ajouté à la main) : relié, pas dédoublé.
  select id into v_projet from public.projet_clients
  where (new.scope = 'etablissement' and etablissement_id = new.etablissement_id)
     or (new.scope = 'shop' and shop_id = new.shop_id)
  limit 1;
  if v_projet is null then
    v_projet := public.projet_add_client(
      v_name, v_product,
      case when new.scope = 'etablissement' then new.etablissement_id end,
      case when new.scope = 'shop' then new.shop_id end,
      d.restaurant_id, d.id);
  else
    update public.projet_clients set restaurant_id = d.restaurant_id, declaration_id = d.id where id = v_projet;
  end if;
  update public.projet_steps set status = 'done' where client_id = v_projet and position <= 6;

  insert into public.commercial_emails (commercial_id, declaration_id, kind)
  values (d.commercial_id, d.id, 'signed');
  perform public.commercial_reflect(d.id);
  exception when others then
    raise warning 'Attribution de l''inscription % non faite : %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

create trigger legal_acceptances_commercial_signup
  after insert on public.legal_acceptances
  for each row
  when (new.scope in ('etablissement', 'shop'))
  execute function public.commercial_on_client_acceptance();

-- Inscriptions sans lien d'un restaurant réservé : un établissement ou une
-- boutique hors de toute fiche, au téléphone ou à l'adresse e-mail d'un
-- restaurant déclaré, est proposé au rattachement (admin_mark_signed).
create function public.admin_signup_matches()
returns table (
  declaration_id uuid, restaurant_id uuid, restaurant_name text, commercial_name text,
  kind text, id uuid, name text, created_at timestamptz, reason text
)
language sql
stable
security definer
set search_path = ''
as $$
  with active as (
    select d.id as declaration_id, d.declared_at, r.id as restaurant_id, r.name, r.phone_normalized,
           nullif(btrim(concat_ws(' ', c.first_name, c.last_name)), '') as who,
           array_remove(array[lower(r.email), lower(r.owner_email)]
             || array(select lower(ct.email) from public.crm_contacts ct where ct.restaurant_id = r.id), null) as emails
    from public.commercial_declarations d
    join public.crm_restaurants r on r.id = d.restaurant_id
    join public.commerciaux c on c.id = d.commercial_id
    where d.status in ('pending', 'confirmed') and public.is_admin()
  ),
  clients as (
    select 'etablissement' as kind, e.id, e.name, e.created_at, public.phone_digits(e.phone) as phone,
           array(select lower(m.email) from public.memberships m where m.etablissement_id = e.id) as emails
    from public.etablissements e
    where not e.demo and not exists (select 1 from public.crm_restaurants x where x.etablissement_id = e.id)
    union all
    select 'shop', s.id, s.name, s.created_at, public.phone_digits(s.contact_phone),
           array_remove(array[lower(s.contact_email)]
             || array(select lower(m.email) from public.shop_members m where m.shop_id = s.id), null)
    from public.shops s
    where not s.demo and not exists (select 1 from public.crm_restaurants x where x.shop_id = s.id)
  )
  select a.declaration_id, a.restaurant_id, a.name, a.who, c.kind, c.id, c.name, c.created_at,
         case when c.phone = a.phone_normalized then 'téléphone' else 'e-mail' end
  from active a
  join clients c on c.created_at >= a.declared_at
   and ((c.phone is not null and c.phone = a.phone_normalized) or c.emails && a.emails)
  order by c.created_at desc;
$$;

-- ---------------------------------------------------------------------------
-- Démos

create function public.commercial_request_demo(p_declaration uuid, p_note text, p_photos text[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.commerciaux := public.commercial_me('work');
  d public.commercial_declarations := public.commercial_my_active(p_declaration);
  v_id uuid;
begin
  if exists (
    select 1 from unnest(coalesce(p_photos, '{}')) p where p not like me.id::text || '/demos/%'
  ) then
    raise exception 'Photos invalides.';
  end if;
  insert into public.commercial_demo_requests (declaration_id, note, photos)
  values (d.id, nullif(btrim(p_note), ''), coalesce(p_photos, '{}'))
  returning id into v_id;
  return v_id;
end;
$$;

-- Livrée par l'admin : lien sur la fiche, étape 2 cochée, commercial prévenu.
create function public.admin_deliver_demo(p_request uuid, p_url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  q public.commercial_demo_requests;
  d public.commercial_declarations;
begin
  perform public.admin_require();
  if nullif(btrim(p_url), '') is null then
    raise exception 'Indiquez le lien de la démo.';
  end if;
  update public.commercial_demo_requests
  set status = 'done', demo_url = btrim(p_url), done_at = now()
  where id = p_request and status = 'requested'
  returning * into q;
  if q.id is null then
    raise exception 'Demande introuvable ou déjà traitée.';
  end if;
  select * into d from public.commercial_declarations where id = q.declaration_id;
  if d.status in ('pending', 'confirmed') then
    update public.commercial_declarations
    set step_done_at = step_done_at || jsonb_build_object('2', coalesce(step_done_at -> '2', to_jsonb(now())))
    where id = d.id;
    perform public.commercial_reflect(d.id);
  end if;
  insert into public.commercial_emails (commercial_id, declaration_id, kind, detail)
  values (d.commercial_id, d.id, 'demo_ready', btrim(p_url));
end;
$$;

-- ---------------------------------------------------------------------------
-- Google Places et « Autour de moi »

-- Compte une recherche Google du jour ; sans quota réglé, la recherche
-- Google est fermée (elle coûte au-delà de la limite gratuite).
create function public.commercial_count_places()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.commerciaux := public.commercial_me('work');
  v_quota int := (public.commercial_cfg()).places_daily_quota;
  v_used int;
begin
  if v_quota is null then
    raise exception 'La recherche Google n''est pas ouverte.';
  end if;
  insert into public.commercial_quota_usage (commercial_id, day, places)
  values (me.id, (now() at time zone 'Europe/Paris')::date, 1)
  on conflict (commercial_id, day) do update
    set places = public.commercial_quota_usage.places + 1
  returning places into v_used;
  if v_used > v_quota then
    raise exception 'Vous avez atteint le nombre de recherches Google du jour. Réessayez demain.';
  end if;
end;
$$;

-- Une fiche venue de Google garde son identifiant : l'index (source,
-- external_id) bloque le doublon exact, et la fiche existante est rendue.
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
  v_place text := nullif(btrim(p ->> 'external_id'), '');
  v_existing uuid;
begin
  if v_name is null or v_name = '' then
    raise exception 'Le nom du restaurant est obligatoire.';
  end if;
  if v_place is not null then
    select id into v_existing from public.crm_restaurants
    where source = 'google_places' and external_id = v_place;
    if v_existing is not null then
      return v_existing;
    end if;
  end if;
  insert into public.crm_restaurants (
    id, name, slug, category, cuisine, address, city, postal_code, phone, website,
    google_maps_url, latitude, longitude, source, external_id)
  values (
    v_id, v_name, public.crm_restaurant_slug(v_name, v_id),
    coalesce((p ->> 'category')::public.crm_restaurant_category, 'restaurant'),
    nullif(btrim(p ->> 'cuisine'), ''), nullif(btrim(p ->> 'address'), ''),
    nullif(btrim(p ->> 'city'), ''), nullif(btrim(p ->> 'postal_code'), ''),
    nullif(btrim(p ->> 'phone'), ''), nullif(btrim(p ->> 'website'), ''),
    nullif(btrim(p ->> 'google_maps_url'), ''),
    (p ->> 'latitude')::double precision, (p ->> 'longitude')::double precision,
    case when v_place is not null then 'google_places' else 'commercial' end, v_place);
  return v_id;
end;
$$;

-- Restaurants autour d'un point, dans le rayon réglé ; compte comme une
-- recherche (même quota, même plafond de résultats).
create function public.commercial_nearby(p_lat double precision, p_lng double precision)
returns table (
  id uuid, name text, address text, latitude double precision, longitude double precision,
  category public.crm_restaurant_category, state jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.commerciaux := public.commercial_me('work');
  v_limit int := public.commercial_search_limit();
  v_radius int := (public.commercial_cfg()).nearby_radius_m;
begin
  if v_radius is null then
    raise exception 'La carte n''est pas encore ouverte : Ominin doit en régler le rayon.';
  end if;
  perform public.commercial_count_search(me.id);
  return query
    select r.id, r.name, r.address, r.latitude, r.longitude, r.category, public.commercial_state(r, me.id)
    from public.crm_restaurants r
    where r.deleted_at is null and r.latitude is not null and r.longitude is not null
      and extensions.st_dwithin(
        extensions.st_setsrid(extensions.st_makepoint(r.longitude, r.latitude), 4326)::extensions.geography,
        extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
        v_radius)
    order by extensions.st_distance(
        extensions.st_setsrid(extensions.st_makepoint(r.longitude, r.latitude), 4326)::extensions.geography,
        extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography)
    limit v_limit;
end;
$$;

create function public.commercial_set_push_prefs(p_prefs jsonb)
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
    where e.key not in ('relance', 'rdv', 'demo', 'inscription', 'expiration', 'releve')
       or jsonb_typeof(e.value) <> 'boolean'
  ) then
    raise exception 'Préférences invalides.';
  end if;
  update public.commerciaux set push_prefs = p_prefs where id = me.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Fusion de deux fiches du même restaurant. La perdante est retirée
-- (deleted_at, merged_into) ; déclarations, interlocuteurs et journal la
-- quittent ; crm_leads et outreach_prospects gardent la ligne la plus
-- avancée. Deux déclarations actives : la première confirmée l'emporte,
-- l'autre est close (motif « fusion ») et son commercial prévenu.
create function public.admin_merge_restaurants(p_keep uuid, p_drop uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  keep_d public.commercial_declarations;
  drop_d public.commercial_declarations;
  loser public.commercial_declarations;
  keep_lead public.crm_leads;
  drop_lead public.crm_leads;
begin
  perform public.admin_require();
  if p_keep = p_drop or nullif(btrim(p_note), '') is null then
    raise exception 'Une fusion porte sur deux fiches différentes et se motive.';
  end if;
  perform 1 from public.crm_restaurants where id in (p_keep, p_drop) and deleted_at is null for update;
  perform public.commercial_settle(p_keep);
  perform public.commercial_settle(p_drop);
  select * into keep_d from public.commercial_declarations
  where restaurant_id = p_keep and status in ('pending', 'confirmed');
  select * into drop_d from public.commercial_declarations
  where restaurant_id = p_drop and status in ('pending', 'confirmed');

  if keep_d.id is not null and drop_d.id is not null then
    loser := case
      when (coalesce(keep_d.confirmed_at, 'infinity'), keep_d.declared_at)
           <= (coalesce(drop_d.confirmed_at, 'infinity'), drop_d.declared_at)
        then drop_d else keep_d end;
    update public.commercial_declarations
    set status = 'abandoned', end_reason = 'merged', decision_note = btrim(p_note), ended_at = now()
    where id = loser.id;
    insert into public.commercial_emails (commercial_id, declaration_id, kind, detail)
    values (loser.commercial_id, loser.id, 'released', 'merged');
  end if;

  update public.commercial_declarations set restaurant_id = p_keep where restaurant_id = p_drop;
  update public.crm_contacts set restaurant_id = p_keep where restaurant_id = p_drop;
  update public.crm_activities set restaurant_id = p_keep, lead_id = null where restaurant_id = p_drop;
  update public.crm_tasks set restaurant_id = p_keep, lead_id = null where restaurant_id = p_drop;
  update public.crm_appointments set restaurant_id = p_keep where restaurant_id = p_drop;

  select * into keep_lead from public.crm_leads where restaurant_id = p_keep;
  select * into drop_lead from public.crm_leads where restaurant_id = p_drop;
  if drop_lead.status between 'to_contact' and 'signed' and drop_lead.status > keep_lead.status then
    perform set_config('ominin.crm_reflect', 'on', true);
    update public.crm_leads
    set status = drop_lead.status, priority = drop_lead.priority,
        target_products = drop_lead.target_products, last_contact_at = drop_lead.last_contact_at
    where id = keep_lead.id;
    perform set_config('ominin.crm_reflect', 'off', true);
  end if;
  if not exists (select 1 from public.outreach_prospects where restaurant_id = p_keep) then
    update public.outreach_prospects set restaurant_id = p_keep where restaurant_id = p_drop;
  end if;

  update public.crm_restaurants set deleted_at = now(), merged_into = p_keep where id = p_drop;
  select * into keep_d from public.commercial_declarations
  where restaurant_id = p_keep and status in ('pending', 'confirmed');
  if keep_d.id is not null then
    perform public.commercial_reflect(keep_d.id);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Droits
do $$
declare
  v_fn text;
begin
  foreach v_fn in array array[
    'commercial_signup_link(uuid)',
    'signup_link_claim(text, public.ominin_product)',
    'commercial_request_demo(uuid, text, text[])',
    'commercial_count_places()',
    'commercial_nearby(double precision, double precision)',
    'commercial_set_push_prefs(jsonb)',
    'admin_add_client(uuid, uuid, uuid)',
    'admin_validate_client(uuid)',
    'admin_signup_matches()',
    'admin_deliver_demo(uuid, text)',
    'admin_merge_restaurants(uuid, uuid, text)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', v_fn);
    execute format('grant execute on function public.%s to authenticated', v_fn);
  end loop;
end $$;

revoke execute on function public.signup_link_info(text) from public;
grant execute on function public.signup_link_info(text) to anon, authenticated;
