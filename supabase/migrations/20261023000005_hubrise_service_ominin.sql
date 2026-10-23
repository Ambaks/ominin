-- HubRise quand l'équipe mène le service dans Ominin (fast food, retrait au
-- bar) : la caisse reçoit les commandes, l'équipe les encaisse, les dit
-- prêtes et les remet dans Ominin — ou les encaisse à la caisse. Les deux
-- marchent, chaque règlement n'est noté qu'une fois de chaque côté :
--   - encaissée dans Ominin, la commande porte ses règlements chez HubRise
--     (file « order_payments ») ; une correction les remplace ;
--   - encaissée à la caisse, ses règlements reviennent par le callback et
--     Ominin la marque réglée (hubrise_record_till_payment), sans les
--     renvoyer ;
--   - prête puis remise, la caisse le sait (file « order_status »).

alter table public.hubrise_outbox
  drop constraint hubrise_outbox_kind_check,
  add constraint hubrise_outbox_kind_check check (
    kind in ('order', 'order_cancel', 'stock', 'order_payments', 'order_status')
  );

-- Les codes des modes de paiement de la caisse pour un règlement au comptoir
-- (ceux d'Ominin : espèces, carte), comme payment_ref pour le paiement en ligne.
alter table public.hubrise_connections
  add column payment_ref_cash text,
  add column payment_ref_card text;

-- Une jambe venue de la caisse par HubRise : elle y est déjà, elle n'y repart pas.
alter table public.order_payments
  add column till_payment boolean not null default false;

-- L'établissement est relié à HubRise : l'espace ne réveille la file d'envoi
-- (/api/hubrise/kick) que pour lui, pas à chaque geste de tous les autres.
-- Tenu par la connexion elle-même.
alter table public.etablissements
  add column hubrise_connected boolean not null default false;

update public.etablissements
set hubrise_connected = true
where id in (select etablissement_id from public.hubrise_connections);

create function public.hubrise_mark_connected()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  update etablissements
  set hubrise_connected = (tg_op = 'INSERT')
  where id = coalesce(new.etablissement_id, old.etablissement_id);
  return null;
end;
$$;

create trigger hubrise_mark_connected
  after insert or delete on public.hubrise_connections
  for each row execute function public.hubrise_mark_connected();

revoke execute on function public.hubrise_mark_connected() from public, anon, authenticated;

-- Met (ou remet) en file l'envoi d'un état de la commande : la ligne déjà
-- passée repart, avec ses essais remis à zéro — l'envoi en cours, s'il y en
-- a un, ne la marquera pas « sent » (il compare ses essais), elle sera
-- rejouée avec l'état d'alors. Encore en file (prise, ou en attente d'un
-- nouvel essai), elle garde son délai (next_attempt_at, posé à sa prise) :
-- deux envois de la même commande en même temps ajouteraient deux fois un
-- règlement. Terminée, elle repart tout de suite.
create function public.hubrise_enqueue_sync(p_etab uuid, p_order uuid, p_kind text)
returns void
language sql security definer
set search_path = public
as $$
  insert into hubrise_outbox (etablissement_id, kind, order_id)
  select p_etab, p_kind, p_order
  where exists (select 1 from hubrise_connections where etablissement_id = p_etab)
  on conflict (order_id, kind) where order_id is not null
  do update set
    status = 'pending',
    attempts = 0,
    next_attempt_at = case
      when hubrise_outbox.status = 'pending' then greatest(hubrise_outbox.next_attempt_at, now())
      else now()
    end,
    last_error = null;
$$;

revoke execute on function public.hubrise_enqueue_sync(uuid, uuid, text) from public, anon, authenticated;

-- Les règlements d'une commande ont changé (encaissement, correction,
-- annulation) : ceux d'Ominin repartent chez HubRise. Une commande qu'on
-- supprime emporte ses jambes sans rien envoyer ; celles venues de la caisse
-- n'ont rien à y porter.
create function public.hubrise_enqueue_payments()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_order uuid := coalesce(new.order_id, old.order_id);
  v_etab uuid;
begin
  if coalesce(new.till_payment, old.till_payment) then
    return null;
  end if;
  select etablissement_id into v_etab from orders where id = v_order;
  if v_etab is not null then
    perform hubrise_enqueue_sync(v_etab, v_order, 'order_payments');
  end if;
  return null;
end;
$$;

create trigger hubrise_enqueue_payments
  after insert or delete on public.order_payments
  for each row execute function public.hubrise_enqueue_payments();

-- Une commande numérotée devient prête, est remise, ou repart en préparation
-- après un « Prête » trop tôt : la caisse le sait. Les autres changements
-- (règlement, annulation) ont leur propre envoi.
create function public.hubrise_enqueue_status()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  perform hubrise_enqueue_sync(new.etablissement_id, new.id, 'order_status');
  return null;
end;
$$;

create trigger hubrise_enqueue_status
  after update of status on public.orders
  for each row
  when (
    new.order_number is not null
    and new.status is distinct from old.status
    and (new.status in ('prete', 'servie') or old.status = 'prete')
  )
  execute function public.hubrise_enqueue_status();

revoke execute on function public.hubrise_enqueue_payments() from public, anon, authenticated;
revoke execute on function public.hubrise_enqueue_status() from public, anon, authenticated;

-- Encaissée à la caisse : ses règlements (p_payments : [{amount, cash}]),
-- relus chez HubRise, couvrent la commande — elle passe réglée dans Ominin,
-- comme un encaissement au comptoir : jambes, lignes, mode, et la cuisine.
-- Ne fait rien (false) pour une commande déjà réglée, même en partie, réglée
-- en ligne ou en cours de paiement, ni si la caisse n'a pas tout encaissé.
-- La marchandise seulement : ce que la caisse a pris de plus (pourboire,
-- arrondi) reste à la caisse.
create function public.hubrise_record_till_payment(p_order uuid, p_payments jsonb)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_due numeric;
  v_paid numeric;
  v_cash numeric;
  v_mode public.payment_mode;
  v_printed boolean;
begin
  select * into v_order from orders where id = p_order for update;
  if v_order.id is null
     or v_order.type <> 'sur_place'
     or v_order.status <> 'en_attente'
     or v_order.payment_mode is not null
     or v_order.paid_online
     or v_order.online_payment_started_at is not null
     or exists (select 1 from order_items where order_id = p_order and paid_mode is not null) then
    return false;
  end if;

  select coalesce(sum(quantity * unit_price), 0) into v_due
  from order_items where order_id = p_order;
  select coalesce(sum((value->>'amount')::numeric), 0),
         coalesce(sum((value->>'amount')::numeric) filter (where (value->>'cash')::boolean), 0)
    into v_paid, v_cash
  from jsonb_array_elements(coalesce(p_payments, '[]'::jsonb));
  if v_due <= 0 or v_paid < v_due then
    return false;
  end if;

  -- Les espèces d'abord, la carte pour le reste : le partage de
  -- pay_order_items_internal.
  v_cash := least(v_cash, v_due);
  v_mode := case when v_cash = 0 then 'carte' when v_cash = v_due then 'especes' else 'mixte' end;
  if v_cash > 0 then
    insert into order_payments (order_id, mode, amount, till_payment)
    values (p_order, 'especes', v_cash, true);
  end if;
  if v_due > v_cash then
    insert into order_payments (order_id, mode, amount, till_payment)
    values (p_order, 'carte', v_due - v_cash, true);
  end if;

  update order_items set paid_mode = v_mode, paid_at = now() where order_id = p_order;
  v_printed := printer_online(v_order.etablissement_id);
  if v_printed then
    update order_items set served_at = now() where order_id = p_order;
  end if;
  update orders
  set status = (case when v_printed then 'servie' else 'payee' end)::public.order_status,
      payment_mode = v_mode
  where id = p_order;
  return true;
end;
$$;

revoke execute on function public.hubrise_record_till_payment(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.hubrise_record_till_payment(uuid, jsonb) to service_role;
