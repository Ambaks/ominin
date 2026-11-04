-- La table d'une bulle sans réservation, ouverte par l'accueil. Par défaut,
-- le menu QR d'une bulle ne commande qu'une fois une réservation entièrement
-- payée et son créneau commencé ; des clients assis sans réservation restent
-- bloqués. Le gérant ou le serveur peut désormais ouvrir la table : elle
-- commande alors comme une table normale, jusqu'à la fin du créneau en cours
-- (entre deux créneaux, jusqu'à la fin du suivant), puis se referme d'elle-même.
--
-- Une réservation tenue (confirmée ou arrivée) dont le créneau a commencé garde
-- ses règles : une table ouverte ne dispense personne de payer sa bulle. On
-- n'ouvre pas une table dont la bulle est réservée sur la période.
--
-- Rien n'est ouvert ici : la colonne naît vide.

alter table public.bulles add column table_ouverte_jusqua timestamptz;

-- La fin du créneau en cours de l'établissement, ou du suivant : la première
-- fin de créneau à venir. Un créneau déborde d'au plus deux jours sur la nuit
-- (start_minutes < 2880) et revient chaque semaine : on regarde de deux jours
-- avant aujourd'hui à une semaine après.
create function public.bulle_fin_ouverture(p_etab uuid)
returns timestamptz
language sql
stable
set search_path = public
as $$
  select min(bulle_debut(d.day::date, c.start_minutes) + make_interval(mins => g.duration_minutes))
  from bulle_reglages g
  join bulle_creneaux c on c.etablissement_id = g.etablissement_id
  cross join lateral generate_series(
    (now() at time zone 'Europe/Paris')::date - 2,
    (now() at time zone 'Europe/Paris')::date + 7,
    interval '1 day'
  ) as d(day)
  where g.etablissement_id = p_etab
    and extract(isodow from d.day) = c.weekday
    and bulle_debut(d.day::date, c.start_minutes) + make_interval(mins => g.duration_minutes) > now();
$$;

revoke execute on function public.bulle_fin_ouverture(uuid) from public, anon, authenticated;

-- L'accueil ouvre ou referme la table d'une bulle. Rend la fin de l'ouverture
-- (null une fois refermée).
create function public.ouvrir_table_bulle(p_bulle uuid, p_ouvrir boolean)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bulle bulles;
  v_fin timestamptz;
begin
  select * into v_bulle from bulles where id = p_bulle;
  if v_bulle.id is null
     or (current_member_role(v_bulle.etablissement_id) in ('gerant', 'serveur') is not true
         and not bulle_demo_service(v_bulle.etablissement_id)) then
    raise exception 'Accès refusé.' using errcode = '42501';
  end if;
  if not p_ouvrir then
    update bulles set table_ouverte_jusqua = null where id = p_bulle;
    return null;
  end if;
  if v_bulle.table_id is null or not v_bulle.active then
    raise exception 'Cette bulle n''a pas de table en service.';
  end if;
  v_fin := bulle_fin_ouverture(v_bulle.etablissement_id);
  if v_fin is null then
    raise exception 'Aucun créneau à venir : la table ne peut pas s''ouvrir.';
  end if;
  if not bulle_libre(p_bulle, now(), v_fin) then
    raise exception '% est réservée sur ce créneau : la table suit la réservation.', v_bulle.name;
  end if;
  update bulles set table_ouverte_jusqua = v_fin where id = p_bulle;
  return v_fin;
end;
$$;

revoke execute on function public.ouvrir_table_bulle(uuid, boolean) from public, anon;
grant execute on function public.ouvrir_table_bulle(uuid, boolean) to authenticated, service_role;

-- La table commande-t-elle ? Une réservation tenue qui concerne la table
-- (créneau commencé ou arrivée cochée) décide : tout payé et créneau commencé.
-- Sinon, la table commande tant que l'accueil l'a ouverte.
drop function public.bulle_commande_ouverte(public.bulle_reservations);

create function public.bulle_commande_ouverte(p_bulle public.bulles, p_reservation public.bulle_reservations)
returns boolean
language sql
stable
set search_path = public
as $$
  select case
    when p_reservation.status in ('confirmee', 'arrivee') and bulle_table_proche(p_reservation)
      then bulle_reste_cents(p_reservation) = 0 and p_reservation.starts_at <= now()
    else coalesce(p_bulle.table_ouverte_jusqua > now(), false)
  end;
$$;

revoke execute on function public.bulle_commande_ouverte(public.bulles, public.bulle_reservations)
  from public, anon, authenticated;

-- Le menu QR de la table dit aussi si l'accueil l'a ouverte. Ouverte, elle se
-- lit comme une table normale : un groupe encore en attente n'y paraît pas.
drop function public.bulle_table_etat(text, int);

create function public.bulle_table_etat(p_slug text, p_table int)
returns table (
  bulle_name text,
  bulle_color text,
  ordering boolean,
  reservation_status public.bulle_reservation_status,
  starts_at timestamptz,
  ends_at timestamptz,
  party_size smallint,
  places_paid smallint,
  place_cents int,
  reste_cents int,
  can_pay boolean,
  ouverte boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_bulle bulles;
  v_reservation bulle_reservations;
  v_ouverte boolean;
begin
  v_bulle := bulle_de_table(p_slug, p_table);
  if v_bulle.id is null then
    return;
  end if;
  v_reservation := bulle_reservation_courante(v_bulle.id);
  if not bulle_table_proche(v_reservation) then
    v_reservation := null;
  end if;
  v_ouverte := coalesce(v_bulle.table_ouverte_jusqua > now(), false)
    and coalesce(v_reservation.status not in ('confirmee', 'arrivee'), true);
  if v_ouverte then
    v_reservation := null;
  end if;
  return query select
    v_bulle.name,
    v_bulle.color,
    bulle_commande_ouverte(v_bulle, v_reservation),
    v_reservation.status,
    v_reservation.starts_at,
    v_reservation.ends_at,
    v_reservation.party_size,
    v_reservation.places_paid,
    v_reservation.place_cents,
    bulle_reste_cents(v_reservation),
    coalesce(bulle_table_payable(v_reservation), false),
    v_ouverte;
end;
$$;

revoke execute on function public.bulle_table_etat(text, int) from public;
grant execute on function public.bulle_table_etat(text, int) to anon, authenticated;

-- Le verrou du menu QR, en base, avec la table ouverte par l'accueil.
create or replace function public.orders_bulle_payee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bulle bulles;
  v_reservation bulle_reservations;
begin
  select * into v_bulle from bulles where table_id = new.table_id;
  if v_bulle.id is null or current_member_role(new.etablissement_id) is not null then
    return new;
  end if;
  v_reservation := bulle_reservation_courante(v_bulle.id);
  if bulle_commande_ouverte(v_bulle, v_reservation) then
    return new;
  end if;
  if coalesce(v_reservation.status in ('confirmee', 'arrivee') and bulle_table_proche(v_reservation), false) then
    raise exception 'Pour commander depuis la bulle, toutes les places du groupe doivent être payées.';
  end if;
  raise exception 'Pour commander depuis %, demandez à l''accueil d''ouvrir la table ou réservez la bulle.', v_bulle.name;
end;
$$;
