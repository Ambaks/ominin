-- Matériel à livrer par client : une ligne par article et par établissement,
-- la quantité dit combien (150 Cachets, 1 boîtier Omilink…). Le catalogue des
-- articles vit dans lib/admin/constants.ts ; ici seul le jeu d'identifiants
-- est verrouillé. Réservé à l'équipe : le client n'a pas à le voir.

create table public.client_materiel (
  etablissement_id uuid not null
    references public.etablissements (id) on delete cascade,
  item text not null check (item in (
    'caisse', 'cachet', 'socle', 'affiche', 'vitrophanie',
    'imprimante', 'omilink', 'cable', 'routeur'
  )),
  quantity integer not null check (quantity > 0),
  primary key (etablissement_id, item)
);

alter table public.client_materiel enable row level security;

create policy "admin all" on public.client_materiel
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- La caisse avec laquelle le client travaille déjà (nom du composeur Connect
-- ou tapé à la main) : de quoi savoir s'il faut en livrer une.
create table public.client_caisse (
  etablissement_id uuid primary key
    references public.etablissements (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 80)
);

alter table public.client_caisse enable row level security;

create policy "admin all" on public.client_caisse
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
