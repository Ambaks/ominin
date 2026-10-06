-- Section Clients de l'admin pour Shop, Clip et Agents : une ligne par client
-- sur une période, même principe que admin_menu_overview (SECURITY DEFINER
-- gardé par is_admin(), plutôt qu'une policy admin sur des tables dont RLS ne
-- connaît que leur propriétaire). La période d'avant se lit par un second
-- appel : l'écran compare les deux.

-- Boutiques. Le chiffre suit paid_at ; une commande remboursée ensuite reste
-- comptée dans sa période d'encaissement et apparaît dans refunded.
create function public.admin_shop_overview(p_from timestamptz, p_to timestamptz)
returns table (
  shop_id uuid,
  name text,
  slug text,
  is_active boolean,
  created_at timestamptz,
  owner_email text,
  subscription_status text,
  charges_enabled boolean,
  paid_orders int,
  revenue_cents bigint,
  fee_cents bigint,
  refunded int,
  to_prepare int,
  last_paid_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with period as (
    select o.shop_id,
           count(*)::int as paid_orders,
           sum(o.total_cents)::bigint as revenue_cents,
           sum(o.platform_fee_cents)::bigint as fee_cents,
           count(*) filter (
             where o.payment_status in ('refunded', 'partially_refunded')
           )::int as refunded
    from shop_orders o
    where o.paid_at >= p_from and o.paid_at < p_to
    group by o.shop_id
  ),
  standing as (
    select o.shop_id,
           count(*) filter (where o.status in ('paid', 'preparing'))::int
             as to_prepare,
           max(o.paid_at) as last_paid_at
    from shop_orders o
    group by o.shop_id
  ),
  owners as (
    select m.shop_id, min(m.email) as email
    from shop_members m
    where m.role = 'proprietaire'
    group by m.shop_id
  )
  select s.id, s.name, s.slug, s.is_active, s.created_at, owners.email,
         sub.status, coalesce(pa.charges_enabled, false),
         coalesce(period.paid_orders, 0), coalesce(period.revenue_cents, 0),
         coalesce(period.fee_cents, 0), coalesce(period.refunded, 0),
         coalesce(standing.to_prepare, 0), standing.last_paid_at
  from shops s
  left join period on period.shop_id = s.id
  left join standing on standing.shop_id = s.id
  left join owners on owners.shop_id = s.id
  left join shop_subscriptions sub on sub.shop_id = s.id
  left join shop_payment_accounts pa on pa.shop_id = s.id
  where (select public.is_admin())
  order by s.name;
$$;

-- Clippeurs : ceux qui ont relié leur profil de publication.
create function public.admin_clip_overview(p_from timestamptz, p_to timestamptz)
returns table (
  user_id uuid,
  email text,
  linked_at timestamptz,
  posts int,
  published int,
  partial int,
  failed int,
  platforms text[],
  last_post_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with period as (
    select p.user_id,
           count(*)::int as posts,
           count(*) filter (where p.status = 'publie')::int as published,
           count(*) filter (where p.status = 'partiel')::int as partial,
           count(*) filter (where p.status = 'echec')::int as failed
    from clip_posts p
    where p.created_at >= p_from and p.created_at < p_to
    group by p.user_id
  ),
  mix as (
    select p.user_id, array_agg(distinct platform order by platform) as platforms
    from clip_posts p, unnest(p.platforms) as platform
    where p.created_at >= p_from and p.created_at < p_to
    group by p.user_id
  ),
  latest as (
    select p.user_id, max(p.created_at) as last_post_at
    from clip_posts p
    group by p.user_id
  )
  select c.user_id, u.email::text, c.created_at,
         coalesce(period.posts, 0), coalesce(period.published, 0),
         coalesce(period.partial, 0), coalesce(period.failed, 0),
         coalesce(mix.platforms, '{}'), latest.last_post_at
  from clip_profiles c
  join auth.users u on u.id = c.user_id
  left join period on period.user_id = c.user_id
  left join mix on mix.user_id = c.user_id
  left join latest on latest.user_id = c.user_id
  where (select public.is_admin())
  order by c.created_at;
$$;

-- Entreprises équipées de l'agent. Ce qui casse se lit sans seuil : boîte à
-- reconnecter, erreur au dernier passage, réponses qui attendent le client.
create function public.admin_agents_overview(p_from timestamptz, p_to timestamptz)
returns table (
  user_id uuid,
  company_name text,
  email text,
  mailbox_email text,
  mailbox_error text,
  enabled boolean,
  mode text,
  activated_at timestamptz,
  last_run_at timestamptz,
  last_error text,
  prospects int,
  sent int,
  replies int,
  interested int,
  pending_approval int
)
language sql
stable
security definer
set search_path = public
as $$
  with found as (
    select p.user_id, count(*)::int as prospects
    from agents_prospects p
    where p.created_at >= p_from and p.created_at < p_to
    group by p.user_id
  ),
  mail as (
    select e.user_id,
           count(*) filter (
             where e.direction = 'outbound' and e.status = 'sent'
               and e.sent_at >= p_from and e.sent_at < p_to
           )::int as sent,
           count(*) filter (
             where e.direction = 'inbound'
               and e.received_at >= p_from and e.received_at < p_to
           )::int as replies,
           count(*) filter (
             where e.direction = 'inbound'
               and e.classification in ('interested', 'meeting_request')
               and e.received_at >= p_from and e.received_at < p_to
           )::int as interested,
           count(*) filter (where e.status = 'pending_approval')::int
             as pending_approval
    from agents_emails e
    group by e.user_id
  )
  select a.user_id, a.company_name, u.email::text, mb.email, mb.error,
         a.enabled, a.mode, a.activated_at, a.last_run_at, a.last_error,
         coalesce(found.prospects, 0), coalesce(mail.sent, 0),
         coalesce(mail.replies, 0), coalesce(mail.interested, 0),
         coalesce(mail.pending_approval, 0)
  from agents_profiles a
  join auth.users u on u.id = a.user_id
  left join agents_mailboxes mb on mb.user_id = a.user_id
  left join found on found.user_id = a.user_id
  left join mail on mail.user_id = a.user_id
  where (select public.is_admin())
  order by a.company_name;
$$;

revoke execute on function
  public.admin_shop_overview(timestamptz, timestamptz) from public, anon;
revoke execute on function
  public.admin_clip_overview(timestamptz, timestamptz) from public, anon;
revoke execute on function
  public.admin_agents_overview(timestamptz, timestamptz) from public, anon;

grant execute on function
  public.admin_shop_overview(timestamptz, timestamptz) to authenticated;
grant execute on function
  public.admin_clip_overview(timestamptz, timestamptz) to authenticated;
grant execute on function
  public.admin_agents_overview(timestamptz, timestamptz) to authenticated;
