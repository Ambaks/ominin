-- Encaissement par article. Une table règle souvent son addition en
-- plusieurs fois (chacun sa part, un mode par règlement) : ce qui est déjà
-- encaissé doit survivre à la fermeture de l'écran et se voir depuis tout
-- appareil. Chaque ligne de commande porte donc son règlement ; la commande
-- passe « payée » quand toutes ses lignes le sont, avec le mode unique ou
-- « mixte » si carte et espèces se sont partagé l'addition.

alter table public.order_items
  add column paid_mode public.payment_mode,
  add column paid_at timestamptz,
  add constraint order_items_paid_consistent
    check ((paid_mode is null) = (paid_at is null)),
  -- Une ligne se règle d'un seul tenant : le mixte n'existe qu'à l'échelle
  -- de la commande.
  add constraint order_items_paid_mode_simple
    check (paid_mode <> 'mixte');

-- Les commandes déjà encaissées : leurs lignes héritent du mode de la
-- commande (le règlement en ligne prime sur la colonne, comme à l'affichage).
update public.order_items oi
set paid_mode = case when o.paid_online then 'en_ligne' else o.payment_mode end,
    paid_at = o.created_at
from public.orders o
where o.id = oi.order_id
  and o.status in ('payee', 'retiree')
  and (o.paid_online or o.payment_mode is not null);

-- Un règlement en espèces peut clore une addition mixte.
alter table public.orders drop constraint cash_fields_require_especes;
alter table public.orders
  add constraint cash_fields_require_especes
    check (
      (cash_given is null and cash_change is null)
      or payment_mode in ('especes', 'mixte')
    );

-- ---------------------------------------------------------------------------
-- Règlement d'une sélection d'articles (commandes servies d'une même table
-- ou d'un même groupe). Transactionnel : marque les lignes, pose le
-- pourboire, clôt les commandes entièrement réglées. SECURITY DEFINER car
-- order_items n'a pas de policy d'écriture ; les triggers de droits et de
-- transition sur orders s'appliquent toujours (auth.uid() reste l'appelant).
-- Les montants en espèces (reçu / rendu) sont ceux du règlement : ils sont
-- posés sur les commandes que ce règlement clôt.

create or replace function public.pay_order_items(
  p_item_ids uuid[],
  p_mode public.payment_mode,
  p_cash_given numeric default null,
  p_cash_change numeric default null,
  p_tip numeric default null
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_etab uuid;
  v_role public.member_role;
  v_order_ids uuid[];
  v_order_id uuid;
  v_tip_order uuid;
  v_mode public.payment_mode;
begin
  if p_mode not in ('especes', 'carte') then
    raise exception 'Mode de paiement invalide.';
  end if;
  if p_mode <> 'especes' and (p_cash_given is not null or p_cash_change is not null) then
    raise exception 'Montants en espèces sans règlement en espèces.';
  end if;
  if p_tip is not null and p_tip < 0 then
    raise exception 'Pourboire invalide.';
  end if;
  if array_length(p_item_ids, 1) is null then
    raise exception 'Aucun article sélectionné.';
  end if;
  if exists (
    select 1 from unnest(p_item_ids) as t(id)
    where not exists (select 1 from order_items oi where oi.id = t.id)
  ) then
    raise exception 'Article introuvable.';
  end if;

  select array_agg(id) into v_order_ids
  from (
    select distinct o.id
    from orders o
    join order_items oi on oi.order_id = o.id
    where oi.id = any(p_item_ids)
  ) s;

  -- Verrou : deux encaissements simultanés de la même table se sérialisent,
  -- le second voit les articles déjà réglés par le premier.
  perform 1 from orders where id = any(v_order_ids) for update;

  select etablissement_id into v_etab from orders where id = v_order_ids[1];
  if exists (
    select 1 from orders
    where id = any(v_order_ids) and etablissement_id <> v_etab
  ) then
    raise exception 'Les articles doivent appartenir au même établissement.';
  end if;
  -- Un non-membre n'a pas de rôle : le null ne doit pas passer le test.
  v_role := current_member_role(v_etab);
  if v_role is null or v_role not in ('gerant', 'serveur') then
    raise exception 'Modification non autorisée.';
  end if;
  if exists (
    select 1 from orders
    where id = any(v_order_ids) and (status <> 'servie' or paid_online)
  ) then
    raise exception 'Seules les commandes servies et non réglées en ligne s''encaissent.';
  end if;
  if exists (
    select 1 from order_items where id = any(p_item_ids) and paid_mode is not null
  ) then
    raise exception 'Certains articles sont déjà encaissés.';
  end if;

  -- Le pourboire du règlement va à la plus ancienne commande touchée (son
  -- server_id l'attribue) ; posé avant la clôture, que le trigger de droits
  -- du serveur interdit de retoucher une fois la commande payée.
  if coalesce(p_tip, 0) > 0 then
    select id into v_tip_order from orders
    where id = any(v_order_ids)
    order by created_at
    limit 1;
    update orders
    set tip_amount = coalesce(tip_amount, 0) + p_tip
    where id = v_tip_order;
  end if;

  update order_items
  set paid_mode = p_mode, paid_at = now()
  where id = any(p_item_ids);

  for v_order_id in
    select id from orders where id = any(v_order_ids) order by created_at
  loop
    if exists (
      select 1 from order_items where order_id = v_order_id and paid_mode is null
    ) then
      continue;
    end if;
    -- Ce règlement a touché la commande : un seul mode distinct, c'est le sien.
    select case when count(distinct paid_mode) = 1 then p_mode else 'mixte' end
      into v_mode
    from order_items
    where order_id = v_order_id;
    update orders
    set status = 'payee',
        payment_mode = v_mode,
        cash_given = case when p_mode = 'especes' then p_cash_given end,
        cash_change = case when p_mode = 'especes' then p_cash_change end
    where id = v_order_id;
  end loop;
end;
$$;

revoke execute on function public.pay_order_items(uuid[], public.payment_mode, numeric, numeric, numeric) from public, anon;
grant execute on function public.pay_order_items(uuid[], public.payment_mode, numeric, numeric, numeric) to authenticated;
