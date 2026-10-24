-- Une formule peut n'être proposée qu'à certaines heures : les petits
-- déjeuners de Caffè Panis, de 9 h à 10 h 30, avec sa happy hour du matin.
-- Hors de ses heures, la carte ne la montre pas et formule_line la refuse ;
-- pendant, elle se range dans la happy hour. Null : toute la journée.
-- formule_line est reprise de 20261016000001 : seul le contrôle des heures
-- s'ajoute.

alter table public.formules
  add column starts_at time,
  add column ends_at time,
  add constraint formules_heures check (
    (starts_at is null and ends_at is null)
    or (starts_at is not null and ends_at is not null and starts_at <> ends_at)
  );

comment on column public.formules.starts_at is
  'Heure (Paris) à laquelle la formule devient proposée ; null avec ends_at = toute la journée.';

-- Un créneau, à l'heure de Paris ; il peut passer minuit (22 h → 2 h). Pas de
-- créneau : toujours ouvert.
create function public.dans_les_heures(
  p_starts time,
  p_ends time,
  p_at timestamptz default now()
)
returns boolean
language sql
stable
set search_path = public
as $$
  select p_starts is null
    or case
      when p_starts < p_ends then moment.t >= p_starts and moment.t < p_ends
      else moment.t >= p_starts or moment.t < p_ends
    end
  from (select (p_at at time zone 'Europe/Paris')::time as t) moment;
$$;

revoke execute on function public.dans_les_heures(time, time, timestamptz)
  from public, anon, authenticated;

create or replace function public.formule_line(p_etab uuid, p_line jsonb)
returns table (
  name text, unit_price numeric, options jsonb, vat_rate numeric, components jsonb
)
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_formule public.formules;
  v_etape jsonb;
  v_article jsonb;
  v_sel jsonb;
  v_selections jsonb := coalesce(p_line->'selections', '[]'::jsonb);
  v_item public.items;
  v_group jsonb;
  v_opt jsonb;
  v_choice jsonb;
  v_found boolean;
  v_count int;
  v_price numeric;
  v_options jsonb := '[]'::jsonb;
  v_vat numeric;
  v_components jsonb := '[]'::jsonb;
  v_article_options jsonb;
  v_article_opts jsonb;
begin
  select * into v_formule from formules
  where id = (p_line->>'formule_id')::uuid and etablissement_id = p_etab;
  if v_formule.id is null or not v_formule.disponible then
    raise exception 'Formule indisponible.';
  end if;
  if not formule_du_jour(p_etab, v_formule.days) then
    raise exception '% n''est pas proposée aujourd''hui.', v_formule.name;
  end if;
  if not dans_les_heures(v_formule.starts_at, v_formule.ends_at) then
    raise exception '% n''est plus proposée à cette heure.', v_formule.name;
  end if;
  v_price := v_formule.price;

  -- Chaque choix doit viser une étape de la formule.
  if exists (
    select 1 from jsonb_array_elements(v_selections) as s(value)
    where not exists (
      select 1 from jsonb_array_elements(v_formule.etapes) as e(value)
      where e.value->>'id' = s.value->>'etape_id'
    )
  ) then
    raise exception 'Choix invalide pour : %.', v_formule.name;
  end if;

  for v_etape in select value from jsonb_array_elements(v_formule.etapes) as t(value)
  loop
    select count(*) into v_count
    from jsonb_array_elements(v_selections) as s(value)
    where s.value->>'etape_id' = v_etape->>'id';
    if v_count > 1 then
      raise exception 'Un seul choix pour : %.', v_etape->>'name';
    end if;
    if v_count = 0 then
      if coalesce((v_etape->>'obligatoire')::boolean, false) then
        raise exception 'Choix obligatoire manquant pour : %.', v_etape->>'name';
      end if;
      continue;
    end if;

    select s.value into v_sel
    from jsonb_array_elements(v_selections) as s(value)
    where s.value->>'etape_id' = v_etape->>'id';
    select a.value into v_article
    from jsonb_array_elements(v_etape->'articles') as a(value)
    where a.value->>'id' = v_sel->>'article_id';
    if v_article is null then
      raise exception 'Choix invalide pour : %.', v_etape->>'name';
    end if;

    v_article_opts := coalesce(v_article->'options', '[]'::jsonb);
    if v_article->>'itemId' is not null then
      select * into v_item from items
      where id = (v_article->>'itemId')::uuid and etablissement_id = p_etab;
      if v_item.id is null or not v_item.disponible or v_item.stock = 0 then
        raise exception 'Article indisponible : %.', v_article->>'name';
      end if;
      v_vat := greatest(v_vat, v_item.vat_rate);
      -- Un article de la carte suit sa fiche : ses options du moment, pas
      -- la copie faite quand il a rejoint la formule.
      v_article_opts := v_item.options;
    end if;

    v_price := v_price + coalesce((v_article->>'supplement')::numeric, 0);
    v_options := v_options || jsonb_build_array(jsonb_build_object(
      'groupName', v_etape->>'name',
      'choiceName', v_article->>'name',
      'supplement', coalesce((v_article->>'supplement')::numeric, 0)
    ));

    -- Options de l'article choisi : mêmes règles que place_order.
    v_article_options := '[]'::jsonb;
    for v_choice in
      select value from jsonb_array_elements(coalesce(v_sel->'choices', '[]'::jsonb)) as t(value)
    loop
      v_found := false;
      for v_group in
        select value from jsonb_array_elements(v_article_opts) as t(value)
      loop
        if v_group->>'id' = v_choice->>'group_id' then
          for v_opt in select value from jsonb_array_elements(v_group->'choices') as t(value)
          loop
            if v_opt->>'id' = v_choice->>'choice_id' then
              if (v_opt->>'disponible')::boolean is false then
                raise exception 'Plus disponible : % (%).', v_opt->>'name', v_article->>'name';
              end if;
              v_price := v_price + coalesce((v_opt->>'supplement')::numeric, 0);
              v_options := v_options || jsonb_build_array(jsonb_build_object(
                'groupName', (v_article->>'name') || ' · ' || (v_group->>'name'),
                'choiceName', v_opt->>'name',
                'supplement', coalesce((v_opt->>'supplement')::numeric, 0)
              ));
              v_article_options := v_article_options || jsonb_build_array(jsonb_build_object(
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
        raise exception 'Option invalide pour : %.', v_article->>'name';
      end if;
    end loop;

    for v_group in
      select value from jsonb_array_elements(v_article_opts) as t(value)
    loop
      if coalesce((v_group->>'obligatoire')::boolean, false)
         and not exists (
           select 1
           from jsonb_array_elements(coalesce(v_sel->'choices', '[]'::jsonb)) as c(value)
           where c.value->>'group_id' = v_group->>'id'
         ) then
        raise exception 'Choix obligatoire manquant pour : %.', v_article->>'name';
      end if;
    end loop;

    -- L'article tel qu'il sortirait commandé seul : c'est lui que les
    -- tickets impriment, sur ses imprimantes (item_printers).
    v_components := v_components || jsonb_build_array(jsonb_build_object(
      'item_id', v_article->>'itemId',
      'name', v_article->>'name',
      'options', v_article_options
    ));
  end loop;

  return query select v_formule.name, v_price, v_options, v_vat, v_components;
end;
$$;

revoke execute on function public.formule_line(uuid, jsonb) from public, anon, authenticated;
