-- La répartition des cartes d'un restaurant pour l'analytique admin : une ligne
-- par valeur connue de chaque critère. Les tentatives en cours n'ont pas encore
-- d'issue, celles sans carte connue n'entrent nulle part. Le pays n'est donné
-- que par Stripe : c'est lui qui distingue une carte saisie d'un portefeuille
-- inconnu.
create function public.admin_payment_cards(
  p_etab uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  dimension text,
  value text,
  attempts int,
  succeeded int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    d.dimension,
    d.value,
    count(*)::int,
    count(*) filter (where t.outcome = 'reussi')::int
  from online_payment_attempts t
  cross join lateral (values
    ('funding', t.card_funding),
    ('country', t.card_country),
    ('three_ds', t.three_ds),
    ('brand', t.card_brand),
    ('wallet', case
      when t.card_wallet is not null then t.card_wallet
      when t.card_country is not null then 'none'
    end)
  ) as d (dimension, value)
  where (select public.is_admin())
    and t.etablissement_id = p_etab
    and t.started_at >= p_from
    and t.started_at < p_to
    and t.outcome <> 'en_cours'
    and d.value is not null
  group by d.dimension, d.value
  order by d.dimension, count(*) desc, d.value;
$$;

revoke execute on function
  public.admin_payment_cards(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function
  public.admin_payment_cards(uuid, timestamptz, timestamptz) to authenticated;
