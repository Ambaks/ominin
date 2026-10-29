-- HubRise : des codes pour les formules et pour les tailles, que la caisse
-- exige (le guide d'intégration HubRise : une ligne sans code, la caisse
-- l'ignore ou la refuse).
--
-- Taille : chez la caisse, « 33 cl » ou « 13 pouces » n'est pas une option
-- mais un autre SKU du produit. Un choix d'option peut donc désormais se
-- relier à un SKU : la ligne part alors avec ce SKU, et le choix disparaît
-- des options.
--
-- Formule : elle part en « deal » HubRise, chaque plat sur sa propre ligne
-- avec son code. Le deal porte le code de la formule, relié ici.

alter table public.hubrise_ref_map
  drop constraint hubrise_ref_map_check1,
  add constraint hubrise_ref_map_option_choice_check
    check (target = 'sku' or choice_id is not null);

create table public.hubrise_formule_map (
  formule_id uuid primary key references public.formules (id) on delete cascade,
  etablissement_id uuid not null
    references public.etablissements (id) on delete cascade,
  ref text not null,
  hubrise_name text,
  matched_by text not null check (matched_by in ('auto', 'manual')),
  created_at timestamptz not null default now()
);

create index hubrise_formule_map_etablissement_idx
  on public.hubrise_formule_map (etablissement_id);

-- Comme hubrise_ref_map : service_role uniquement, par /api/hubrise/catalog.
alter table public.hubrise_formule_map enable row level security;
