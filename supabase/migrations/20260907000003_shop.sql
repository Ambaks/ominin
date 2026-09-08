-- Ominin Shop : boutiques e-commerce clé en main (première boutique : MyBox).
-- Périmètre volontairement disjoint des restaurants : une boutique n'est pas
-- un établissement, elle a ses propres membres, son abonnement, son compte
-- Stripe Express et ses tables shop_*. Seuls auth.users (comptes) et la
-- plateforme Stripe sont communs.
--
-- Tenant = shops ; chaque table fille porte shop_id ou remonte à la boutique
-- par sa parente. Les droits reposent sur current_shop_role() ; les
-- clientes (commande, messagerie) sont reconnues par user_id ; les écritures
-- sensibles (commandes, paiements, codes promo) passent par le serveur
-- (service_role) et jamais par le client.

-- ---------------------------------------------------------------------------
-- Types

create type public.shop_member_role as enum ('proprietaire', 'equipe');
create type public.shop_order_status as enum
  ('pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled', 'refunded');
create type public.shop_payment_status as enum
  ('unpaid', 'paid', 'refunded', 'partially_refunded', 'failed');
create type public.shop_shipping_kind as enum ('home', 'relay', 'pickup');
create type public.shop_message_sender as enum ('customer', 'shop');
create type public.shop_discount_type as enum ('percent', 'fixed');
create type public.shop_product_badge as enum ('best-seller', 'nouveau', 'coup-de-coeur');

-- ---------------------------------------------------------------------------
-- Boutiques

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  -- Adresse publique : shop.ominin.com/<slug>. Les slugs réservés sont les
  -- routes statiques de l'arborescence /shop (voir create_shop).
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  tagline text,
  -- Accroche et texte de la page d'accueil ; à défaut, la signature.
  hero_title text,
  hero_subtitle text,
  -- Libellé du catalogue dans la navigation (« Nos box », « La boutique »).
  catalog_label text not null default 'La boutique',
  -- Préfixe des numéros de commande (« MB » → MB-2609-0001).
  order_prefix text not null check (order_prefix ~ '^[A-Z0-9]{2,4}$'),
  contact_email text,
  contact_phone text,
  instagram_url text,
  tiktok_url text,
  announcement text,
  about_text text,
  legal_company_name text,
  legal_address text,
  legal_siret text,
  legal_vat text,
  legal_email text,
  cgv text,
  mentions_legales text,
  confidentialite text,
  livraison_retours text,
  free_shipping_threshold_cents int check (free_shipping_threshold_cents is null or free_shipping_threshold_cents >= 0),
  -- Thème du site de la boutique : { preset, colors } — voir lib/shop/theme.ts.
  theme jsonb not null default '{}',
  logo_url text,
  -- Commission plateforme sur chaque vente (application_fee Stripe). 0 tant
  -- que la grille tarifaire n'est pas arrêtée.
  platform_fee_percent numeric(5, 2) not null default 0
    check (platform_fee_percent >= 0 and platform_fee_percent <= 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger shops_updated_at before update on public.shops
  for each row execute function public.set_updated_at();

create table public.shop_members (
  user_id uuid not null references auth.users (id) on delete cascade,
  shop_id uuid not null references public.shops (id) on delete cascade,
  role public.shop_member_role not null,
  -- Dénormalisé depuis auth.users (inaccessible au client), comme memberships.
  email text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, shop_id)
);
create index shop_members_shop_idx on public.shop_members (shop_id);

create or replace function public.current_shop_role(p_shop uuid)
returns public.shop_member_role
language sql stable security definer
set search_path = public
as $$
  select role from public.shop_members
  where user_id = auth.uid() and shop_id = p_shop;
$$;
-- Appelée dans des policies évaluées aussi pour anon (lecture publique du
-- catalogue) : anon doit pouvoir l'exécuter, elle renvoie alors null.
revoke execute on function public.current_shop_role(uuid) from public;
grant execute on function public.current_shop_role(uuid) to anon, authenticated;

-- Abonnement à l'offre Shop (mise en place + mensuel). Statut Stripe brut,
-- comme subscriptions. Écriture : webhook plateforme uniquement.
create table public.shop_subscriptions (
  shop_id uuid primary key references public.shops (id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text,
  setup_paid_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Compte Stripe Express de la boutique : l'argent des ventes lui revient.
create table public.shop_payment_accounts (
  shop_id uuid primary key references public.shops (id) on delete cascade,
  stripe_account_id text not null unique,
  details_submitted boolean not null default false,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Catalogue

create table public.shop_categories (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  unique (shop_id, slug),
  -- Cible des FK composites : un produit ne référence qu'une catégorie de
  -- sa boutique.
  unique (id, shop_id)
);

-- Listes de choix (ex. « Parfum KAYALI »), rattachables à plusieurs produits.
create table public.shop_option_groups (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  unique (id, shop_id)
);

create table public.shop_option_values (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.shop_option_groups (id) on delete cascade,
  label text not null,
  price_delta_cents int not null default 0,
  is_available boolean not null default true,
  sort_order int not null default 0
);
create index shop_option_values_group_idx on public.shop_option_values (group_id, sort_order);

create table public.shop_products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  slug text not null,
  name text not null,
  subtitle text,
  description text,
  composition text[] not null default '{}',
  price_cents int not null check (price_cents >= 0),
  compare_at_price_cents int check (compare_at_price_cents is null or compare_at_price_cents >= 0),
  category_id uuid,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  badge public.shop_product_badge,
  stock int check (stock is null or stock >= 0),
  sort_order int not null default 0,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, slug),
  unique (id, shop_id),
  foreign key (category_id, shop_id)
    references public.shop_categories (id, shop_id) on delete set null (category_id)
);
create trigger shop_products_updated_at before update on public.shop_products
  for each row execute function public.set_updated_at();
create index shop_products_shop_idx on public.shop_products (shop_id, sort_order);

create table public.shop_product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.shop_products (id) on delete cascade,
  url text not null,
  alt text,
  sort_order int not null default 0
);
create index shop_product_images_product_idx on public.shop_product_images (product_id, sort_order);

-- Un même groupe peut être rattaché plusieurs fois à un produit avec des
-- libellés différents (deux flacons dans une même box).
create table public.shop_product_options (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null,
  product_id uuid not null,
  group_id uuid not null,
  label text not null,
  is_required boolean not null default true,
  sort_order int not null default 0,
  unique (product_id, group_id, label),
  foreign key (product_id, shop_id)
    references public.shop_products (id, shop_id) on delete cascade,
  foreign key (group_id, shop_id)
    references public.shop_option_groups (id, shop_id) on delete cascade
);
create index shop_product_options_product_idx on public.shop_product_options (product_id, sort_order);

-- ---------------------------------------------------------------------------
-- Livraison et codes promo

create table public.shop_shipping_methods (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  name text not null,
  carrier text,
  description text,
  kind public.shop_shipping_kind not null default 'home',
  price_cents int not null default 0 check (price_cents >= 0),
  free_above_cents int check (free_above_cents is null or free_above_cents >= 0),
  countries text[] not null default '{FR}',
  delay_min_days int,
  delay_max_days int,
  instructions text,
  is_active boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (id, shop_id)
);
create index shop_shipping_methods_shop_idx on public.shop_shipping_methods (shop_id, sort_order);

create table public.shop_discount_codes (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  code text not null check (code = upper(code)),
  type public.shop_discount_type not null,
  value int not null check (value > 0),
  min_subtotal_cents int,
  starts_at timestamptz,
  ends_at timestamptz,
  max_uses int,
  uses int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (shop_id, code)
);

-- ---------------------------------------------------------------------------
-- Commandes

-- Numérotation par boutique : <préfixe>-<AAMM>-<compteur>, lisible pour la
-- cliente et le SAV. Le compteur est propre à chaque boutique.
create table public.shop_order_counters (
  shop_id uuid primary key references public.shops (id) on delete cascade,
  next_value int not null default 1
);

create table public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  -- Posé par le trigger shop_orders_number ; le défaut vide laisse le
  -- serveur insérer sans le calculer (jamais stocké tel quel).
  order_number text not null unique default '',
  user_id uuid references auth.users (id) on delete set null,
  email text not null check (email = lower(email)),
  phone text,
  first_name text,
  last_name text,
  shipping_address jsonb,
  billing_address jsonb,
  shipping_method_id uuid,
  shipping_method_name text,
  shipping_kind public.shop_shipping_kind,
  shipping_cents int not null default 0,
  relay_point jsonb,
  is_gift boolean not null default false,
  gift_message text,
  customer_note text,
  subtotal_cents int not null,
  discount_cents int not null default 0,
  discount_code text,
  -- Commission plateforme figée à la commande (application_fee Stripe).
  platform_fee_cents int not null default 0,
  total_cents int not null,
  currency text not null default 'eur',
  status public.shop_order_status not null default 'pending',
  payment_status public.shop_payment_status not null default 'unpaid',
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  stripe_account_id text,
  tracking_number text,
  tracking_url text,
  carrier text,
  paid_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (shipping_method_id, shop_id)
    references public.shop_shipping_methods (id, shop_id) on delete set null (shipping_method_id)
);
create trigger shop_orders_updated_at before update on public.shop_orders
  for each row execute function public.set_updated_at();
create index shop_orders_shop_status_idx on public.shop_orders (shop_id, status, created_at desc);
create index shop_orders_user_idx on public.shop_orders (user_id, created_at desc);

create or replace function public.shop_assign_order_number()
returns trigger
language plpgsql
as $$
declare
  v_prefix text;
  v_next int;
begin
  if coalesce(new.order_number, '') <> '' then
    return new;
  end if;
  select order_prefix into v_prefix from public.shops where id = new.shop_id;
  insert into public.shop_order_counters (shop_id, next_value)
  values (new.shop_id, 2)
  on conflict (shop_id) do update set next_value = shop_order_counters.next_value + 1
  returning next_value - 1 into v_next;
  new.order_number := v_prefix || '-' || to_char(now(), 'YYMM') || '-' || lpad(v_next::text, 4, '0');
  return new;
end;
$$;

create trigger shop_orders_number before insert on public.shop_orders
  for each row execute function public.shop_assign_order_number();

create table public.shop_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.shop_orders (id) on delete cascade,
  product_id uuid references public.shop_products (id) on delete set null,
  product_name text not null,
  product_slug text,
  image_url text,
  unit_price_cents int not null,
  quantity int not null check (quantity > 0),
  -- [{label, value, price_delta_cents}] : choix figés à la commande.
  options jsonb not null default '[]',
  total_cents int not null
);
create index shop_order_items_order_idx on public.shop_order_items (order_id);

create table public.shop_order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.shop_orders (id) on delete cascade,
  type text not null,
  message text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index shop_order_events_order_idx on public.shop_order_events (order_id, created_at);

-- Clientes d'une boutique : agrégat des commandes (hors paniers abandonnés).
create or replace view public.shop_customer_stats as
  select
    o.shop_id,
    o.email,
    max(coalesce(nullif(trim(coalesce(o.first_name, '') || ' ' || coalesce(o.last_name, '')), ''), o.email)) as name,
    max(o.user_id::text)::uuid as user_id,
    count(*) filter (where o.payment_status = 'paid') as orders_count,
    coalesce(sum(o.total_cents) filter (where o.payment_status = 'paid'), 0) as total_spent_cents,
    max(o.created_at) as last_order_at,
    min(o.created_at) as first_order_at
  from public.shop_orders o
  where o.status <> 'pending'
  group by o.shop_id, o.email;
alter view public.shop_customer_stats set (security_invoker = true);
revoke all on public.shop_customer_stats from anon;

-- ---------------------------------------------------------------------------
-- Messagerie boutique ↔ clientes

create table public.shop_conversations (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  customer_email text not null,
  customer_name text,
  subject text,
  order_id uuid references public.shop_orders (id) on delete set null,
  status text not null default 'open' check (status in ('open', 'closed')),
  unread_shop boolean not null default true,
  unread_customer boolean not null default false,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index shop_conversations_shop_idx on public.shop_conversations (shop_id, status, last_message_at desc);
create index shop_conversations_user_idx on public.shop_conversations (user_id, last_message_at desc);

create table public.shop_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.shop_conversations (id) on delete cascade,
  sender public.shop_message_sender not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index shop_messages_conversation_idx on public.shop_messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- Contenu

create table public.shop_faq_items (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  question text not null,
  answer text not null,
  sort_order int not null default 0,
  is_active boolean not null default true
);
create index shop_faq_items_shop_idx on public.shop_faq_items (shop_id, sort_order);

create table public.shop_newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  email text not null check (email = lower(email)),
  created_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  unique (shop_id, email)
);

-- ---------------------------------------------------------------------------
-- Fonctions

-- Création d'une boutique par la personne connectée, qui en devient
-- propriétaire. Slugs réservés = routes statiques de /shop.
create or replace function public.create_shop(
  p_name text,
  p_slug text,
  p_order_prefix text
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.';
  end if;
  if p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Adresse de boutique invalide.';
  end if;
  if p_slug in ('shop', 'connexion', 'inscription', 'gestion', 'compte', 'demo', 'auth', 'api', 'impression') then
    raise exception 'Cette adresse est réservée.';
  end if;
  if exists (select 1 from public.shop_members where user_id = auth.uid()) then
    raise exception 'Vous gérez déjà une boutique.';
  end if;

  insert into public.shops (name, slug, order_prefix)
  values (p_name, p_slug, upper(p_order_prefix))
  returning id into v_id;

  insert into public.shop_members (user_id, shop_id, role, email)
  select auth.uid(), v_id, 'proprietaire', u.email
  from auth.users u where u.id = auth.uid();

  return v_id;
end;
$$;
revoke execute on function public.create_shop(text, text, text) from public, anon;
grant execute on function public.create_shop(text, text, text) to authenticated;

-- Appelées par le serveur après paiement (service_role uniquement).
create or replace function public.shop_decrement_stock(p_product_id uuid, p_qty int)
returns void language sql security definer set search_path = public as $$
  update public.shop_products
  set stock = greatest(stock - p_qty, 0)
  where id = p_product_id and stock is not null;
$$;
create or replace function public.shop_increment_discount_uses(p_shop uuid, p_code text)
returns void language sql security definer set search_path = public as $$
  update public.shop_discount_codes set uses = uses + 1
  where shop_id = p_shop and code = upper(p_code);
$$;
revoke execute on function public.shop_decrement_stock(uuid, int) from public, anon, authenticated;
revoke execute on function public.shop_increment_discount_uses(uuid, text) from public, anon, authenticated;
grant execute on function public.shop_decrement_stock(uuid, int) to service_role;
grant execute on function public.shop_increment_discount_uses(uuid, text) to service_role;

-- Ventes par jour d'une boutique (tableau de bord). Droits de l'appelante :
-- la RLS de shop_orders ne laisse passer que les membres.
create or replace function public.shop_sales_by_day(p_shop uuid, p_days int)
returns table (day date, orders_count bigint, revenue_cents bigint)
language sql stable set search_path = public as $$
  with days as (
    select generate_series((current_date - (p_days - 1))::date, current_date, interval '1 day')::date as day
  )
  select d.day,
         count(o.id) as orders_count,
         coalesce(sum(o.total_cents), 0)::bigint as revenue_cents
  from days d
  left join public.shop_orders o
    on o.shop_id = p_shop and o.paid_at::date = d.day and o.payment_status = 'paid'
  group by d.day
  order by d.day;
$$;
revoke execute on function public.shop_sales_by_day(uuid, int) from public, anon;
grant execute on function public.shop_sales_by_day(uuid, int) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Row Level Security

alter table public.shops enable row level security;
alter table public.shop_members enable row level security;
alter table public.shop_subscriptions enable row level security;
alter table public.shop_payment_accounts enable row level security;
alter table public.shop_categories enable row level security;
alter table public.shop_option_groups enable row level security;
alter table public.shop_option_values enable row level security;
alter table public.shop_products enable row level security;
alter table public.shop_product_images enable row level security;
alter table public.shop_product_options enable row level security;
alter table public.shop_shipping_methods enable row level security;
alter table public.shop_discount_codes enable row level security;
alter table public.shop_order_counters enable row level security;
alter table public.shop_orders enable row level security;
alter table public.shop_order_items enable row level security;
alter table public.shop_order_events enable row level security;
alter table public.shop_conversations enable row level security;
alter table public.shop_messages enable row level security;
alter table public.shop_faq_items enable row level security;
alter table public.shop_newsletter_subscribers enable row level security;

-- Boutique : vitrine publique tant qu'elle est active ; réglages par la
-- propriétaire. Création uniquement via create_shop.
create policy "public read" on public.shops
  for select to anon, authenticated
  using (is_active or public.current_shop_role(id) is not null);
create policy "owner update" on public.shops
  for update to authenticated
  using (public.current_shop_role(id) = 'proprietaire')
  with check (public.current_shop_role(id) = 'proprietaire');

-- Équipe : chaque membre voit l'équipe ; la propriétaire gère les autres,
-- jamais sa propre ligne. Insertion via create_shop (et invitations à venir).
create policy "member read" on public.shop_members
  for select to authenticated
  using (public.current_shop_role(shop_id) is not null);
create policy "owner delete" on public.shop_members
  for delete to authenticated
  using (public.current_shop_role(shop_id) = 'proprietaire' and user_id <> auth.uid());

create policy "member read" on public.shop_subscriptions
  for select to authenticated
  using (public.current_shop_role(shop_id) is not null);
create policy "member read" on public.shop_payment_accounts
  for select to authenticated
  using (public.current_shop_role(shop_id) is not null);

-- Catalogue : lecture publique des éléments actifs, gestion par les membres.
create policy "public read" on public.shop_categories
  for select to anon, authenticated
  using (is_active or public.current_shop_role(shop_id) is not null);
create policy "member write" on public.shop_categories
  for all to authenticated
  using (public.current_shop_role(shop_id) is not null)
  with check (public.current_shop_role(shop_id) is not null);

create policy "public read" on public.shop_option_groups
  for select to anon, authenticated using (true);
create policy "member write" on public.shop_option_groups
  for all to authenticated
  using (public.current_shop_role(shop_id) is not null)
  with check (public.current_shop_role(shop_id) is not null);

create policy "public read" on public.shop_option_values
  for select to anon, authenticated using (true);
create policy "member write" on public.shop_option_values
  for all to authenticated
  using (exists (select 1 from public.shop_option_groups g
                 where g.id = group_id and public.current_shop_role(g.shop_id) is not null))
  with check (exists (select 1 from public.shop_option_groups g
                      where g.id = group_id and public.current_shop_role(g.shop_id) is not null));

create policy "public read" on public.shop_products
  for select to anon, authenticated
  using (is_active or public.current_shop_role(shop_id) is not null);
create policy "member write" on public.shop_products
  for all to authenticated
  using (public.current_shop_role(shop_id) is not null)
  with check (public.current_shop_role(shop_id) is not null);

create policy "public read" on public.shop_product_images
  for select to anon, authenticated using (true);
create policy "member write" on public.shop_product_images
  for all to authenticated
  using (exists (select 1 from public.shop_products p
                 where p.id = product_id and public.current_shop_role(p.shop_id) is not null))
  with check (exists (select 1 from public.shop_products p
                      where p.id = product_id and public.current_shop_role(p.shop_id) is not null));

create policy "public read" on public.shop_product_options
  for select to anon, authenticated using (true);
create policy "member write" on public.shop_product_options
  for all to authenticated
  using (public.current_shop_role(shop_id) is not null)
  with check (public.current_shop_role(shop_id) is not null);

create policy "public read" on public.shop_shipping_methods
  for select to anon, authenticated
  using (is_active or public.current_shop_role(shop_id) is not null);
create policy "member write" on public.shop_shipping_methods
  for all to authenticated
  using (public.current_shop_role(shop_id) is not null)
  with check (public.current_shop_role(shop_id) is not null);

-- Codes promo : jamais lisibles publiquement (validés côté serveur).
create policy "owner all" on public.shop_discount_codes
  for all to authenticated
  using (public.current_shop_role(shop_id) = 'proprietaire')
  with check (public.current_shop_role(shop_id) = 'proprietaire');

-- Commandes : la cliente voit les siennes, les membres celles de la
-- boutique. Création côté serveur (service_role) ; mise à jour par les
-- membres (préparation, expédition, notes).
create policy "own or member read" on public.shop_orders
  for select to authenticated
  using (user_id = auth.uid() or public.current_shop_role(shop_id) is not null);
create policy "member update" on public.shop_orders
  for update to authenticated
  using (public.current_shop_role(shop_id) is not null)
  with check (public.current_shop_role(shop_id) is not null);

create policy "via order read" on public.shop_order_items
  for select to authenticated
  using (exists (select 1 from public.shop_orders o where o.id = order_id
                 and (o.user_id = auth.uid() or public.current_shop_role(o.shop_id) is not null)));

create policy "via order read" on public.shop_order_events
  for select to authenticated
  using (exists (select 1 from public.shop_orders o where o.id = order_id
                 and (o.user_id = auth.uid() or public.current_shop_role(o.shop_id) is not null)));
create policy "member insert" on public.shop_order_events
  for insert to authenticated
  with check (exists (select 1 from public.shop_orders o where o.id = order_id
                      and public.current_shop_role(o.shop_id) is not null));

-- Messagerie : la cliente et la boutique lisent la conversation ; la cliente
-- connectée ouvre les siennes ; les messages invités passent par le serveur.
create policy "own or member read" on public.shop_conversations
  for select to authenticated
  using (user_id = auth.uid() or public.current_shop_role(shop_id) is not null);
create policy "customer insert" on public.shop_conversations
  for insert to authenticated
  with check (user_id = auth.uid());
create policy "member update" on public.shop_conversations
  for update to authenticated
  using (public.current_shop_role(shop_id) is not null)
  with check (public.current_shop_role(shop_id) is not null);
create policy "member delete" on public.shop_conversations
  for delete to authenticated
  using (public.current_shop_role(shop_id) is not null);

create policy "via conversation read" on public.shop_messages
  for select to authenticated
  using (exists (select 1 from public.shop_conversations c where c.id = conversation_id
                 and (c.user_id = auth.uid() or public.current_shop_role(c.shop_id) is not null)));
create policy "customer reply" on public.shop_messages
  for insert to authenticated
  with check (sender = 'customer' and exists (
    select 1 from public.shop_conversations c where c.id = conversation_id and c.user_id = auth.uid()));
create policy "shop reply" on public.shop_messages
  for insert to authenticated
  with check (sender = 'shop' and exists (
    select 1 from public.shop_conversations c where c.id = conversation_id
    and public.current_shop_role(c.shop_id) is not null));

create policy "public read" on public.shop_faq_items
  for select to anon, authenticated
  using (is_active or public.current_shop_role(shop_id) is not null);
create policy "member write" on public.shop_faq_items
  for all to authenticated
  using (public.current_shop_role(shop_id) is not null)
  with check (public.current_shop_role(shop_id) is not null);

-- Newsletter : inscription côté serveur, lecture par les membres.
create policy "member read" on public.shop_newsletter_subscribers
  for select to authenticated
  using (public.current_shop_role(shop_id) is not null);

-- ---------------------------------------------------------------------------
-- Stockage : photos des produits (bucket public, écriture via le serveur
-- comme le bucket « photos » des restaurants — aucune policy client).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shop-photos', 'shop-photos', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "shop-photos public read" on storage.objects
  for select using (bucket_id = 'shop-photos');
