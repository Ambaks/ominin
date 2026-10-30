-- Onglet Entreprise de l'admin : les comptes (qui a accès à quoi, journal de ce
-- que l'admin y change) et la comptabilité (dépenses saisies, abonnements
-- qu'Ominin paie). Les écrans lisent et écrivent par des fonctions gardées par
-- admin_require : auth.users reste inaccessible au client.

-- --------------------------------------------------------------------------
-- Journal des comptes. L'e-mail est recopié : la ligne survit au compte.
-- --------------------------------------------------------------------------

create table public.admin_account_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  actor_email text not null,
  target_id uuid not null,
  target_email text not null,
  action text not null,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index admin_account_events_target_idx on public.admin_account_events (target_id, created_at desc);

-- Lecture seule : une trace ne se corrige pas.
alter table public.admin_account_events enable row level security;
create policy "admin read" on public.admin_account_events
  for select to authenticated using ((select public.is_admin()));

create function public.admin_account_log(p_target uuid, p_action text, p_detail jsonb)
returns public.admin_account_events
language sql
security definer
set search_path = ''
as $$
  insert into public.admin_account_events (actor_id, actor_email, target_id, target_email, action, detail)
  select auth.uid(),
         coalesce((select email from auth.users where id = auth.uid()), ''),
         u.id, coalesce(u.email, u.phone, ''), p_action, p_detail
  from auth.users u
  where u.id = p_target
  returning *;
$$;
revoke execute on function public.admin_account_log(uuid, text, jsonb) from public, anon, authenticated;

-- --------------------------------------------------------------------------
-- Lecture : un compte, tous ses accès.
-- --------------------------------------------------------------------------

create function public.admin_accounts()
returns table (
  user_id uuid,
  email text,
  phone text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  banned_until timestamptz,
  is_admin boolean,
  access jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require();
  return query
  select u.id, u.email::text, u.phone::text, u.created_at, u.last_sign_in_at, u.banned_until,
         exists (select 1 from public.admin_users a where a.user_id = u.id),
         coalesce((select jsonb_agg(x.item) from (
           select jsonb_build_object(
             'kind', 'menu', 'id', e.id, 'name', e.name, 'role', m.role, 'demo', e.demo,
             'offre', e.offre, 'subscriptions', (
               select jsonb_object_agg(s.product, s.status)
               from public.subscriptions s where s.etablissement_id = e.id),
             'fees', jsonb_build_object(
               'platform_fee_percent', e.platform_fee_percent,
               'collect_fee_percent', e.collect_fee_percent,
               'table_fee_percent', e.table_fee_percent)) as item
           from public.memberships m
           join public.etablissements e on e.id = m.etablissement_id
           where m.user_id = u.id
           union all
           select jsonb_build_object(
             'kind', 'shop', 'id', sh.id, 'name', sh.name, 'role', sm.role, 'demo', sh.demo,
             'subscriptions', jsonb_build_object('shop', ss.status),
             'fees', jsonb_build_object('platform_fee_percent', sh.platform_fee_percent))
           from public.shop_members sm
           join public.shops sh on sh.id = sm.shop_id
           left join public.shop_subscriptions ss on ss.shop_id = sh.id
           where sm.user_id = u.id
           union all
           select jsonb_build_object('kind', 'clip', 'name', c.provider_username)
           from public.clip_profiles c where c.user_id = u.id
           union all
           select jsonb_build_object(
             'kind', 'agents', 'name', nullif(ag.company_name, ''), 'active', ag.activated_at is not null)
           from public.agents_profiles ag where ag.user_id = u.id
           union all
           select jsonb_build_object(
             'kind', 'commercial', 'name', nullif(btrim(concat(co.first_name, ' ', co.last_name)), ''),
             'active', co.ended_at is null or co.ended_at > now())
           from public.commerciaux co where co.user_id = u.id
         ) x), '[]'::jsonb)
  from auth.users u
  where not u.is_anonymous and u.deleted_at is null
  order by u.last_sign_in_at desc nulls last;
end;
$$;

-- Ce à quoi un accès peut être donné.
create function public.admin_account_scopes()
returns table (kind text, id uuid, name text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require();
  return query
  select 'menu'::text, e.id, e.name from public.etablissements e
  union all
  select 'shop'::text, s.id, s.name from public.shops s
  order by 3;
end;
$$;

-- --------------------------------------------------------------------------
-- Écritures. Deux gardes : personne ne se retire son propre accès admin (il
-- reste donc toujours un admin), et un restaurant ou une boutique garde
-- toujours quelqu'un qui peut l'ouvrir en entier. Chacune rend la ligne du
-- journal qu'elle a écrite, nulle si rien n'a changé : la route l'annonce sur
-- Discord.
-- --------------------------------------------------------------------------

create function public.admin_account_set_admin(p_user uuid, p_admin boolean)
returns public.admin_account_events
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
begin
  perform public.admin_require();
  if p_user = auth.uid() and not p_admin then
    raise exception 'Vous ne pouvez pas retirer votre propre accès admin.';
  end if;
  select coalesce(email, phone, '') into v_email from auth.users where id = p_user;
  if v_email is null then
    raise exception 'Compte introuvable.';
  end if;
  if p_admin then
    insert into public.admin_users (user_id, email) values (p_user, v_email)
    on conflict (user_id) do nothing;
    if not found then return null; end if;
  else
    delete from public.admin_users where user_id = p_user;
    if not found then return null; end if;
  end if;
  return public.admin_account_log(p_user, case when p_admin then 'admin_grant' else 'admin_revoke' end, '{}');
end;
$$;

-- Pose, change ou retire (p_role nul) un rôle dans un restaurant ou une boutique.
create function public.admin_account_set_access(p_user uuid, p_kind text, p_scope uuid, p_role text)
returns public.admin_account_events
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_name text;
  v_old text;
begin
  perform public.admin_require();
  if p_user = auth.uid() then
    raise exception 'Vos propres accès se changent depuis un autre compte admin.';
  end if;
  select coalesce(email, phone, '') into v_email from auth.users where id = p_user;
  if v_email is null then
    raise exception 'Compte introuvable.';
  end if;

  if p_kind = 'menu' then
    -- Verrouille le restaurant : deux retraits simultanés ne le vident pas.
    select name into v_name from public.etablissements where id = p_scope for update;
    if v_name is null then
      raise exception 'Restaurant introuvable.';
    end if;
    select role::text into v_old from public.memberships
    where user_id = p_user and etablissement_id = p_scope;
    if v_old = 'gerant' and p_role is distinct from 'gerant' and not exists (
      select 1 from public.memberships
      where etablissement_id = p_scope and role = 'gerant' and user_id <> p_user
    ) then
      raise exception 'C''est le seul gérant de ce restaurant : nommez-en un autre d''abord.';
    end if;
    if p_role is null then
      delete from public.memberships where user_id = p_user and etablissement_id = p_scope;
    else
      insert into public.memberships (user_id, etablissement_id, role, email)
      values (p_user, p_scope, p_role::public.member_role, v_email)
      on conflict (user_id, etablissement_id) do update set role = excluded.role;
      update public.staff set role = p_role::public.member_role
      where etablissement_id = p_scope and user_id = p_user;
    end if;
  elsif p_kind = 'shop' then
    select name into v_name from public.shops where id = p_scope for update;
    if v_name is null then
      raise exception 'Boutique introuvable.';
    end if;
    select role::text into v_old from public.shop_members
    where user_id = p_user and shop_id = p_scope;
    if v_old = 'proprietaire' and p_role is distinct from 'proprietaire' and not exists (
      select 1 from public.shop_members
      where shop_id = p_scope and role = 'proprietaire' and user_id <> p_user
    ) then
      raise exception 'C''est le seul propriétaire de cette boutique : nommez-en un autre d''abord.';
    end if;
    if p_role is null then
      delete from public.shop_members where user_id = p_user and shop_id = p_scope;
    else
      insert into public.shop_members (user_id, shop_id, role, email)
      values (p_user, p_scope, p_role::public.shop_member_role, v_email)
      on conflict (user_id, shop_id) do update set role = excluded.role;
    end if;
  else
    raise exception 'Type d''accès inconnu.';
  end if;

  if v_old is not distinct from p_role then
    return null;
  end if;
  return public.admin_account_log(p_user, 'access', jsonb_build_object(
    'kind', p_kind, 'name', v_name, 'from', v_old, 'to', p_role));
end;
$$;

revoke execute on function public.admin_accounts() from public, anon;
grant execute on function public.admin_accounts() to authenticated;
revoke execute on function public.admin_account_scopes() from public, anon;
grant execute on function public.admin_account_scopes() to authenticated;
revoke execute on function public.admin_account_set_admin(uuid, boolean) from public, anon;
grant execute on function public.admin_account_set_admin(uuid, boolean) to authenticated;
revoke execute on function public.admin_account_set_access(uuid, text, uuid, text) from public, anon;
grant execute on function public.admin_account_set_access(uuid, text, uuid, text) to authenticated;

-- --------------------------------------------------------------------------
-- Comptabilité. Montants TTC en centimes, TVA à part. Un abonnement n'écrit
-- rien chaque mois : ses paiements se déduisent de sa première échéance et de
-- sa périodicité. Un changement de prix clôt l'abonnement et en ouvre un autre,
-- sans quoi le passé changerait avec lui.
-- --------------------------------------------------------------------------

create table public.finance_expenses (
  id uuid primary key default gen_random_uuid(),
  spent_on date not null,
  label text not null check (length(btrim(label)) > 0),
  category text,
  amount_cents int not null check (amount_cents > 0),
  vat_cents int not null default 0,
  receipt_path text,
  note text,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (vat_cents between 0 and amount_cents)
);
create index finance_expenses_spent_on_idx on public.finance_expenses (spent_on desc);

create table public.finance_subscriptions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  category text,
  amount_cents int not null check (amount_cents > 0),
  vat_cents int not null default 0,
  frequency text not null check (frequency in ('monthly', 'yearly')),
  -- Première échéance : elle fixe aussi le jour de chaque paiement.
  starts_on date not null,
  ends_on date,
  note text,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (vat_cents between 0 and amount_cents),
  check (ends_on is null or ends_on >= starts_on)
);

alter table public.finance_expenses enable row level security;
create policy "admin all" on public.finance_expenses
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

alter table public.finance_subscriptions enable row level security;
create policy "admin all" on public.finance_subscriptions
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Justificatifs : bucket privé, réservé aux admins.
insert into storage.buckets (id, name, public)
values ('finance-docs', 'finance-docs', false);

create policy "finance-docs admin" on storage.objects
  for all to authenticated
  using (bucket_id = 'finance-docs' and (select public.is_admin()))
  with check (bucket_id = 'finance-docs' and (select public.is_admin()));

-- La commission d'une part de bulle, figée au paiement comme celle d'une
-- commande : changer le taux d'un client ne réécrit pas ses recettes passées.
alter table public.bulle_parts add column fee_cents integer;

-- Recettes d'Ominin par mois (heure de Paris) et par encaisseur : paiements,
-- montant encaissé par le client, commission. Hors démos et paiements simulés,
-- mêmes règles que l'assiette des commerciaux (commercial_base), sans sa limite
-- aux clients apportés. Les factures Stripe, absentes de la base avant leur
-- webhook, sont lues chez Stripe par la route serveur.
create function public.admin_revenue_months()
returns table (month date, source text, provider text, payments bigint, volume_cents bigint, fee_cents bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require();
  return query
  select x.m, x.src, x.prov, count(*)::bigint, sum(x.volume)::bigint, sum(x.fee)::bigint
  from (
    select case when o.type = 'collect' then 'collect' else 'menu' end as src,
           case when o.square_payment_id is not null then 'square'
                when o.stripe_payment_intent_id is not null or o.stripe_session_id is not null then 'stripe'
                else e.payment_provider::text end as prov,
           date_trunc('month', o.created_at at time zone 'Europe/Paris')::date as m,
           coalesce((select round(sum(oi.quantity * oi.unit_price) * 100)
                     from public.order_items oi where oi.order_id = o.id), 0) as volume,
           coalesce(o.platform_fee_cents, 0) as fee
    from public.orders o
    join public.etablissements e on e.id = o.etablissement_id
    where o.paid_online and o.status <> 'annulee' and not e.demo
      and e.payment_provider is distinct from 'demo'
    union all
    select 'bulles', 'square', date_trunc('month', p.paid_at at time zone 'Europe/Paris')::date,
           p.amount_cents, coalesce(p.fee_cents, 0)
    from public.bulle_parts p
    join public.etablissements e on e.id = p.etablissement_id
    where p.status = 'payee' and p.method = 'en_ligne' and p.square_payment_id is not null and not e.demo
    union all
    select 'shop', 'stripe', date_trunc('month', o.paid_at at time zone 'Europe/Paris')::date,
           o.total_cents, coalesce(o.platform_fee_cents, 0)
    from public.shop_orders o
    join public.shops s on s.id = o.shop_id
    where o.paid_at is not null and not s.demo
    union all
    select 'club',
           case when p.stripe_payment_intent_id is not null then 'stripe' else e.payment_provider::text end,
           date_trunc('month', p.paid_at at time zone 'Europe/Paris')::date,
           p.amount_cents, p.fee_cents
    from public.club_payments p
    join public.etablissements e on e.id = p.etablissement_id
    where p.status = 'payee' and p.refunded_at is null and not e.demo
    union all
    select 'manual', null, date_trunc('month', i.paid_at at time zone 'Europe/Paris')::date,
           i.eligible_ht_cents - i.credited_cents, i.eligible_ht_cents - i.credited_cents
    from public.ominin_invoice_payments i
    where i.stripe_invoice_id is null
  ) x
  group by x.m, x.src, x.prov
  order by x.m;
end;
$$;
revoke execute on function public.admin_revenue_months() from public, anon;
grant execute on function public.admin_revenue_months() to authenticated;

-- --------------------------------------------------------------------------
-- Prestataires, échéances, documents. Jamais de mot de passe ici : le
-- prestataire dit qui détient le compte, pas comment l'ouvrir.
-- --------------------------------------------------------------------------

create table public.company_vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  purpose text,
  url text,
  account_holder text,
  access_people text,
  plan text,
  free_limits text,
  renewal_on date,
  subscription_id uuid references public.finance_subscriptions (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create table public.company_deadlines (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) > 0),
  category text,
  due_on date not null,
  recurrence text not null default 'none' check (recurrence in ('none', 'monthly', 'quarterly', 'yearly')),
  done_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);
create index company_deadlines_due_idx on public.company_deadlines (due_on) where done_at is null;

create table public.company_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) > 0),
  category text,
  path text not null,
  file_name text not null,
  issued_on date,
  expires_on date,
  note text,
  created_at timestamptz not null default now()
);

do $$
declare
  v_table text;
begin
  foreach v_table in array array['company_vendors', 'company_deadlines', 'company_documents'] loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format(
      'create policy "admin all" on public.%I for all to authenticated
         using ((select public.is_admin())) with check ((select public.is_admin()))', v_table);
  end loop;
end $$;
