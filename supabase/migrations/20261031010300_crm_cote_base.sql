-- Le CRM ne charge plus ses 8 000 fiches à l'ouverture : la base filtre, trie,
-- cherche et compte. Invoker : la RLS des tables reste la seule autorité.

create function public.crm_leads_page(
  p_product text,
  p_statuses text[],
  p_categories text[],
  p_cities text[],
  p_has_email boolean,
  p_has_phone boolean,
  p_has_website boolean,
  p_has_follow_up boolean,
  p_restaurant_ids uuid[],
  p_contact_before timestamptz,
  p_tokens text[],
  p_sort text,
  p_order text[],
  p_desc boolean,
  p_limit int,
  p_offset int
)
returns table (
  id uuid,
  lead_id uuid,
  name text,
  category text,
  city text,
  address text,
  latitude double precision,
  longitude double precision,
  phone text,
  email text,
  website text,
  owner_name text,
  created_at timestamptz,
  status text,
  priority text,
  last_contact_at timestamptz,
  next_follow_up_at timestamptz,
  target_products text[],
  total int
)
language sql stable
set search_path = public
as $$
  with matched as (
    select r.id, l.id as lead_id, r.name, r.category::text as category, r.city, r.address,
           r.latitude::double precision as latitude, r.longitude::double precision as longitude,
           r.phone, r.email, r.website, r.owner_name, r.created_at,
           l.status::text as status, l.priority::text as priority,
           l.last_contact_at, l.next_follow_up_at, l.target_products::text[] as target_products,
           case p_sort
             when 'city' then lower(coalesce(r.city, ''))
             when 'category' then lpad(array_position(p_order, r.category::text)::text, 3, '0')
             when 'status' then lpad(array_position(p_order, l.status::text)::text, 3, '0')
             when 'lastContactAt' then coalesce(l.last_contact_at::text, '')
             when 'nextFollowUpAt' then coalesce(l.next_follow_up_at::text, '9999')
             else lower(r.name)
           end as sort_key
    from crm_restaurants r
    join crm_leads l on l.restaurant_id = r.id
    where r.deleted_at is null
      and (p_product is null or p_product = any(l.target_products::text[]))
      and (p_statuses is null or l.status::text = any(p_statuses))
      and (p_categories is null or r.category::text = any(p_categories))
      and (p_cities is null or r.city = any(p_cities))
      and (not p_has_email or r.email is not null)
      and (not p_has_phone or r.phone is not null)
      and (not p_has_website or r.website is not null)
      and (not p_has_follow_up or l.next_follow_up_at is not null)
      and (p_restaurant_ids is null or r.id = any(p_restaurant_ids))
      and (p_contact_before is null or l.last_contact_at is null or l.last_contact_at < p_contact_before)
      and not exists (
        select 1 from unnest(p_tokens) token
        where position(token in translate(
          lower(concat_ws(' ', r.name, r.city, r.address, r.phone, r.email, r.owner_name)),
          'àâäáãåçéèêëíìîïñóòôöõúùûüýÿ',
          'aaaaaaceeeeiiiinooooouuuuyy'
        )) = 0
      )
  )
  select m.id, m.lead_id, m.name, m.category, m.city, m.address, m.latitude, m.longitude,
         m.phone, m.email, m.website, m.owner_name, m.created_at, m.status, m.priority,
         m.last_contact_at, m.next_follow_up_at, m.target_products,
         (count(*) over ())::int
  from matched m
  order by case when p_desc then m.sort_key end desc,
           case when not p_desc then m.sort_key end asc,
           m.id
  limit p_limit offset p_offset;
$$;

-- Les chiffres de l'aperçu : par statut, les fiches et leurs relances.
create function public.crm_lead_summary(
  p_product text,
  p_today timestamptz,
  p_tomorrow timestamptz,
  p_week_end timestamptz
)
returns table (status text, leads int, overdue int, due_today int, upcoming int)
language sql stable
set search_path = public
as $$
  select l.status::text,
         count(*)::int,
         count(*) filter (where l.next_follow_up_at < p_today)::int,
         count(*) filter (where l.next_follow_up_at >= p_today and l.next_follow_up_at < p_tomorrow)::int,
         count(*) filter (where l.next_follow_up_at >= p_tomorrow and l.next_follow_up_at < p_week_end)::int
  from crm_restaurants r
  join crm_leads l on l.restaurant_id = r.id
  where r.deleted_at is null
    and (p_product is null or p_product = any(l.target_products::text[]))
  group by l.status;
$$;

-- Le choix de villes du volet Filtres.
create function public.crm_cities(p_product text)
returns setof text
language sql stable
set search_path = public
as $$
  select distinct r.city
  from crm_restaurants r
  join crm_leads l on l.restaurant_id = r.id
  where r.deleted_at is null and r.city is not null
    and (p_product is null or p_product = any(l.target_products::text[]))
  order by 1;
$$;

revoke execute on function public.crm_leads_page(text, text[], text[], text[], boolean, boolean, boolean, boolean, uuid[], timestamptz, text[], text, text[], boolean, int, int) from public, anon;
revoke execute on function public.crm_lead_summary(text, timestamptz, timestamptz, timestamptz) from public, anon;
revoke execute on function public.crm_cities(text) from public, anon;
grant execute on function public.crm_leads_page(text, text[], text[], text[], boolean, boolean, boolean, boolean, uuid[], timestamptz, text[], text, text[], boolean, int, int) to authenticated;
grant execute on function public.crm_lead_summary(text, timestamptz, timestamptz, timestamptz) to authenticated;
grant execute on function public.crm_cities(text) to authenticated;
