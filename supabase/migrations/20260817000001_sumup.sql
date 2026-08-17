-- SumUp comme fournisseur de paiement à table, au choix du gérant (alternative
-- à Stripe Connect, par établissement). Le guest règle par carte / Apple Pay
-- directement sur le menu QR, l'argent va sur le compte SumUp du restaurant.
-- NF525 : Ominin ne mémorise ni montants ni confirmations — seulement des
-- références (checkout id) et les drapeaux de statut de commande existants.

-- Choix du fournisseur. Null = non décidé : tous les consommateurs retombent
-- sur le comportement Stripe actuel, les restaurants existants sont intacts.
-- Colonne publique (le menu anonyme doit router le paiement) et modifiable
-- par le gérant via la policy « gerant update » existante (row-level).
create type public.payment_provider as enum ('stripe', 'sumup');

alter table public.etablissements
  add column payment_provider public.payment_provider;

-- Jetons OAuth du marchand SumUp. Contrairement à payment_accounts (id de
-- compte Stripe non sensible, lecture membre), ces jetons sont des secrets :
-- RLS activée sans aucune policy, accès service_role uniquement. Le statut
-- de connexion passe par /api/sumup/connect (route réservée au gérant).
create table public.sumup_accounts (
  etablissement_id uuid primary key
    references public.etablissements (id) on delete cascade,
  merchant_code text not null,
  access_token text not null,
  refresh_token text not null,
  access_token_expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.sumup_accounts enable row level security;

-- Référence du checkout SumUp sur la commande (idempotence du webhook,
-- pendant de stripe_session_id). Un checkout refusé est mort côté SumUp :
-- retenter écrase la colonne avec un checkout neuf.
alter table public.orders
  add column sumup_checkout_id text unique;

-- Préparation de l'envoi en caisse (External Sale API, phase ultérieure) :
-- chaque article porte son taux de TVA (10 = taux réduit restauration sur
-- place, 5.5 = vente à emporter différée / scellée, 20 = alcools), figé sur
-- la ligne de commande au moment de la vente comme le nom et le prix.
alter table public.items
  add column vat_rate numeric not null default 10
    check (vat_rate >= 0 and vat_rate <= 100);

alter table public.order_items
  add column vat_rate numeric;

-- place_order : copie de 20260709000004_order_fixes.sql, une seule ligne
-- changée — l'insert des lignes fige items.vat_rate.
create or replace function public.place_order(
  p_slug text,
  p_table_number int,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_etab uuid;
  v_offre public.offre;
  v_table uuid;
  v_order uuid;
  v_line jsonb;
  v_item public.items;
  v_qty int;
  v_supplement numeric;
  v_options jsonb;
  v_choice jsonb;
  v_group jsonb;
  v_opt jsonb;
  v_found boolean;
  v_count int;
begin
  select id, offre into v_etab, v_offre from etablissements where slug = p_slug;
  if v_etab is null then
    raise exception 'Établissement introuvable.';
  end if;
  -- La commande à table est une capacité des offres Smart et Connect.
  if v_offre not in ('smart', 'connect') then
    raise exception 'La commande en ligne n''est pas activée pour cet établissement.';
  end if;

  select id into v_table from tables
  where etablissement_id = v_etab and number = p_table_number;
  if v_table is null then
    raise exception 'Table introuvable.';
  end if;

  v_count := jsonb_array_length(coalesce(p_items, '[]'::jsonb));
  if v_count = 0 then
    raise exception 'Commande vide.';
  end if;
  if v_count > 50 then
    raise exception 'Trop d''articles dans la commande.';
  end if;

  insert into orders (etablissement_id, table_id)
  values (v_etab, v_table)
  returning id into v_order;

  for v_line in select value from jsonb_array_elements(p_items) as t(value)
  loop
    v_qty := coalesce((v_line->>'quantity')::int, 0);
    if v_qty < 1 or v_qty > 99 then
      raise exception 'Quantité invalide.';
    end if;

    -- for update : sérialise les commandes concurrentes sur le même item,
    -- le test de stock ci-dessous lit donc une valeur à jour.
    select * into v_item from items
    where id = (v_line->>'item_id')::uuid and etablissement_id = v_etab
    for update;
    if not found then
      raise exception 'Article introuvable.';
    end if;
    if not v_item.disponible then
      raise exception 'Article indisponible : %.', v_item.name;
    end if;
    if v_item.stock is not null and v_item.stock < v_qty then
      raise exception 'Stock insuffisant pour : %.', v_item.name;
    end if;

    -- Options : valider chaque choix contre item.options et figer nom + supplément.
    v_supplement := 0;
    v_options := '[]'::jsonb;
    for v_choice in
      select value from jsonb_array_elements(coalesce(v_line->'choices', '[]'::jsonb)) as t(value)
    loop
      v_found := false;
      for v_group in select value from jsonb_array_elements(v_item.options) as t(value)
      loop
        if v_group->>'id' = v_choice->>'group_id' then
          for v_opt in select value from jsonb_array_elements(v_group->'choices') as t(value)
          loop
            if v_opt->>'id' = v_choice->>'choice_id' then
              v_supplement := v_supplement + coalesce((v_opt->>'supplement')::numeric, 0);
              v_options := v_options || jsonb_build_array(jsonb_build_object(
                'groupName', v_group->>'name',
                'choiceName', v_opt->>'name',
                'supplement', coalesce((v_opt->>'supplement')::numeric, 0)
              ));
              v_found := true;
            end if;
          end loop;
        end if;
      end loop;
      if not v_found then
        raise exception 'Option invalide pour : %.', v_item.name;
      end if;
    end loop;

    -- Groupes obligatoires : un choix requis.
    for v_group in select value from jsonb_array_elements(v_item.options) as t(value)
    loop
      if coalesce((v_group->>'obligatoire')::boolean, false)
         and not exists (
           select 1
           from jsonb_array_elements(coalesce(v_line->'choices', '[]'::jsonb)) as c(value)
           where c.value->>'group_id' = v_group->>'id'
         ) then
        raise exception 'Choix obligatoire manquant pour : %.', v_item.name;
      end if;
    end loop;

    insert into order_items (order_id, item_id, name, quantity, unit_price, options, vat_rate)
    values (v_order, v_item.id, v_item.name, v_qty, v_item.price + v_supplement, v_options, v_item.vat_rate);

    if v_item.stock is not null then
      update items set stock = stock - v_qty where id = v_item.id;
    end if;
  end loop;

  return v_order;
end;
$$;

-- BOHO : SumUp présélectionné comme caisse (l'OAuth se termine manuellement
-- dans /gestion/etablissement). No-op si le seed n'a pas encore tourné —
-- le seed écrit aussi payment_provider.
update public.etablissements set payment_provider = 'sumup' where slug = 'boho';
