-- Row Level Security. Lecture anonyme limitée au contenu public de la page
-- QR (établissement, menu, formules). Tout le reste exige un membership ;
-- les nuances par rôle (colonnes, transitions) sont dans les triggers de
-- 20260707000002_functions.sql. Pas de policy INSERT sur orders : la prise
-- de commande depuis la page QR est hors périmètre pour l'instant.

alter table public.etablissements enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.categories enable row level security;
alter table public.items enable row level security;
alter table public.formules enable row level security;
alter table public.tables enable row level security;
alter table public.table_groups enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Établissements : vitrine publique, édition réservée au gérant.
-- (Création uniquement via create_etablissement, SECURITY DEFINER.)
create policy "public read" on public.etablissements
  for select to anon, authenticated using (true);
create policy "gerant update" on public.etablissements
  for update to authenticated
  using (public.current_member_role(id) = 'gerant')
  with check (public.current_member_role(id) = 'gerant');

-- Menu public en lecture ; écriture gérant (items : cuisinier peut ajuster
-- disponibilité/stock, colonnes verrouillées par trigger).
create policy "public read" on public.categories
  for select to anon, authenticated using (true);
create policy "gerant insert" on public.categories
  for insert to authenticated
  with check (public.current_member_role(etablissement_id) = 'gerant');
create policy "gerant update" on public.categories
  for update to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant')
  with check (public.current_member_role(etablissement_id) = 'gerant');
create policy "gerant delete" on public.categories
  for delete to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant');

create policy "public read" on public.items
  for select to anon, authenticated using (true);
create policy "gerant insert" on public.items
  for insert to authenticated
  with check (public.current_member_role(etablissement_id) = 'gerant');
create policy "gerant cuisinier update" on public.items
  for update to authenticated
  using (public.current_member_role(etablissement_id) in ('gerant', 'cuisinier'))
  with check (public.current_member_role(etablissement_id) in ('gerant', 'cuisinier'));
create policy "gerant delete" on public.items
  for delete to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant');

create policy "public read" on public.formules
  for select to anon, authenticated using (true);
create policy "gerant insert" on public.formules
  for insert to authenticated
  with check (public.current_member_role(etablissement_id) = 'gerant');
create policy "gerant update" on public.formules
  for update to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant')
  with check (public.current_member_role(etablissement_id) = 'gerant');
create policy "gerant delete" on public.formules
  for delete to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant');

-- Salle : membres uniquement. Groupement accessible au serveur
-- (trigger : seul group_id est modifiable pour ce rôle).
create policy "member read" on public.tables
  for select to authenticated
  using (public.current_member_role(etablissement_id) is not null);
create policy "gerant insert" on public.tables
  for insert to authenticated
  with check (public.current_member_role(etablissement_id) = 'gerant');
create policy "gerant serveur update" on public.tables
  for update to authenticated
  using (public.current_member_role(etablissement_id) in ('gerant', 'serveur'))
  with check (public.current_member_role(etablissement_id) in ('gerant', 'serveur'));
create policy "gerant delete" on public.tables
  for delete to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant');

create policy "member read" on public.table_groups
  for select to authenticated
  using (public.current_member_role(etablissement_id) is not null);
create policy "gerant serveur insert" on public.table_groups
  for insert to authenticated
  with check (public.current_member_role(etablissement_id) in ('gerant', 'serveur'));
create policy "gerant serveur delete" on public.table_groups
  for delete to authenticated
  using (public.current_member_role(etablissement_id) in ('gerant', 'serveur'));

-- Commandes : membres uniquement ; droits fins par rôle dans les triggers.
create policy "member read" on public.orders
  for select to authenticated
  using (public.current_member_role(etablissement_id) is not null);
create policy "member update" on public.orders
  for update to authenticated
  using (public.current_member_role(etablissement_id) is not null)
  with check (public.current_member_role(etablissement_id) is not null);

create policy "member read" on public.order_items
  for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id
      and public.current_member_role(o.etablissement_id) is not null
  ));

-- Équipe : chaque membre voit l'équipe ; seul le gérant modifie, jamais sa
-- propre ligne (évite de se retirer l'accès). Insertion uniquement via les
-- fonctions SECURITY DEFINER (onboarding, invitations).
create policy "member read" on public.memberships
  for select to authenticated
  using (public.current_member_role(etablissement_id) is not null);
create policy "gerant update" on public.memberships
  for update to authenticated
  using (
    public.current_member_role(etablissement_id) = 'gerant'
    and user_id <> auth.uid()
  )
  with check (public.current_member_role(etablissement_id) = 'gerant');
create policy "gerant delete" on public.memberships
  for delete to authenticated
  using (
    public.current_member_role(etablissement_id) = 'gerant'
    and user_id <> auth.uid()
  );

create policy "gerant read" on public.invitations
  for select to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant');
create policy "gerant insert" on public.invitations
  for insert to authenticated
  with check (public.current_member_role(etablissement_id) = 'gerant');
create policy "gerant delete" on public.invitations
  for delete to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant');

-- Realtime : l'espace gestion s'abonne aux commandes (RLS s'applique aussi
-- aux événements).
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_items;
