-- Ominin Club, cahier des charges de L'Étoile, étape 5 : le journal des
-- actions. Qui a fait quoi, quand, sur quelle réservation, quelle soirée ou
-- quel membre de l'équipe.
--
-- La base l'écrit elle-même, par des triggers sur les tables qui changent :
-- aucune fonction, route ou écran ne peut l'oublier, y compris ceux qui
-- viendront. L'acteur :
--   - un membre : la session (auth.uid()), ou, pour une route serveur qui
--     agit en service_role au nom du gérant (remboursement, soirée annulée),
--     l'en-tête x-ominin-acteur, cru seulement d'une requête service_role ;
--     son nom et son poste sont figés au moment de l'action ;
--   - le client : une réservation en ligne, un paiement en ligne abouti ;
--   - le système : le reste sans session (remboursement fait dans Stripe).
-- Le bruit ne s'écrit pas : une réservation en ligne n'existe qu'à son
-- premier paiement, et une attente de paiement qui tombe (expirée, rendue)
-- ne laisse rien. Les retouches d'une soirée en brouillon non plus : elle ne
-- se journalise qu'à sa création, puis une fois publiée.
--
-- Lecture : la direction seule. Écriture : les triggers seuls.

create type public.club_journal_acteur as enum ('membre', 'client', 'systeme');

create type public.club_journal_action as enum (
  'reservation',          -- créée (en ligne à son premier paiement, téléphone, sur place)
  'modification',         -- colonnes changées : { champs: { col: [avant, après] } }
  'statut',               -- arrivée, installée, départ et retours : { avant, apres }
  'placement',            -- placée ou déplacée : { avant: {zone, table}, apres: {zone, table} }
  'annulation',
  'remboursement',        -- la table close, remboursée
  'encaissement',         -- un paiement sur place
  'paiement',             -- un paiement en ligne abouti (table, acompte, part)
  'paiement_rembourse',
  'paiement_retabli',     -- remboursement refusé par Stripe, le paiement compte à nouveau
  'soiree',               -- créée
  'soiree_modifiee',
  'publication',
  'depublication',
  'soiree_annulee',
  'prix',                 -- une zone mise en vente, retirée ou à un autre prix ce soir-là
  'poste',                -- un membre arrive, change de poste ou part
  'droits'                -- les droits d'un poste
);

create table public.club_journal (
  id bigint generated always as identity primary key,
  etablissement_id uuid not null references public.etablissements (id) on delete cascade,
  created_at timestamptz not null default now(),
  acteur public.club_journal_acteur not null,
  acteur_id uuid,
  acteur_nom text,
  -- 'gerant', un poste du club, ou le rôle d'un membre sans poste.
  acteur_poste text,
  action public.club_journal_action not null,
  -- Sans clés étrangères : le journal survit à ce qu'il raconte.
  event_id uuid,
  booking_id uuid,
  membre_id uuid,
  -- Le client, la soirée ou le membre, tel qu'il s'appelait alors.
  cible text,
  details jsonb not null default '{}'::jsonb
);

create index club_journal_etablissement_idx
  on public.club_journal (etablissement_id, created_at desc, id desc);
create index club_journal_event_idx
  on public.club_journal (event_id, created_at desc, id desc) where event_id is not null;
create index club_journal_booking_idx
  on public.club_journal (booking_id) where booking_id is not null;

alter table public.club_journal enable row level security;

create policy "gerant read" on public.club_journal
  for select to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant');

revoke all on public.club_journal from public, anon, authenticated, service_role;
grant select on public.club_journal to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Écrire une entrée

create function public.club_journal_ecrire(
  p_etablissement uuid,
  p_action public.club_journal_action,
  p_client boolean,
  p_event uuid,
  p_booking uuid,
  p_membre uuid,
  p_cible text,
  p_details jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_header text;
  v_nom text;
  v_poste text;
begin
  if v_uid is null and auth.jwt() ->> 'role' = 'service_role' then
    v_header := nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-ominin-acteur';
    if v_header ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      v_uid := v_header::uuid;
    end if;
  end if;
  if v_uid is not null then
    select coalesce(nullif(btrim(m.display_name), ''), m.email),
      case when m.role = 'gerant' then 'gerant' else coalesce(m.club_role::text, m.role::text) end
    into v_nom, v_poste
    from memberships m
    where m.user_id = v_uid and m.etablissement_id = p_etablissement;
    if v_nom is null then
      select email into v_nom from auth.users where id = v_uid;
    end if;
  end if;

  insert into club_journal (
    etablissement_id, acteur, acteur_id, acteur_nom, acteur_poste, action,
    event_id, booking_id, membre_id, cible, details
  ) values (
    p_etablissement,
    case when v_uid is not null then 'membre' when p_client then 'client' else 'systeme' end::club_journal_acteur,
    v_uid, v_nom, v_poste, p_action, p_event, p_booking, p_membre, p_cible,
    coalesce(p_details, '{}'::jsonb)
  );
end;
$$;

revoke execute on function public.club_journal_ecrire(
  uuid, public.club_journal_action, boolean, uuid, uuid, uuid, text, jsonb
) from public, anon, authenticated;

-- Une place telle que l'équipe la lit : sa zone, sa table s'il y en a une.
create function public.club_journal_place(p_zone uuid, p_table uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'zone', (select name from club_zones where id = p_zone),
    'table', (select label from club_tables where id = p_table)
  );
$$;

revoke execute on function public.club_journal_place(uuid, uuid) from public, anon, authenticated;

-- Ce qui a changé entre deux lignes, hors colonnes ignorées :
-- { colonne: [avant, après] }, null si rien.
create function public.club_journal_diff(p_avant jsonb, p_apres jsonb, p_ignore text[])
returns jsonb
language sql
immutable
as $$
  select jsonb_object_agg(n.key, jsonb_build_array(p_avant -> n.key, n.value))
  from jsonb_each(p_apres - p_ignore) n
  where (p_avant -> n.key) is distinct from n.value;
$$;

revoke execute on function public.club_journal_diff(jsonb, jsonb, text[]) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Réservations

create function public.club_journal_reservation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_champs jsonb;
begin
  if tg_op = 'INSERT' then
    -- En ligne, la réservation s'écrit avec son premier paiement
    -- (club_journal_paiement).
    if new.source <> 'en_ligne' then
      perform club_journal_ecrire(
        new.etablissement_id, 'reservation', false, new.event_id, new.id, null, new.name,
        jsonb_build_object('source', new.source, 'personnes', new.party_size, 'statut', new.status)
          || club_journal_place(new.zone_id, new.table_id)
      );
    end if;
    return null;
  end if;

  -- Une attente de paiement en ligne qui tombe : rien ne s'est passé ;
  -- qui aboutit, ou l'acompte demandé par le club qui se paie : son paiement
  -- la raconte.
  if old.status = 'en_attente' and (
    (old.hold_expires_at is not null and new.status in ('annulee', 'payee'))
    or (new.status = 'payee' and new.paid_cents > old.paid_cents)
  ) then
    return null;
  end if;

  if new.status is distinct from old.status then
    perform club_journal_ecrire(
      new.etablissement_id,
      case new.status when 'annulee' then 'annulation' when 'remboursee' then 'remboursement' else 'statut' end::club_journal_action,
      false, new.event_id, new.id, null, new.name,
      jsonb_build_object('avant', old.status, 'apres', new.status)
    );
  end if;

  if new.table_id is distinct from old.table_id or new.zone_id is distinct from old.zone_id then
    perform club_journal_ecrire(
      new.etablissement_id, 'placement', false, new.event_id, new.id, null, new.name,
      jsonb_build_object(
        'avant', club_journal_place(old.zone_id, old.table_id),
        'apres', club_journal_place(new.zone_id, new.table_id)
      )
    );
  end if;

  -- Le reste de la ligne (nom, téléphone, personnes, note, prix…), sauf ce
  -- que les gestes ci-dessus racontent déjà et la tenue des comptes.
  v_champs := club_journal_diff(to_jsonb(old), to_jsonb(new), array[
    'id', 'etablissement_id', 'event_id', 'token', 'share_token', 'status', 'table_id', 'zone_id',
    'paid_cents', 'paid_at', 'arrived_at', 'seated_at', 'left_at', 'cancelled_at', 'refunded_at',
    'hold_expires_at', 'created_at'
  ]);
  -- L'acompte demandé s'efface quand il est payé : le paiement le raconte déjà.
  if new.acompte_demande_cents is null then
    v_champs := nullif(v_champs - 'acompte_demande_cents', '{}'::jsonb);
  end if;
  if v_champs is not null then
    perform club_journal_ecrire(
      new.etablissement_id, 'modification', false, new.event_id, new.id, null, new.name,
      jsonb_build_object('champs', v_champs)
    );
  end if;
  return null;
end;
$$;

create trigger club_bookings_journal_insert
  after insert on public.club_bookings
  for each row execute function public.club_journal_reservation();
create trigger club_bookings_journal_update
  after update on public.club_bookings
  for each row when (old.* is distinct from new.*)
  execute function public.club_journal_reservation();

-- ---------------------------------------------------------------------------
-- Paiements

create function public.club_journal_paiement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking club_bookings;
  v_action club_journal_action;
  v_details jsonb;
begin
  v_action := case
    when tg_op = 'INSERT' and new.status = 'payee' and new.method = 'sur_place' then 'encaissement'
    when tg_op = 'UPDATE' and old.status = 'en_attente' and new.status = 'payee' then
      case new.method when 'en_ligne' then 'paiement' else 'encaissement' end
    when tg_op = 'UPDATE' and old.status = 'payee' and new.status = 'remboursee' then 'paiement_rembourse'
    when tg_op = 'UPDATE' and old.status = 'remboursee' and new.status = 'payee' then 'paiement_retabli'
  end::club_journal_action;
  if v_action is null then
    return null;
  end if;
  select * into v_booking from club_bookings where id = new.booking_id;
  v_details := jsonb_build_object(
    'montant', new.amount_cents, 'frais', new.fee_cents, 'methode', new.method,
    'payeur', new.name, 'organisateur', new.organiser
  );
  -- Le premier paiement en ligne de l'organisateur fait la réservation : une
  -- seule entrée, « réservée en ligne », avec ce qu'il a payé.
  if v_action = 'paiement' and new.organiser and v_booking.source = 'en_ligne'
     and not exists (
       select 1 from club_payments
       where booking_id = new.booking_id and id <> new.id and status in ('payee', 'remboursee')
     ) then
    v_action := 'reservation';
    v_details := v_details
      || jsonb_build_object('source', v_booking.source, 'personnes', v_booking.party_size)
      || club_journal_place(v_booking.zone_id, v_booking.table_id);
  end if;
  perform club_journal_ecrire(
    new.etablissement_id, v_action, v_action in ('paiement', 'reservation'), v_booking.event_id,
    new.booking_id, null, v_booking.name, v_details
  );
  return null;
end;
$$;

create trigger club_payments_journal_insert
  after insert on public.club_payments
  for each row when (new.status = 'payee')
  execute function public.club_journal_paiement();
create trigger club_payments_journal_update
  after update of status on public.club_payments
  for each row when (old.status is distinct from new.status)
  execute function public.club_journal_paiement();

-- ---------------------------------------------------------------------------
-- Soirées

create function public.club_journal_soiree()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_champs jsonb;
begin
  if tg_op = 'INSERT' then
    perform club_journal_ecrire(
      new.etablissement_id, 'soiree', false, new.id, null, null, new.title,
      jsonb_build_object('debut', new.starts_at, 'fin', new.ends_at, 'publiee', new.published)
    );
    return null;
  end if;

  if new.cancelled_at is not null and old.cancelled_at is null then
    perform club_journal_ecrire(new.etablissement_id, 'soiree_annulee', false, new.id, null, null, new.title, '{}');
    return null;
  end if;
  if new.published is distinct from old.published then
    perform club_journal_ecrire(
      new.etablissement_id,
      case when new.published then 'publication' else 'depublication' end::club_journal_action,
      false, new.id, null, null, new.title, '{}'
    );
  end if;
  -- Un brouillon se retouche librement ; une soirée en vente, non.
  if old.published and new.published then
    v_champs := club_journal_diff(to_jsonb(old), to_jsonb(new), array[
      'id', 'etablissement_id', 'published', 'cancelled_at', 'created_at', 'updated_at'
    ]);
    if v_champs is not null then
      perform club_journal_ecrire(
        new.etablissement_id, 'soiree_modifiee', false, new.id, null, null, new.title,
        jsonb_build_object('champs', v_champs)
      );
    end if;
  end if;
  return null;
end;
$$;

create trigger club_events_journal_insert
  after insert on public.club_events
  for each row execute function public.club_journal_soiree();
create trigger club_events_journal_update
  after update on public.club_events
  for each row when (old.* is distinct from new.*)
  execute function public.club_journal_soiree();

-- Les zones en vente d'une soirée publiée, et leur prix ce soir-là (null :
-- celui de la zone). L'enregistrement de la soirée réécrit chaque zone :
-- seul un prix qui change compte.
create function public.club_journal_prix()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row club_event_zones := case when tg_op = 'DELETE' then old else new end;
  v_event club_events;
  v_zone club_zones;
begin
  select * into v_event from club_events where id = v_row.event_id;
  select * into v_zone from club_zones where id = v_row.zone_id;
  -- Une soirée ou une zone effacée emporte ses lignes : rien à raconter.
  if v_event.id is null or v_zone.id is null or not v_event.published then
    return null;
  end if;
  perform club_journal_ecrire(
    v_event.etablissement_id, 'prix', false, v_event.id, null, null, v_event.title,
    jsonb_build_object(
      'zone', v_zone.name,
      'avant', case when tg_op <> 'INSERT' then coalesce(old.price_cents, v_zone.price_cents) end,
      'apres', case when tg_op <> 'DELETE' then coalesce(new.price_cents, v_zone.price_cents) end
    )
  );
  return null;
end;
$$;

create trigger club_event_zones_journal_insert
  after insert or delete on public.club_event_zones
  for each row execute function public.club_journal_prix();
create trigger club_event_zones_journal_update
  after update on public.club_event_zones
  for each row when (old.price_cents is distinct from new.price_cents)
  execute function public.club_journal_prix();

-- ---------------------------------------------------------------------------
-- Équipe : postes et droits

-- Un membre arrive, change de poste ou part, dans un club (un établissement
-- qui a une salle ou les soirées).
create function public.club_journal_poste()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row memberships := case when tg_op = 'DELETE' then old else new end;
begin
  -- Le club entier effacé emporte ses membres : plus rien à écrire.
  if not exists (select 1 from etablissements where id = v_row.etablissement_id) then
    return null;
  end if;
  if not exists (select 1 from club_zones where etablissement_id = v_row.etablissement_id)
     and not exists (
       select 1 from etablissement_settings
       where etablissement_id = v_row.etablissement_id and features ->> 'soirees' = 'true'
     ) then
    return null;
  end if;
  perform club_journal_ecrire(
    v_row.etablissement_id, 'poste', false, null, null, v_row.user_id,
    coalesce(nullif(btrim(v_row.display_name), ''), v_row.email),
    jsonb_build_object(
      'avant', case when tg_op <> 'INSERT' then
        case when old.role = 'gerant' then 'gerant' else coalesce(old.club_role::text, old.role::text) end end,
      'apres', case when tg_op <> 'DELETE' then
        case when new.role = 'gerant' then 'gerant' else coalesce(new.club_role::text, new.role::text) end end
    )
  );
  return null;
end;
$$;

create trigger memberships_journal_insert
  after insert on public.memberships
  for each row execute function public.club_journal_poste();
create trigger memberships_journal_update
  after update of role, club_role on public.memberships
  for each row when (old.role is distinct from new.role or old.club_role is distinct from new.club_role)
  execute function public.club_journal_poste();
create trigger memberships_journal_delete
  after delete on public.memberships
  for each row execute function public.club_journal_poste();

create function public.club_journal_droits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform club_journal_ecrire(
    new.id, 'droits', false, null, null, null, null,
    jsonb_build_object('avant', old.club_droits, 'apres', new.club_droits)
  );
  return null;
end;
$$;

create trigger etablissements_journal_droits
  after update of club_droits on public.etablissements
  for each row when (old.club_droits is distinct from new.club_droits)
  execute function public.club_journal_droits();

-- ---------------------------------------------------------------------------
-- Lire

-- Le journal du club, le plus récent d'abord, page par page : une soirée
-- (p_event) ou tout le club, recherche sur le client, la soirée ou le membre
-- concerné et sur qui a agi.
create function public.club_journal_page(
  p_etablissement uuid,
  p_event uuid,
  p_search text,
  p_limit int,
  p_offset int
)
returns table (
  id bigint,
  created_at timestamptz,
  acteur public.club_journal_acteur,
  acteur_nom text,
  acteur_poste text,
  action public.club_journal_action,
  event_id uuid,
  booking_id uuid,
  membre_id uuid,
  cible text,
  details jsonb,
  event_title text,
  event_starts_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_search text := nullif(btrim(p_search), '');
begin
  if current_member_role(p_etablissement) is distinct from 'gerant' then
    raise exception 'Accès refusé.' using errcode = '42501';
  end if;
  return query
  select j.id, j.created_at, j.acteur, j.acteur_nom, j.acteur_poste, j.action, j.event_id,
    j.booking_id, j.membre_id, j.cible, j.details, e.title, e.starts_at, count(*) over ()
  from club_journal j
  left join club_events e on e.id = j.event_id
  where j.etablissement_id = p_etablissement
    and (p_event is null or j.event_id = p_event)
    and (v_search is null or j.cible ilike '%' || v_search || '%' or j.acteur_nom ilike '%' || v_search || '%')
  order by j.created_at desc, j.id desc
  limit p_limit offset p_offset;
end;
$$;

revoke execute on function public.club_journal_page(uuid, uuid, text, int, int) from public, anon;
grant execute on function public.club_journal_page(uuid, uuid, text, int, int) to authenticated;
