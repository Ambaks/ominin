-- Affiches des offres : un visuel que le gérant téléverse, qui présente
-- `offres` formules côte à côte. Chaque formule placée dessus porte son
-- affiche et son rang (1 = la plus à gauche) ; sur le menu, les affiches
-- défilent et un bouton par formule placée ouvre sa composition. Une formule
-- sans affiche garde sa tuile en tête de carte.
-- Remplace le bandeau du BOHO codé en dur dans lib/menu-data.ts : son visuel
-- devient sa première affiche. La photo par formule (20261019000004) tombe
-- dans 20261020000003, une fois le code qui l'écrivait remplacé.

create table public.affiches (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null references public.etablissements on delete cascade,
  image text not null,
  offres int not null check (offres > 0),
  created_at timestamptz not null default now()
);

create index affiches_etablissement_id_idx on public.affiches (etablissement_id);

alter table public.affiches enable row level security;

create policy "public read" on public.affiches
  for select to anon, authenticated using (true);
create policy "gerant insert" on public.affiches
  for insert to authenticated
  with check (public.current_member_role(etablissement_id) = 'gerant');
create policy "gerant update" on public.affiches
  for update to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant')
  with check (public.current_member_role(etablissement_id) = 'gerant');
create policy "gerant delete" on public.affiches
  for delete to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant');

-- Supprimer une affiche rend ses formules à leurs tuiles : le rang resté
-- seul ne dit plus rien, l'application ne le lit qu'avec l'affiche.
alter table public.formules
  add column affiche_id uuid references public.affiches on delete set null,
  add column affiche_rang int check (affiche_rang > 0),
  add constraint formules_affiche_rang_key unique (affiche_id, affiche_rang);

do $$
declare
  v_etab uuid;
  v_affiche uuid;
begin
  select id into v_etab from etablissements where slug = 'boho';
  if v_etab is null then
    return;
  end if;

  insert into affiches (etablissement_id, image, offres)
  values (v_etab, '/boho/formules.webp', 2)
  returning id into v_affiche;

  update formules
  set affiche_id = v_affiche,
      affiche_rang = case name when 'Formule Chill' then 1 else 2 end
  where etablissement_id = v_etab
    and name in ('Formule Chill', 'Formule Boho');
end $$;
