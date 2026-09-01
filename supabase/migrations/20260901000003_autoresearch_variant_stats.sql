-- Taux de réponse par jeu de règles de rédaction, pour AutoResearch.
--
-- Un e-mail à froid compte comme « envoyé » une fois tranché : plus ancien
-- que la fenêtre de réponse (settled_before) ou déjà répondu — un envoi
-- récent sans réponse n'est pas encore un silence. Les rebonds ne sont pas
-- des réponses. variant_id null = règles par défaut codées dans le backend.
-- Service_role uniquement (agent Python).

create or replace function public.outreach_variant_stats(settled_before timestamptz)
returns table (variant_id uuid, sent bigint, responded bigint)
language sql
stable
set search_path = public
as $$
  with cold as (
    select restaurant_id, (metadata->>'variant_id')::uuid as variant_id, sent_at
    from public.outreach_emails
    where direction = 'outbound' and kind = 'cold' and status = 'sent'
  ),
  replied as (
    select distinct restaurant_id
    from public.outreach_emails
    where direction = 'inbound' and status = 'received'
      and (classification is null or classification <> 'bounce')
  )
  select
    c.variant_id,
    count(*) filter (
      where c.sent_at < settled_before or r.restaurant_id is not null
    ) as sent,
    count(r.restaurant_id) as responded
  from cold c
  left join replied r using (restaurant_id)
  group by c.variant_id;
$$;

revoke execute on function public.outreach_variant_stats(timestamptz)
  from public, anon, authenticated;
grant execute on function public.outreach_variant_stats(timestamptz)
  to service_role;
