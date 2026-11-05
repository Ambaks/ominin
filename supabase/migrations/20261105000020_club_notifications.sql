-- Ominin Club, cahier des charges de L'Étoile, étape 4 : notifications push
-- des réservations sur les téléphones de l'équipe.
--
-- Les événements naissent en base, au moment où la réservation change
-- vraiment : une table réservée et confirmée en ligne (le paiement de
-- l'organisateur abouti), une réservation saisie par l'équipe, la part d'un
-- ami payée en ligne, une annulation, un remboursement, un changement de
-- table ou de nombre de personnes. Un déclencheur différé (à la validation
-- de la transaction, l'état final de la réservation est lu) écrit chaque
-- événement dans club_notifications, qui sert à la fois de file d'envoi et
-- d'historique. Le serveur Next (service_role, web-push) relève la file et
-- envoie : après un paiement (settle.ts), un remboursement (route refund,
-- webhook Stripe), ou un geste de l'équipe (route /api/club/notify, appelée
-- par la gestion après la fonction SQL).
--
-- Pourquoi en base plutôt qu'un appel « tel événement est arrivé » depuis le
-- navigateur : l'événement ne naît que d'un changement réel, une seule fois
-- (un paiement rejoué par le webhook et /api/club/verify ne change plus
-- rien, donc n'écrit rien), et ce que dit le navigateur ne fait jamais foi.
-- La route ne fait que vider la file : l'appeler deux fois n'envoie rien de
-- plus, et un appel perdu (onglet fermé) part avec le suivant.

-- ---------------------------------------------------------------------------
-- Préférences : ce que chaque membre reçoit

-- Une ligne par membre qui a réglé ses notifications de réservation (ou dont
-- la direction les a réglées) ; sans ligne, les défauts de son poste valent
-- (CLUB_NOTIF_DEFAULTS côté app, les mêmes à l'envoi).
create table public.club_notif_prefs (
  user_id uuid not null,
  etablissement_id uuid not null,
  -- Table réservée et confirmée en ligne.
  en_ligne boolean not null,
  -- Réservation saisie par l'équipe (téléphone, porte).
  manuelle boolean not null,
  -- Part payée en ligne (l'ami d'une table partagée).
  acompte boolean not null,
  -- Annulation, remboursement, table ou nombre de personnes changé.
  modification boolean not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, etablissement_id),
  foreign key (user_id, etablissement_id)
    references public.memberships (user_id, etablissement_id) on delete cascade
);

alter table public.club_notif_prefs enable row level security;

-- Chacun règle les siennes ; la direction choisit pour toute l'équipe.
create policy "own or direction" on public.club_notif_prefs
  for all to authenticated
  using (
    user_id = (select auth.uid())
    or public.current_member_role(etablissement_id) = 'gerant'
  )
  with check (
    user_id = (select auth.uid())
    or public.current_member_role(etablissement_id) = 'gerant'
  );

-- ---------------------------------------------------------------------------
-- File d'envoi et historique

create table public.club_notifications (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null
    references public.etablissements (id) on delete cascade,
  booking_id uuid not null references public.club_bookings (id) on delete cascade,
  event_id uuid not null references public.club_events (id) on delete cascade,
  -- Le paiement concerné : la part d'un ami payée ou remboursée.
  payment_id uuid references public.club_payments (id) on delete cascade,
  kind text not null check (kind in (
    'confirmee', 'manuelle', 'acompte', 'annulee', 'remboursee',
    'part_remboursee', 'deplacee', 'modifiee'
  )),
  -- Un envoi par réservation et par événement (par paiement pour une part) ;
  -- null pour un changement de table ou de taille, qui peut se répéter.
  dedup_key text unique,
  -- La réservation telle qu'elle était à cet instant (club_notif_details) :
  -- le contenu de la notification et de l'historique.
  details jsonb not null,
  -- Qui a fait le geste (null : le client, Stripe) : il n'est pas sonné.
  actor uuid,
  -- Les membres concernés, selon leurs préférences au moment de l'envoi :
  -- leur historique. Null tant que la file n'est pas relevée.
  recipients uuid[],
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index club_notifications_etablissement_idx
  on public.club_notifications (etablissement_id, created_at desc);
create index club_notifications_file_idx
  on public.club_notifications (etablissement_id)
  where sent_at is null;
create index club_notifications_booking_idx on public.club_notifications (booking_id);

alter table public.club_notifications enable row level security;

-- La direction voit tout ; un membre, ce qui lui était destiné. L'écriture
-- est réservée au déclencheur et au service_role.
create policy "direction or recipient read" on public.club_notifications
  for select to authenticated
  using (
    public.current_member_role(etablissement_id) = 'gerant'
    or (
      (select auth.uid()) = any (recipients)
      and etablissement_id in (select public.member_etablissements())
    )
  );

-- ---------------------------------------------------------------------------
-- Contenu

-- Ce que dit une notification de réservation : le client, la soirée, la
-- zone et la table, le nombre de personnes, l'acompte, et le payeur d'une
-- part. L'heure d'arrivée prévue s'ajoutera ici quand la réservation la
-- portera (étape « heure d'arrivée ») : clé « arrivee_prevue », déjà lue par
-- l'application.
create function public.club_notif_details(p_booking uuid, p_payment uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'nom', b.name,
    'soiree', e.title,
    'debut', e.starts_at,
    'zone', z.name,
    'table', t.label,
    'personnes', b.party_size,
    'statut', b.status,
    'source', b.source,
    'prix_cents', b.price_cents,
    'regle_cents', b.paid_cents
  ) || coalesce((
    select jsonb_build_object('payeur', p.name, 'montant_cents', p.amount_cents)
    from club_payments p
    where p.id = p_payment
  ), '{}'::jsonb)
  from club_bookings b
  join club_events e on e.id = b.event_id
  join club_zones z on z.id = b.zone_id
  left join club_tables t on t.id = b.table_id
  where b.id = p_booking;
$$;

revoke execute on function public.club_notif_details(uuid, uuid) from public, anon, authenticated;

-- Écrit un événement dans la file. Une notification est un à-côté : son
-- échec ne doit jamais faire échouer le paiement ou le geste qui la porte.
create function public.club_notif_noter(
  p_booking uuid,
  p_payment uuid,
  p_kind text,
  p_key text,
  p_extra jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into club_notifications (
    etablissement_id, booking_id, event_id, payment_id, kind, dedup_key, details, actor
  )
  select b.etablissement_id, b.id, b.event_id, p_payment, p_kind, p_key,
    club_notif_details(b.id, p_payment) || p_extra, auth.uid()
  from club_bookings b
  where b.id = p_booking
  on conflict (dedup_key) do nothing;
exception when others then
  raise warning 'club_notif_noter % %: %', p_kind, p_booking, sqlerrm;
end;
$$;

revoke execute on function public.club_notif_noter(uuid, uuid, text, text, jsonb)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Déclencheurs (différés : ils lisent la réservation telle que la
-- transaction la laisse, paiement compté et reste encaissé compris)

create function public.club_bookings_notif()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenue boolean;
begin
  if tg_op = 'INSERT' then
    perform club_notif_noter(new.id, null, 'manuelle', 'manuelle:' || new.id);
    return null;
  end if;

  -- Une réservation qui tenait vraiment : réglée, en cours de soirée, ou
  -- saisie par le club. Un panier en ligne abandonné (attente expirée) qui
  -- tombe n'est pas une annulation.
  v_tenue := old.status in ('payee', 'arrivee', 'assise')
    or (old.status = 'en_attente' and old.hold_expires_at is null);

  if new.status in ('annulee', 'remboursee') and new.status is distinct from old.status then
    -- Une soirée annulée rend toutes ses tables d'un coup : la direction
    -- l'a décidé, l'équipe n'a pas à recevoir une alerte par table.
    if v_tenue and not exists (
      select 1 from club_events where id = new.event_id and cancelled_at is not null
    ) then
      perform club_notif_noter(new.id, null, new.status::text, new.status::text || ':' || new.id);
    end if;
  elsif old.table_id is not null and new.table_id is distinct from old.table_id then
    -- Placer une réservation « à placer » est le travail du soir ; la
    -- déplacer d'une table à une autre est une modification importante.
    perform club_notif_noter(new.id, null, 'deplacee', null, jsonb_build_object(
      'ancienne_table', (select label from club_tables where id = old.table_id),
      'ancienne_zone', (select z.name from club_tables t join club_zones z on z.id = t.zone_id
        where t.id = old.table_id)
    ));
  elsif new.party_size <> old.party_size and club_booking_holds(new.status, new.hold_expires_at) then
    perform club_notif_noter(new.id, null, 'modifiee', null,
      jsonb_build_object('anciennes_personnes', old.party_size));
  end if;
  return null;
end;
$$;

create constraint trigger club_bookings_notif_saisie
  after insert on public.club_bookings
  deferrable initially deferred
  for each row
  when (new.source <> 'en_ligne')
  execute function public.club_bookings_notif();

create constraint trigger club_bookings_notif_changement
  after update on public.club_bookings
  deferrable initially deferred
  for each row
  when (
    old.status is distinct from new.status
    or old.table_id is distinct from new.table_id
    or old.party_size <> new.party_size
  )
  execute function public.club_bookings_notif();

create function public.club_payments_notif()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'en_attente' and new.status = 'payee' and new.method = 'en_ligne' then
    -- Le paiement de l'organisateur confirme la table ; celui d'un ami est
    -- une part de plus.
    if new.organiser then
      perform club_notif_noter(new.booking_id, new.id, 'confirmee', 'confirmee:' || new.booking_id);
    else
      perform club_notif_noter(new.booking_id, new.id, 'acompte', 'acompte:' || new.id);
    end if;
  elsif old.status = 'payee' and new.status = 'remboursee' and not new.organiser
    -- La part d'un ami rendue alors que la table tient encore. Une table
    -- rendue entière a déjà son événement « remboursée ».
    and exists (
      select 1 from club_bookings b
      where b.id = new.booking_id and b.status in ('en_attente', 'payee', 'arrivee', 'assise', 'partie')
    ) then
    perform club_notif_noter(new.booking_id, new.id, 'part_remboursee', 'part_remboursee:' || new.id);
  end if;
  return null;
end;
$$;

create constraint trigger club_payments_notif
  after update on public.club_payments
  deferrable initially deferred
  for each row
  when (old.status is distinct from new.status)
  execute function public.club_payments_notif();

-- ---------------------------------------------------------------------------
-- Historique, page par page

-- Les notifications de réservation, la plus récente d'abord : toutes pour la
-- direction, les siennes pour un membre (la policy de lecture s'applique :
-- security invoker). Recherche sur le client et la soirée.
create function public.club_notifications_page(
  p_etablissement uuid,
  p_search text,
  p_limit int,
  p_offset int
)
returns table (
  id uuid,
  booking_id uuid,
  event_id uuid,
  kind text,
  details jsonb,
  created_at timestamptz,
  total_count bigint
)
language sql
stable
set search_path = public
as $$
  select n.id, n.booking_id, n.event_id, n.kind, n.details, n.created_at, count(*) over ()
  from club_notifications n
  where n.etablissement_id = p_etablissement
    and (
      coalesce(btrim(p_search), '') = ''
      or n.details ->> 'nom' ilike '%' || btrim(p_search) || '%'
      or n.details ->> 'soiree' ilike '%' || btrim(p_search) || '%'
    )
  order by n.created_at desc, n.id
  limit p_limit offset p_offset;
$$;

revoke execute on function public.club_notifications_page(uuid, text, int, int) from public, anon;
grant execute on function public.club_notifications_page(uuid, text, int, int) to authenticated;
