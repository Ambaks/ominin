-- Contrat client : ce que le client accepte, dans quelle version, et à quel
-- prix. Trois faits à conserver, et une seule règle — aucun paiement Stripe
-- ne part sans une ligne d'acceptation écrite dans la même requête.
--
-- Les textes vivent dans le dépôt (frontend/lib/legal/documents) : cette
-- table n'en garde que l'empreinte, la date d'entrée en vigueur et ce qui
-- change. Changer un tarif change l'empreinte du document — donc impose une
-- nouvelle version, donc le préavis et la réacceptation. Le mécanisme
-- juridique est tenu par le schéma, pas par la discipline.

create type public.legal_doc as enum ('cgv', 'dpa', 'confidentialite');

create table public.legal_versions (
  id uuid primary key default gen_random_uuid(),
  doc public.legal_doc not null,
  -- Identifiant de version tel qu'il figure en tête du document ('2026-09-22').
  version text not null,
  -- Date d'effet : une version publiée à l'avance court le préavis jusque-là.
  effective_from timestamptz not null,
  -- SHA-256 du document sérialisé, annexe tarifaire comprise. Immuable : une
  -- version dont le texte bouge est une autre version.
  body_sha256 text not null,
  -- Ce qui change depuis la précédente, montré tel quel à la réacceptation.
  summary text not null default '',
  created_at timestamptz not null default now(),
  unique (doc, version)
);

comment on column public.legal_versions.body_sha256 is
  'Empreinte du document publié — recalculée par npm run legal:publish, qui refuse de réécrire une version dont le texte a changé.';

-- Lecture publique : un client doit pouvoir vérifier quelle version court, y
-- compris avant d'avoir un compte. Écriture réservée au service_role (script
-- de publication).
alter table public.legal_versions enable row level security;

create policy "public read" on public.legal_versions
  for select to anon, authenticated using (true);

-- Portée de la signature. Colonne à part plutôt que déduite de la nullité des
-- deux clés : une acceptation doit survivre à la disparition de ce qu'elle
-- engage, donc les clés finissent par tomber à null et ne peuvent plus dire
-- ce qui a été signé.
create type public.legal_scope as enum ('etablissement', 'shop');

create table public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.legal_versions (id),
  scope public.legal_scope not null,
  /*
   * Les trois références sont en « on delete set null », et non en cascade ni
   * en restrict. Une preuve de contrat doit vivre plus longtemps que ce
   * qu'elle prouve : c'est justement quand un client est parti — et que son
   * établissement a été supprimé — qu'on a besoin de montrer ce qu'il avait
   * accepté. Une cascade détruirait la preuve au pire moment, et un restrict
   * transformerait une demande d'effacement (art. 17 RGPD) en erreur Postgres.
   * D'où les deux colonnes dénormalisées ci-dessous : elles portent seules le
   * sens de la ligne une fois les clés tombées.
   */
  user_id uuid references auth.users (id) on delete set null,
  etablissement_id uuid references public.etablissements (id) on delete set null,
  shop_id uuid references public.shops (id) on delete set null,
  -- Recopiés au moment de la signature. Conservés au titre de la preuve du
  -- contrat, pas du compte : un effacement de compte les laisse en place.
  -- signatory_email porte l'identifiant du compte quand celui-ci n'a pas
  -- d'adresse : une preuve qui ne nomme personne ne prouve rien, d'où le
  -- refus d'une chaîne vide.
  signatory_email text not null check (signatory_email <> ''),
  scope_label text not null check (scope_label <> ''),
  accepted_at timestamptz not null default now(),
  -- Preuve technique du clic. Nullables : une reprise côté serveur n'en a pas.
  ip inet,
  user_agent text,
  -- Ce qui a été accepté en chiffres, figé au clic : offre, mensualité,
  -- commission, lignes du devis, total, choix de licence de données. Les
  -- tarifs de lib/landing-data.ts peuvent bouger ensuite, cette colonne non.
  terms jsonb not null,
  -- Session Checkout née de cette acceptation, quand il y en a une.
  stripe_checkout_session_id text,
  -- La portée dit laquelle des deux clés a un sens ; l'autre reste vide, et
  -- la contrainte tient encore après que la première est tombée à null.
  constraint legal_acceptances_one_scope check (
    (scope = 'etablissement' and shop_id is null)
    or (scope = 'shop' and etablissement_id is null)
  )
);

/*
 * La contrainte de portée doit rester vraie après qu'une clé est tombée à
 * null — elle ne peut donc pas exiger sa présence. À l'insertion, si : une
 * signature qui ne désigne rien ne prouve rien, et ce serait un défaut
 * d'écriture, pas une suppression.
 */
create function public.enforce_legal_acceptance_scope()
returns trigger
language plpgsql
as $$
begin
  if (new.scope = 'etablissement' and new.etablissement_id is null)
    or (new.scope = 'shop' and new.shop_id is null) then
    raise exception 'Une acceptation doit désigner le périmètre qu''elle engage.';
  end if;
  return new;
end;
$$;

create trigger legal_acceptances_scope
  before insert on public.legal_acceptances
  for each row execute function public.enforce_legal_acceptance_scope();

create index legal_acceptances_etablissement_idx
  on public.legal_acceptances (etablissement_id, accepted_at desc);
create index legal_acceptances_shop_idx
  on public.legal_acceptances (shop_id, accepted_at desc);

-- Écritures par le service_role seul (routes de checkout et d'acceptation) :
-- une signature que le navigateur pourrait forger ne prouverait rien. Le
-- gérant relit les siennes pour retélécharger son contrat.
alter table public.legal_acceptances enable row level security;

create policy "gerant read" on public.legal_acceptances
  for select to authenticated
  using (
    (etablissement_id is not null
      and public.current_member_role(etablissement_id) = 'gerant')
    or (shop_id is not null
      and public.current_shop_role(shop_id) = 'proprietaire')
  );

-- Licence de données : le volet « données personnelles » de l'article
-- « Données et amélioration des Services ». Table à part et non colonne
-- d'etablissements, dont la policy de lecture est ouverte à anon (menu QR) —
-- le choix d'un client n'a pas à être lisible par ses convives.
create table public.etablissement_data_licence (
  etablissement_id uuid primary key
    references public.etablissements (id) on delete cascade,
  -- false (défaut) ⇒ les données personnelles des convives sont anonymisées
  -- puis réutilisées ; true ⇒ elles ne servent qu'à rendre le service. Les
  -- données d'exploitation du restaurant, non personnelles, restent couvertes
  -- par la licence de l'article — ce réglage ne les concerne pas.
  training_opt_out boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Le défaut ne joue qu'à l'insertion : sans ce trigger, un gérant qui change
-- d'avis garderait l'horodatage de son premier choix, alors que c'est la date
-- du choix courant qui fait foi.
create trigger etablissement_data_licence_updated_at
  before update on public.etablissement_data_licence
  for each row execute function public.set_updated_at();

alter table public.etablissement_data_licence enable row level security;

create policy "member read" on public.etablissement_data_licence
  for select to authenticated
  using (public.current_member_role(etablissement_id) is not null);

-- Poser et modifier son choix, pas l'effacer : une suppression ramènerait
-- silencieusement la ligne au défaut (réutilisation autorisée), c'est-à-dire
-- l'inverse de ce que le gérant avait demandé.
create policy "gerant insert" on public.etablissement_data_licence
  for insert to authenticated
  with check (public.current_member_role(etablissement_id) = 'gerant');

create policy "gerant update" on public.etablissement_data_licence
  for update to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant')
  with check (public.current_member_role(etablissement_id) = 'gerant');
