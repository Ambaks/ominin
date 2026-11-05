-- Ominin Club, cahier des charges de L'Étoile, étape 2 : le rapport financier
-- des acomptes, soirée par soirée, et l'historique des soirées passées.
--
-- Tout se compte depuis les paiements enregistrés (club_payments), un
-- paiement une seule fois, selon son état : payé, remboursé, ou en cours dans
-- son délai. Rien n'est estimé :
--   - acomptes encaissés : les paiements en ligne aboutis, remboursés compris
--     (ce qui est entré), puis les remboursements à part, et le net ;
--   - acomptes en attente : les paiements en ligne en cours dans leur délai ;
--   - acomptes attendus : encaissés nets + en attente ;
--   - sur place : ce que le club a encaissé sur une table (porte, caisse) ;
--   - prix des tables : le prévisionnel des réservations maintenues, et ce
--     qu'il en reste à encaisser.
-- Les frais Ominin sont à part, jamais mêlés à l'argent du club.
--
-- Une réservation en ligne dont le paiement n'a jamais abouti n'est pas une
-- réservation : elle ne compte pas (une attente encore dans son délai compte
-- seulement dans « en attente »). Ce rapport ne remplace pas le chiffre
-- d'affaires de la soirée (le bar, les consommations hors table).
--
-- Réservé à la direction (le gérant).

-- Une ligne par réservation de la soirée, avec ce qu'elle a vraiment payé.
create function public.club_rapport_lignes(p_event uuid)
returns table (
  booking_id uuid,
  name text,
  zone_id uuid,
  zone_name text,
  table_label text,
  source public.club_booking_source,
  status public.club_booking_status,
  etat text,
  party_size int,
  price_cents int,
  en_ligne_cents int,
  rembourse_cents int,
  en_attente_cents int,
  sur_place_cents int,
  frais_cents int,
  reste_cents int,
  created_at timestamptz,
  arrived_at timestamptz
)
language sql
stable
set search_path = public
as $$
  select
    b.id, b.name, b.zone_id, z.name, t.label, b.source, b.status,
    case
      when b.status = 'en_attente' and b.hold_expires_at is not null then 'en_cours'
      when b.status in ('arrivee', 'assise', 'partie') then 'honoree'
      when b.status in ('payee', 'en_attente') then 'confirmee'
      when b.status = 'remboursee' then 'remboursee'
      else 'annulee'
    end,
    b.party_size, b.price_cents,
    coalesce(sum(p.amount_cents) filter (where p.method = 'en_ligne' and p.status in ('payee', 'remboursee')), 0)::int,
    coalesce(sum(p.amount_cents) filter (where p.method = 'en_ligne' and p.status = 'remboursee'), 0)::int,
    coalesce(sum(p.amount_cents) filter (
      where p.method = 'en_ligne' and p.status = 'en_attente' and p.hold_expires_at > now()
    ), 0)::int,
    coalesce(sum(p.amount_cents) filter (where p.method = 'sur_place' and p.status = 'payee'), 0)::int,
    coalesce(sum(p.fee_cents) filter (where p.method = 'en_ligne' and p.status = 'payee'), 0)::int,
    case when b.status in ('payee', 'en_attente', 'arrivee', 'assise', 'partie')
      and not (b.status = 'en_attente' and b.hold_expires_at is not null)
      then greatest(b.price_cents - b.paid_cents, 0) else 0 end,
    b.created_at, b.arrived_at
  from club_bookings b
  join club_zones z on z.id = b.zone_id
  left join club_tables t on t.id = b.table_id
  left join club_payments p on p.booking_id = b.id
  where b.event_id = p_event
    -- Un paiement en ligne jamais abouti : pas une réservation, sauf s'il
    -- est encore dans son délai.
    and not (
      b.source = 'en_ligne' and b.paid_at is null
      and not (b.status = 'en_attente' and b.hold_expires_at > now())
    )
  group by b.id, z.name, t.label;
$$;

revoke execute on function public.club_rapport_lignes(uuid) from public, anon, authenticated;

-- Les totaux d'un ensemble de lignes : les mêmes pour la soirée et pour
-- chaque zone.
create function public.club_rapport_totaux(p_lignes jsonb)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'reservations', count(*) filter (where l ->> 'etat' <> 'en_cours'),
    'confirmees', count(*) filter (where l ->> 'etat' in ('confirmee', 'honoree')),
    'honorees', count(*) filter (where l ->> 'etat' = 'honoree'),
    'annulees', count(*) filter (where l ->> 'etat' in ('annulee', 'remboursee')),
    'en_cours', count(*) filter (where l ->> 'etat' = 'en_cours'),
    'personnes', coalesce(sum((l ->> 'party_size')::int) filter (where l ->> 'etat' in ('confirmee', 'honoree')), 0),
    'acomptes_encaisses_cents', coalesce(sum((l ->> 'en_ligne_cents')::int), 0),
    'acomptes_rembourses_cents', coalesce(sum((l ->> 'rembourse_cents')::int), 0),
    'acomptes_nets_cents', coalesce(sum((l ->> 'en_ligne_cents')::int - (l ->> 'rembourse_cents')::int), 0),
    'acomptes_en_attente_cents', coalesce(sum((l ->> 'en_attente_cents')::int), 0),
    'acomptes_attendus_cents', coalesce(sum(
      (l ->> 'en_ligne_cents')::int - (l ->> 'rembourse_cents')::int + (l ->> 'en_attente_cents')::int
    ), 0),
    'sur_place_cents', coalesce(sum((l ->> 'sur_place_cents')::int), 0),
    'previsionnel_cents', coalesce(sum((l ->> 'price_cents')::int) filter (where l ->> 'etat' in ('confirmee', 'honoree')), 0),
    'reste_cents', coalesce(sum((l ->> 'reste_cents')::int), 0),
    'frais_cents', coalesce(sum((l ->> 'frais_cents')::int), 0)
  )
  from jsonb_array_elements(coalesce(p_lignes, '[]'::jsonb)) l;
$$;

revoke execute on function public.club_rapport_totaux(jsonb) from public, anon, authenticated;

-- Le rapport d'une soirée : ses totaux, ses zones, ses réservations et
-- l'historique de ses paiements et remboursements.
create function public.club_rapport(p_event uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_event club_events;
  v_lignes jsonb;
begin
  select * into v_event from club_events where id = p_event;
  if v_event.id is null or current_member_role(v_event.etablissement_id) is distinct from 'gerant' then
    raise exception 'Accès refusé.' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(to_jsonb(l) order by l.zone_name, l.table_label nulls last, l.created_at), '[]'::jsonb)
  into v_lignes
  from club_rapport_lignes(p_event) l;

  return jsonb_build_object(
    'genere_le', now(),
    'totaux', club_rapport_totaux(v_lignes),
    'zones', coalesce((
      select jsonb_agg(
        jsonb_build_object('zone_id', z.id, 'name', z.name)
          || club_rapport_totaux((
            select jsonb_agg(l) from jsonb_array_elements(v_lignes) l
            where (l ->> 'zone_id')::uuid = z.id
          ))
        order by z.sort, z.name
      )
      from club_zones z
      where z.etablissement_id = v_event.etablissement_id
        and exists (select 1 from jsonb_array_elements(v_lignes) l where (l ->> 'zone_id')::uuid = z.id)
    ), '[]'::jsonb),
    'reservations', v_lignes,
    'paiements', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'booking_id', p.booking_id, 'name', p.name, 'organiser', p.organiser,
        'method', p.method, 'status', p.status, 'amount_cents', p.amount_cents,
        'fee_cents', p.fee_cents, 'paid_at', p.paid_at, 'refunded_at', p.refunded_at
      ) order by coalesce(p.paid_at, p.created_at))
      from club_payments p
      join club_bookings b on b.id = p.booking_id
      where b.event_id = p_event and p.status in ('payee', 'remboursee')
    ), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.club_rapport(uuid) from public, anon;
grant execute on function public.club_rapport(uuid) to authenticated;

-- L'historique : les soirées commencées du club, la plus récente d'abord,
-- avec leurs totaux, page par page (recherche sur le titre).
create function public.club_rapports(
  p_etablissement uuid,
  p_search text,
  p_limit int,
  p_offset int
)
returns table (event_id uuid, title text, starts_at timestamptz, cancelled boolean, totaux jsonb, total_count bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if current_member_role(p_etablissement) is distinct from 'gerant' then
    raise exception 'Accès refusé.' using errcode = '42501';
  end if;
  return query
  with soirees as (
    select e.id, e.title, e.starts_at, e.cancelled_at is not null as cancelled, count(*) over () as total_count
    from club_events e
    where e.etablissement_id = p_etablissement
      and e.starts_at <= now()
      and (coalesce(btrim(p_search), '') = '' or e.title ilike '%' || btrim(p_search) || '%')
    order by e.starts_at desc
    limit p_limit offset p_offset
  )
  select s.id, s.title, s.starts_at, s.cancelled,
    club_rapport_totaux((select jsonb_agg(to_jsonb(l)) from club_rapport_lignes(s.id) l)),
    s.total_count
  from soirees s
  order by s.starts_at desc;
end;
$$;

revoke execute on function public.club_rapports(uuid, text, int, int) from public, anon;
grant execute on function public.club_rapports(uuid, text, int, int) to authenticated;
