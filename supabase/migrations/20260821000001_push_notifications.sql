-- Notifications push du back-office : la cuisine et la salle sont prévenues
-- (téléphone en poche) des nouvelles commandes, des commandes prêtes et des
-- annulations. L'envoi part des routes Next (web-push + clé VAPID) ; la base
-- porte les abonnements des appareils, les préférences par membre et un
-- registre de déduplication qui garantit au plus une notification par
-- (commande, événement).

-- Un appareil abonné (endpoint Web Push + clés de chiffrement). Lié au
-- membership : retirer un membre de l'équipe débranche ses appareils.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  etablissement_id uuid not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  -- Libellé lisible de l'appareil (déduit du user agent), pour la page
  -- Notifications (« iPhone · Safari »).
  device_label text,
  created_at timestamptz not null default now(),
  foreign key (user_id, etablissement_id)
    references public.memberships (user_id, etablissement_id) on delete cascade
);

create index push_subscriptions_etablissement_idx
  on public.push_subscriptions (etablissement_id);

-- Comme collect_pending : aucune policy, seul le service_role y touche.
-- L'inscription d'un appareil passe par /api/push/subscriptions, qui vérifie
-- la session et le membership — un upsert client par endpoint devrait pouvoir
-- réattribuer la ligne d'un autre utilisateur (même appareil, nouvelle
-- session), ce que la RLS ne sait pas exprimer proprement.
alter table public.push_subscriptions enable row level security;

-- Préférences de notification d'un membre. Une ligne par membership, créée au
-- premier passage sur la page Notifications avec les défauts du rôle ; sans
-- ligne, l'envoi applique ces mêmes défauts (voir ROLE_DEFAULT_PREFS côté app).
create table public.notification_prefs (
  user_id uuid not null,
  etablissement_id uuid not null,
  nouvelle_commande boolean not null,
  commande_prete boolean not null,
  commande_annulee boolean not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, etablissement_id),
  foreign key (user_id, etablissement_id)
    references public.memberships (user_id, etablissement_id) on delete cascade
);

create index notification_prefs_etablissement_idx
  on public.notification_prefs (etablissement_id);

alter table public.notification_prefs enable row level security;

-- Chacun gère ses propres préférences, rien d'autre.
create policy "own prefs" on public.notification_prefs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Déduplication des envois : l'insert « on conflict do nothing » sert de
-- verrou — le premier appelant gagne, les relances (route publique appelée
-- par le navigateur du client, rejeu) ne renvoient rien. Service_role only.
create table public.push_notified (
  order_id uuid not null references public.orders (id) on delete cascade,
  event text not null
    check (event in ('nouvelle_commande', 'commande_prete', 'commande_annulee')),
  notified_at timestamptz not null default now(),
  primary key (order_id, event)
);

alter table public.push_notified enable row level security;
