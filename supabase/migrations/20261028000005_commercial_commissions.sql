-- Espace commercial, lot 3 : la commission (article 4 du contrat, section 4.4
-- du cahier) et les relevés (article 5).
--
-- L'assiette d'un Client Apporté, chaque montant imputé au mois de son
-- encaissement, hors démos et paiements simulés :
--   Menu et Collect : orders.platform_fee_cents des commandes payées en ligne
--     non annulées, au mois de created_at ;
--   Shop : shop_orders.platform_fee_cents des commandes payées, au mois de
--     paid_at, même remboursées (le remboursement Shop ne rend pas les frais) ;
--   Club : club_payments.fee_cents payés et non remboursés, au mois de
--     paid_at — seulement si l'admin les a inclus (décision n° 2) ;
--   Factures Ominin : ominin_invoice_payments, lignes d'abonnement et de
--     commission facturée seulement (prix Stripe éligibles réglés par l'admin),
--     remises déduites, avoirs retranchés au mois de l'encaissement, plus les
--     encaissements hors Stripe saisis par l'admin.
-- La période : de commission_from à commission_from + durée, bornée par le
-- départ du client. Le relevé fige ses lignes à l'envoi ; ce que la base
-- apprend ensuite d'un mois figé devient une régularisation automatique.

-- ---------------------------------------------------------------------------
-- Réglages : prix Stripe éligibles (décision n° 5), frais Club (décision n° 2).
alter table public.commercial_settings
  add column eligible_stripe_prices text[] not null default '{}',
  add column club_fees_included boolean;

-- ---------------------------------------------------------------------------
-- Encaissements des factures Ominin (webhooks invoice.paid et credit_note.*)
-- et saisies hors Stripe de l'admin (stripe_invoice_id nul).
create table public.ominin_invoice_payments (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid references public.etablissements (id),
  shop_id uuid references public.shops (id),
  stripe_invoice_id text unique,
  eligible_ht_cents int not null check (eligible_ht_cents >= 0),
  paid_at timestamptz not null,
  -- Part éligible des avoirs émis sur la facture (régularisation).
  credited_cents int not null default 0,
  note text,
  created_at timestamptz not null default now(),
  check (num_nonnulls(etablissement_id, shop_id) = 1),
  check (stripe_invoice_id is not null or note is not null),
  check (credited_cents between 0 and eligible_ht_cents)
);
create index ominin_invoice_payments_etablissement_idx on public.ominin_invoice_payments (etablissement_id, paid_at);
create index ominin_invoice_payments_shop_idx on public.ominin_invoice_payments (shop_id, paid_at);

alter table public.ominin_invoice_payments enable row level security;
create policy "admin all" on public.ominin_invoice_payments
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Assiette d'un Client Apporté sur [p_from, p_to), en centimes, par source.
create function public.commercial_base(c public.commercial_clients, p_from timestamptz, p_to timestamptz)
returns table (menu_cents bigint, shop_cents bigint, club_cents bigint, invoice_cents bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with cfg as (select * from public.commercial_cfg()),
  span as (
    select greatest(p_from, c.commission_from) as lo,
           least(p_to, c.commission_from + make_interval(months => cfg.term_months),
                 coalesce(c.ended_at, 'infinity')) as hi
    from cfg
    where c.commission_from is not null and c.validated_at is not null
  )
  select
    coalesce((select sum(o.platform_fee_cents)::bigint from public.orders o
              join public.etablissements e on e.id = o.etablissement_id, span
              where o.etablissement_id = c.etablissement_id and o.paid_online and o.status <> 'annulee'
                and not e.demo and e.payment_provider is distinct from 'demo'
                and o.created_at >= span.lo and o.created_at < span.hi), 0),
    coalesce((select sum(o.platform_fee_cents)::bigint from public.shop_orders o
              join public.shops s on s.id = o.shop_id, span
              where o.shop_id = c.shop_id and o.paid_at is not null and not s.demo
                and o.paid_at >= span.lo and o.paid_at < span.hi), 0),
    coalesce((select sum(p.fee_cents)::bigint from public.club_payments p
              join public.etablissements e on e.id = p.etablissement_id, span, cfg
              where cfg.club_fees_included and p.etablissement_id = c.etablissement_id
                and p.status = 'payee' and p.refunded_at is null and not e.demo
                and p.paid_at >= span.lo and p.paid_at < span.hi), 0),
    coalesce((select sum(i.eligible_ht_cents - i.credited_cents)::bigint from public.ominin_invoice_payments i, span
              where (i.etablissement_id = c.etablissement_id or i.shop_id = c.shop_id)
                and i.paid_at >= span.lo and i.paid_at < span.hi), 0);
$$;
revoke execute on function public.commercial_base(public.commercial_clients, timestamptz, timestamptz)
  from public, anon, authenticated;

-- Lignes d'un mois (premier jour, heure de Paris) pour un commercial : une
-- par Client Apporté validé, avec sa commission.
create function public.commercial_month_lines(p_commercial uuid, p_month date)
returns table (
  client_id uuid, restaurant_id uuid, name text,
  menu_cents bigint, shop_cents bigint, club_cents bigint, invoice_cents bigint,
  base_cents bigint, commission_cents bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with bounds as (
    select (date_trunc('month', p_month::timestamp)) at time zone 'Europe/Paris' as lo,
           (date_trunc('month', p_month::timestamp) + interval '1 month') at time zone 'Europe/Paris' as hi
  )
  select c.id, r.id, coalesce(e.name, s.name, r.name),
         b.menu_cents, b.shop_cents, b.club_cents, b.invoice_cents,
         b.menu_cents + b.shop_cents + b.club_cents + b.invoice_cents,
         round((b.menu_cents + b.shop_cents + b.club_cents + b.invoice_cents)
               * (public.commercial_cfg()).commission_percent / 100)::bigint
  from public.commercial_clients c
  join public.commercial_declarations d on d.id = c.declaration_id
  join public.crm_restaurants r on r.id = d.restaurant_id
  left join public.etablissements e on e.id = c.etablissement_id
  left join public.shops s on s.id = c.shop_id,
  bounds,
  lateral public.commercial_base(c, bounds.lo, bounds.hi) b
  where d.commercial_id = p_commercial and c.validated_at is not null and c.commission_from is not null
  order by 3;
$$;
revoke execute on function public.commercial_month_lines(uuid, date) from public, anon, authenticated;
grant execute on function public.commercial_month_lines(uuid, date) to service_role;

-- ---------------------------------------------------------------------------
-- Relevés
create table public.commercial_statements (
  id uuid primary key default gen_random_uuid(),
  commercial_id uuid not null references public.commerciaux (id),
  month date not null check (extract(day from month) = 1),
  -- Lignes figées à l'envoi (commercial_month_lines), régularisations :
  -- [{label, cents, month?, auto}].
  lines jsonb not null default '[]',
  adjustments jsonb not null default '[]',
  total_cents bigint not null default 0,
  status text not null default 'draft' check (status in ('draft', 'sent', 'invoiced', 'paid')),
  sent_at timestamptz,
  invoice_path text,
  invoice_received_at timestamptz,
  detail_requested_at timestamptz,
  detail_sent_at timestamptz,
  -- Contestation (art. 5.4) : n'en change pas l'état, l'admin la clôt.
  contested_at timestamptz,
  contest_note text,
  contest_resolved_at timestamptz,
  contest_resolution text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (commercial_id, month)
);
alter table public.commercial_statements enable row level security;
create policy "admin read" on public.commercial_statements
  for select to authenticated using ((select public.is_admin()));
create policy "self read" on public.commercial_statements
  for select to authenticated
  using (status <> 'draft' and commercial_id in (
    select id from public.commerciaux where user_id = (select auth.uid())
  ));

alter table public.commercial_emails add column statement_id uuid references public.commercial_statements (id);

-- Pièces du commercial (art. 2.5) : avis SIRENE, attestations URSSAF.
create table public.commercial_documents (
  id uuid primary key default gen_random_uuid(),
  commercial_id uuid not null references public.commerciaux (id),
  kind text not null check (kind in ('sirene', 'urssaf')),
  path text not null,
  uploaded_at timestamptz not null default now()
);
alter table public.commercial_documents enable row level security;
create policy "admin read" on public.commercial_documents
  for select to authenticated using ((select public.is_admin()));
create policy "self read" on public.commercial_documents
  for select to authenticated
  using (commercial_id in (select id from public.commerciaux where user_id = (select auth.uid())));

-- Total d'un relevé : commissions des lignes et régularisations.
create function public.commercial_statement_total(p_lines jsonb, p_adjustments jsonb)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select coalesce((select sum((l ->> 'commission_cents')::bigint) from jsonb_array_elements(p_lines) l), 0)
       + coalesce((select sum((a ->> 'cents')::bigint) from jsonb_array_elements(p_adjustments) a), 0);
$$;

-- Brouillon d'un mois : lignes recalculées, régularisations automatiques des
-- mois déjà figés (recalcul d'aujourd'hui moins ce qui a été relevé et déjà
-- régularisé), régularisations saisies par l'admin gardées.
create function public.commercial_draft_statement(p_commercial uuid, p_month date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lines jsonb;
  v_auto jsonb;
  v_id uuid;
begin
  select coalesce(jsonb_agg(to_jsonb(l)), '[]') into v_lines
  from public.commercial_month_lines(p_commercial, p_month) l;

  select coalesce(jsonb_agg(jsonb_build_object(
           'label', 'Régularisation de ' || to_char(f.month, 'MM/YYYY'),
           'month', f.month, 'cents', f.gap, 'auto', true)), '[]')
  into v_auto
  from (
    select s.month,
           coalesce((select sum(l.commission_cents) from public.commercial_month_lines(p_commercial, s.month) l), 0)
           - coalesce((select sum((x ->> 'commission_cents')::bigint) from jsonb_array_elements(s.lines) x), 0)
           - coalesce((select sum((a ->> 'cents')::bigint)
                       from public.commercial_statements o, jsonb_array_elements(o.adjustments) a
                       where o.commercial_id = p_commercial and o.status <> 'draft'
                         and (a ->> 'auto')::boolean and (a ->> 'month')::date = s.month), 0) as gap
    from public.commercial_statements s
    where s.commercial_id = p_commercial and s.status <> 'draft' and s.month < p_month
  ) f
  where f.gap <> 0;

  insert into public.commercial_statements (commercial_id, month, lines, adjustments, total_cents)
  values (p_commercial, p_month, v_lines, v_auto, public.commercial_statement_total(v_lines, v_auto))
  on conflict (commercial_id, month) do update
    set lines = excluded.lines,
        adjustments = excluded.adjustments || coalesce((
          select jsonb_agg(a) from jsonb_array_elements(public.commercial_statements.adjustments) a
          where not coalesce((a ->> 'auto')::boolean, false)), '[]'),
        total_cents = public.commercial_statement_total(
          excluded.lines,
          excluded.adjustments || coalesce((
            select jsonb_agg(a) from jsonb_array_elements(public.commercial_statements.adjustments) a
            where not coalesce((a ->> 'auto')::boolean, false)), '[]'))
    where public.commercial_statements.status = 'draft'
  returning id into v_id;
  if v_id is null then
    raise exception 'Ce relevé est déjà envoyé : une correction passe par le relevé suivant.';
  end if;
  return v_id;
end;
$$;
revoke execute on function public.commercial_draft_statement(uuid, date) from public, anon, authenticated;

-- Tâche quotidienne, le 1er du mois (et en rattrapage les jours suivants) :
-- brouillon du mois écoulé pour chaque commercial qui a des Clients Apportés.
-- Le relevé final (art. 8.1) a sa propre fonction, plus bas.
create function public.commercial_draft_statements()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_month date := (date_trunc('month', now() at time zone 'Europe/Paris') - interval '1 month')::date;
  v_commercial uuid;
  v_count int := 0;
begin
  for v_commercial in
    select distinct d.commercial_id
    from public.commercial_clients c
    join public.commercial_declarations d on d.id = c.declaration_id
    where c.validated_at is not null and c.commission_from is not null
      and not exists (
        select 1 from public.commercial_statements s
        where s.commercial_id = d.commercial_id and s.month = v_month and s.status <> 'draft'
      )
  loop
    perform public.commercial_draft_statement(v_commercial, v_month);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke execute on function public.commercial_draft_statements() from public, anon, authenticated;
grant execute on function public.commercial_draft_statements() to service_role;

-- ---------------------------------------------------------------------------
-- Admin : relevés

create function public.admin_statement_draft(p_commercial uuid, p_month date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_require();
  return public.commercial_draft_statement(p_commercial, date_trunc('month', p_month)::date);
end;
$$;

create function public.admin_statement_adjust(p_statement uuid, p_label text, p_cents bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_require();
  if nullif(btrim(p_label), '') is null or coalesce(p_cents, 0) = 0 then
    raise exception 'Une régularisation a un motif et un montant.';
  end if;
  update public.commercial_statements
  set adjustments = adjustments || jsonb_build_array(jsonb_build_object('label', btrim(p_label), 'cents', p_cents, 'auto', false)),
      total_cents = public.commercial_statement_total(
        lines, adjustments || jsonb_build_array(jsonb_build_object('cents', p_cents)))
  where id = p_statement and status = 'draft';
  if not found then
    raise exception 'Seul un brouillon se régularise.';
  end if;
end;
$$;

-- Envoi : le relevé est figé et part par e-mail (preuve dans commercial_emails).
create function public.admin_statement_send(p_statement uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.commercial_statements;
begin
  perform public.admin_require();
  update public.commercial_statements
  set status = 'sent', sent_at = now()
  where id = p_statement and status = 'draft'
  returning * into s;
  if s.id is null then
    raise exception 'Ce relevé n''est plus un brouillon.';
  end if;
  insert into public.commercial_emails (commercial_id, kind, statement_id)
  values (s.commercial_id, 'statement', s.id);
end;
$$;

create function public.admin_statement_paid(p_statement uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_require();
  update public.commercial_statements
  set status = 'paid', paid_at = now()
  where id = p_statement and status in ('sent', 'invoiced');
  if not found then
    raise exception 'Relevé introuvable ou déjà payé.';
  end if;
end;
$$;

-- Clôture d'une contestation : la réponse d'Ominin, lue par le commercial
-- dans Argent ; une correction passe par une régularisation.
create function public.admin_statement_resolve(p_statement uuid, p_resolution text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_require();
  if nullif(btrim(p_resolution), '') is null then
    raise exception 'Écrivez la réponse faite au commercial.';
  end if;
  update public.commercial_statements
  set contest_resolved_at = now(), contest_resolution = btrim(p_resolution)
  where id = p_statement and contested_at is not null and contest_resolved_at is null;
  if not found then
    raise exception 'Aucune contestation ouverte sur ce relevé.';
  end if;
end;
$$;

-- Relevé final (art. 8.1) : dès la fin du contrat, brouillon du mois de la
-- fin, recalculé chaque jour tant qu'il n'est pas envoyé ; la tâche
-- quotidienne rappelle à l'admin l'échéance de l'envoi.
create function public.commercial_final_statements()
returns table (commercial_id uuid, statement_id uuid, due_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  c record;
begin
  for c in
    select m.id, m.ended_at, (date_trunc('month', m.ended_at at time zone 'Europe/Paris'))::date as month
    from public.commerciaux m
    where m.ended_at <= now()
      and not exists (
        select 1 from public.commercial_statements s
        where s.commercial_id = m.id and s.status <> 'draft'
          and s.month = (date_trunc('month', m.ended_at at time zone 'Europe/Paris'))::date)
  loop
    commercial_id := c.id;
    statement_id := public.commercial_draft_statement(c.id, c.month);
    due_at := c.ended_at + make_interval(days => (public.commercial_cfg()).final_statement_days);
    return next;
  end loop;
end;
$$;
revoke execute on function public.commercial_final_statements() from public, anon, authenticated;
grant execute on function public.commercial_final_statements() to service_role;

create function public.admin_statement_detail_sent(p_statement uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_require();
  update public.commercial_statements set detail_sent_at = now()
  where id = p_statement and detail_requested_at is not null and detail_sent_at is null;
  if not found then
    raise exception 'Aucune demande de détail en attente sur ce relevé.';
  end if;
  insert into public.commercial_emails (commercial_id, kind, statement_id)
  select commercial_id, 'detail', id from public.commercial_statements where id = p_statement;
end;
$$;

-- Encaissement hors Stripe (commission facturée mensuellement, par exemple
-- encaissée par SumUp sans frais d'application) : saisi par l'admin.
create function public.admin_record_payment(
  p_etablissement uuid,
  p_shop uuid,
  p_cents int,
  p_paid_at timestamptz,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform public.admin_require();
  if nullif(btrim(p_note), '') is null then
    raise exception 'Décrivez l''encaissement.';
  end if;
  insert into public.ominin_invoice_payments (etablissement_id, shop_id, eligible_ht_cents, paid_at, note)
  values (p_etablissement, p_shop, p_cents, p_paid_at, btrim(p_note))
  returning id into v_id;
  return v_id;
end;
$$;

-- Lignes d'un mois pour l'admin (brouillon, vérification).
create function public.admin_month_lines(p_commercial uuid, p_month date)
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select to_jsonb(l) from public.commercial_month_lines(p_commercial, p_month) l
  where public.is_admin();
$$;

-- ---------------------------------------------------------------------------
-- Commercial : argent

-- Ce mois-ci, estimé à la lecture (même calcul que le relevé).
create function public.commercial_month_estimate()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  with me as (select * from public.commercial_me('money'))
  select jsonb_build_object(
    'month', date_trunc('month', now() at time zone 'Europe/Paris')::date,
    'percent', (public.commercial_cfg()).commission_percent,
    'lines', coalesce((
      select jsonb_agg(to_jsonb(l))
      from me, public.commercial_month_lines(me.id, date_trunc('month', now() at time zone 'Europe/Paris')::date) l), '[]'))
  from me;
$$;

-- Facture du commercial déposée dans commercial-docs/<commercial>/factures/.
create function public.commercial_statement_invoice(p_statement uuid, p_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.commerciaux := public.commercial_me('money');
begin
  if p_path not like me.id::text || '/factures/%' then
    raise exception 'Dépôt invalide.';
  end if;
  update public.commercial_statements
  set invoice_path = p_path, invoice_received_at = now(),
      status = case when status = 'sent' then 'invoiced' else status end
  where id = p_statement and commercial_id = me.id and status in ('sent', 'invoiced');
  if not found then
    raise exception 'Ce relevé n''attend pas de facture.';
  end if;
end;
$$;

-- Détail des encaissements : une demande par période contractuelle.
create function public.commercial_request_detail(p_statement uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.commerciaux := public.commercial_me('money');
  cfg public.commercial_settings := public.commercial_cfg();
  v_last timestamptz;
begin
  select max(detail_requested_at) into v_last
  from public.commercial_statements where commercial_id = me.id;
  if v_last > now() - make_interval(months => cfg.detail_interval_months) then
    raise exception 'Une demande de détail par période de % mois : la prochaine est possible à partir du %.',
      cfg.detail_interval_months, to_char(v_last + make_interval(months => cfg.detail_interval_months), 'DD/MM/YYYY');
  end if;
  update public.commercial_statements set detail_requested_at = now(), detail_sent_at = null
  where id = p_statement and commercial_id = me.id and status <> 'draft';
  if not found then
    raise exception 'Relevé introuvable.';
  end if;
  return now() + make_interval(days => cfg.detail_response_days);
end;
$$;

-- Contestation écrite, une par relevé, dans le délai contractuel après la
-- réception ; le relevé garde son état (payé reste payé).
create function public.commercial_contest(p_statement uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.commerciaux := public.commercial_me('money');
begin
  if nullif(btrim(p_note), '') is null then
    raise exception 'Expliquez ce que vous contestez.';
  end if;
  update public.commercial_statements
  set contested_at = now(), contest_note = btrim(p_note)
  where id = p_statement and commercial_id = me.id and status <> 'draft' and contested_at is null
    and sent_at > now() - make_interval(months => (public.commercial_cfg()).contest_months);
  if not found then
    raise exception 'Ce relevé ne peut plus être contesté (délai de l''article 5.4 dépassé ou déjà contesté).';
  end if;
end;
$$;

create function public.commercial_add_document(p_kind text, p_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.commerciaux := public.commercial_me('money');
begin
  if p_path not like me.id::text || '/pieces/%' then
    raise exception 'Dépôt invalide.';
  end if;
  insert into public.commercial_documents (commercial_id, kind, path) values (me.id, p_kind, p_path);
end;
$$;

-- Attestation URSSAF due (art. 2.5) : dès que les commissions relevées
-- atteignent le seuil, puis à chaque intervalle depuis la dernière déposée.
create function public.commercial_urssaf_due(p_commercial uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with cfg as (select * from public.commercial_cfg())
  select (select coalesce(sum(total_cents), 0) from public.commercial_statements
          where commercial_id = p_commercial and status <> 'draft') >= cfg.urssaf_threshold_cents
     and not exists (
       select 1 from public.commercial_documents
       where commercial_id = p_commercial and kind = 'urssaf'
         and uploaded_at > now() - make_interval(months => cfg.urssaf_interval_months))
  from cfg;
$$;
revoke execute on function public.commercial_urssaf_due(uuid) from public, anon, authenticated;

-- Rappel URSSAF par e-mail (tâche quotidienne) : une fois par attestation
-- attendue, c'est-à-dire pas de nouveau rappel avant le prochain dépôt.
create function public.commercial_urssaf_reminders()
returns int
language sql
security definer
set search_path = ''
as $$
  with queued as (
    insert into public.commercial_emails (commercial_id, kind)
    select m.id, 'urssaf' from public.commerciaux m
    where (m.ended_at is null or m.ended_at > now())
      and public.commercial_urssaf_due(m.id)
      and not exists (
        select 1 from public.commercial_emails e
        where e.commercial_id = m.id and e.kind = 'urssaf'
          and e.created_at > coalesce((select max(d.uploaded_at) from public.commercial_documents d
                                       where d.commercial_id = m.id and d.kind = 'urssaf'), '-infinity'))
    returning 1
  )
  select count(*)::int from queued;
$$;
revoke execute on function public.commercial_urssaf_reminders() from public, anon, authenticated;
grant execute on function public.commercial_urssaf_reminders() to service_role;

-- L'écran Argent : estimation du mois, relevés, échéances.
create function public.commercial_money()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  with me as (select * from public.commercial_me('money')),
  cfg as (select * from public.commercial_cfg())
  select jsonb_build_object(
    'estimate', public.commercial_month_estimate(),
    'statements', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'month', s.month, 'lines', s.lines, 'adjustments', s.adjustments,
        'total_cents', s.total_cents, 'status', s.status, 'sent_at', s.sent_at,
        'invoice_path', s.invoice_path, 'invoice_received_at', s.invoice_received_at,
        'payment_due', s.invoice_received_at + make_interval(days => cfg.payment_days),
        'paid_at', s.paid_at, 'detail_requested_at', s.detail_requested_at,
        'detail_due', s.detail_requested_at + make_interval(days => cfg.detail_response_days),
        'detail_sent_at', s.detail_sent_at, 'contested_at', s.contested_at,
        'contest_note', s.contest_note, 'contest_resolved_at', s.contest_resolved_at,
        'contest_resolution', s.contest_resolution,
        'contest_until', s.sent_at + make_interval(months => cfg.contest_months))
        order by s.month desc)
      from public.commercial_statements s, me
      where s.commercial_id = me.id and s.status <> 'draft'), '[]'),
    'next_detail_at', (select max(detail_requested_at) + make_interval(months => cfg.detail_interval_months)
                       from public.commercial_statements, me where commercial_id = me.id),
    'urssaf_due', public.commercial_urssaf_due(me.id),
    'documents', coalesce((select jsonb_agg(jsonb_build_object('kind', kind, 'uploaded_at', uploaded_at) order by uploaded_at desc)
                           from public.commercial_documents, me where commercial_id = me.id), '[]'))
  from me, cfg;
$$;

-- Clients Apportés du commercial (écran Clients) : inscription, intégration
-- (étapes 7 à 15 du Projet), ce qu'ils ont rapporté ce mois-ci, fin de période.
create function public.commercial_my_clients()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  with me as (select * from public.commercial_me('work')),
  cfg as (select * from public.commercial_cfg()),
  month as (
    select (date_trunc('month', now() at time zone 'Europe/Paris')) at time zone 'Europe/Paris' as lo
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'restaurant_id', r.id, 'name', coalesce(e.name, s.name, r.name),
    'etablissement_id', c.etablissement_id, 'shop_id', c.shop_id,
    'commission_from', c.commission_from,
    'commission_until', least(c.commission_from + make_interval(months => cfg.term_months), c.ended_at),
    'client_ended_at', c.ended_at,
    'validated', c.validated_at is not null,
    'base_cents', (select b.menu_cents + b.shop_cents + b.club_cents + b.invoice_cents
                   from public.commercial_base(c, month.lo, now()) b),
    'steps', coalesce((
      select jsonb_agg(jsonb_build_object('position', st.position, 'title', st.title, 'status', st.status)
                       order by st.position)
      from public.projet_clients pc join public.projet_steps st on st.client_id = pc.id
      where pc.declaration_id = c.declaration_id
        and (pc.etablissement_id = c.etablissement_id or pc.shop_id = c.shop_id)
        and st.position between 7 and 15), '[]'))
    order by c.commission_from desc nulls first), '[]')
  from public.commercial_clients c
  join public.commercial_declarations d on d.id = c.declaration_id
  join public.crm_restaurants r on r.id = d.restaurant_id
  left join public.etablissements e on e.id = c.etablissement_id
  left join public.shops s on s.id = c.shop_id, me, cfg, month
  where d.commercial_id = me.id;
$$;

-- Aujourd'hui : la démo prête et le relevé disponible rejoignent les
-- nouveautés. La version du lot 1 devient la base, complétée ici.
alter function public.commercial_today(timestamptz) rename to commercial_today_base;
revoke execute on function public.commercial_today_base(timestamptz) from public, anon, authenticated;

create function public.commercial_today(p_since timestamptz)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  with me as (select * from public.commercial_me('work')),
  base as (select public.commercial_today_base(p_since) as j)
  select base.j || jsonb_build_object('news', coalesce((
    select jsonb_agg(n order by n ->> 'at' desc) from (
      select jsonb_array_elements(base.j -> 'news') as n
      union all
      select jsonb_build_object('kind', 'demo_ready', 'restaurant_id', d.restaurant_id, 'name', r.name,
                                'at', q.done_at, 'url', q.demo_url)
      from public.commercial_demo_requests q
      join public.commercial_declarations d on d.id = q.declaration_id
      join public.crm_restaurants r on r.id = d.restaurant_id, me
      where d.commercial_id = me.id and q.status = 'done'
        and q.done_at > coalesce(p_since, '-infinity'::timestamptz)
      union all
      select jsonb_build_object('kind', 'statement', 'at', s.sent_at, 'month', s.month, 'total_cents', s.total_cents)
      from public.commercial_statements s, me
      where s.commercial_id = me.id and s.status <> 'draft'
        and s.sent_at > coalesce(p_since, '-infinity'::timestamptz)
    ) news(n)), '[]'))
  from base;
$$;

-- Factures reçues par le commercial et pièces : bucket commercial-docs, sous
-- son identifiant (policies « self read » et « self upload » du lot 1).

do $$
declare
  v_fn text;
begin
  foreach v_fn in array array[
    'admin_statement_draft(uuid, date)',
    'admin_statement_adjust(uuid, text, bigint)',
    'admin_statement_send(uuid)',
    'admin_statement_paid(uuid)',
    'admin_statement_resolve(uuid, text)',
    'admin_statement_detail_sent(uuid)',
    'admin_record_payment(uuid, uuid, int, timestamptz, text)',
    'admin_month_lines(uuid, date)',
    'commercial_month_estimate()',
    'commercial_statement_invoice(uuid, text)',
    'commercial_request_detail(uuid)',
    'commercial_contest(uuid, text)',
    'commercial_add_document(text, text)',
    'commercial_money()',
    'commercial_my_clients()',
    'commercial_today(timestamptz)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', v_fn);
    execute format('grant execute on function public.%s to authenticated', v_fn);
  end loop;
end $$;
