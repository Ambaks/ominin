-- Schéma multi-tenant Ominin. Les enums reflètent les types de
-- frontend/lib/gestion/types.ts et frontend/lib/menu-data.ts.

create type public.offre as enum ('digital', 'smart', 'connect');
create type public.member_role as enum ('gerant', 'cuisinier', 'serveur');
create type public.order_status as enum
  ('en_attente', 'en_preparation', 'prete', 'servie', 'payee', 'annulee');
create type public.payment_mode as enum ('especes', 'carte');
create type public.badge as enum ('maison', 'top', 'nouveau');

create table public.etablissements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tagline text not null default '',
  address text not null default '',
  phone text not null default '',
  hours text not null default '',
  offre public.offre not null,
  cover_image text,
  created_at timestamptz not null default now()
);

create table public.memberships (
  user_id uuid not null references auth.users (id) on delete cascade,
  etablissement_id uuid not null references public.etablissements (id) on delete cascade,
  role public.member_role not null,
  -- Dénormalisé depuis auth.users (inaccessible au client) pour afficher
  -- l'équipe ; rempli par les fonctions SECURITY DEFINER.
  email text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, etablissement_id)
);

create index memberships_etablissement_idx on public.memberships (etablissement_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null references public.etablissements (id) on delete cascade,
  email text not null check (email = lower(email)),
  role public.member_role not null,
  created_at timestamptz not null default now(),
  unique (etablissement_id, email)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null references public.etablissements (id) on delete cascade,
  name text not null,
  tagline text,
  position int not null,
  created_at timestamptz not null default now(),
  -- Cible des FK composites : garantit qu'un item référence une catégorie
  -- du même établissement.
  unique (id, etablissement_id)
);

create index categories_etablissement_idx on public.categories (etablissement_id);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null references public.etablissements (id) on delete cascade,
  category_id uuid not null,
  name text not null,
  description text,
  price numeric not null check (price >= 0),
  image text,
  badges public.badge[] not null default '{}',
  pairing text,
  detail text,
  disponible boolean not null default true,
  stock int check (stock >= 0),
  -- OptionGroup[] : objet-valeur de l'item, jamais requêté seul.
  options jsonb not null default '[]',
  created_at timestamptz not null default now(),
  foreign key (category_id, etablissement_id)
    references public.categories (id, etablissement_id) on delete cascade
);

create index items_category_idx on public.items (category_id);
create index items_etablissement_idx on public.items (etablissement_id);

create table public.formules (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null references public.etablissements (id) on delete cascade,
  name text not null,
  description text,
  price numeric not null check (price >= 0),
  disponible boolean not null default true,
  -- Etape[] : même raisonnement que items.options.
  etapes jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index formules_etablissement_idx on public.formules (etablissement_id);

create table public.table_groups (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null references public.etablissements (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (id, etablissement_id)
);

create table public.tables (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null references public.etablissements (id) on delete cascade,
  number int not null check (number > 0),
  -- Une table appartient à au plus un groupe (remplace TableGroup.tableIds).
  group_id uuid,
  unique (etablissement_id, number),
  unique (id, etablissement_id),
  foreign key (group_id, etablissement_id)
    references public.table_groups (id, etablissement_id)
    on delete set null (group_id)
);

create index tables_etablissement_idx on public.tables (etablissement_id);
create index tables_group_idx on public.tables (group_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null references public.etablissements (id) on delete cascade,
  table_id uuid not null,
  group_id uuid,
  status public.order_status not null default 'en_attente',
  payment_mode public.payment_mode,
  created_at timestamptz not null default now(),
  check (status <> 'payee' or payment_mode is not null),
  foreign key (table_id, etablissement_id)
    references public.tables (id, etablissement_id) on delete restrict,
  foreign key (group_id, etablissement_id)
    references public.table_groups (id, etablissement_id)
    on delete set null (group_id)
);

create index orders_etablissement_idx on public.orders (etablissement_id);
create index orders_table_idx on public.orders (table_id);
create index orders_group_idx on public.orders (group_id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  -- Nullable : la ligne (snapshot nom + prix) survit à la suppression du plat.
  item_id uuid references public.items (id) on delete set null,
  name text not null,
  quantity int not null check (quantity > 0),
  unit_price numeric not null check (unit_price >= 0),
  -- OrderItemOption[] : choix figés au moment de la commande.
  options jsonb not null default '[]'
);

create index order_items_order_idx on public.order_items (order_id);
