-- Les formules « Côté Jardin » du BOHO, telles que sa bannière les présente :
-- Chill à 9,90 € (1 soft + 1 dessert) et Boho à 14,90 € (1 cocktail + 1
-- dessert), proposées le week-end seulement : vendredi, samedi et dimanche,
-- en journée de service (du vendredi 5 h au lundi 5 h au BOHO). Les choix
-- sont les articles de la carte, retrouvés par catégorie et par nom comme
-- les autres réglages du BOHO, avec leurs options : un supplément d'option
-- reste payant dans la formule. Le gérant les retouche ensuite depuis
-- Menu → Formules.
--
-- Softs : ceux de la carte fidélité (hors Redbull). Desserts : tous ceux à
-- 8 € au plus — le plateau de fruits frais (15 €) n'en est pas. Cocktails :
-- toute la catégorie.

do $$
declare
  v_etab uuid;
  v_desserts jsonb;
begin
  select id into v_etab from etablissements where slug = 'boho';
  if v_etab is null then
    return;
  end if;

  select jsonb_agg(jsonb_build_object(
           'id', gen_random_uuid(), 'name', i.name, 'supplement', 0,
           'itemId', i.id, 'options', i.options
         ) order by i.position, i.created_at)
  into v_desserts
  from items i
  join categories c on c.id = i.category_id
  where i.etablissement_id = v_etab and c.name = 'Desserts' and i.price <= 8;

  insert into formules (etablissement_id, name, description, price, disponible, days, etapes)
  select v_etab, 'Formule Chill', '1 soft + 1 dessert', 9.90, true, '{5,6,7}',
         jsonb_build_array(
           jsonb_build_object(
             'id', gen_random_uuid(), 'name', 'Soft', 'obligatoire', true,
             'articles', jsonb_agg(jsonb_build_object(
               'id', gen_random_uuid(), 'name', i.name, 'supplement', 0,
               'itemId', i.id, 'options', i.options
             ) order by i.position, i.created_at)
           ),
           jsonb_build_object(
             'id', gen_random_uuid(), 'name', 'Dessert', 'obligatoire', true,
             'articles', v_desserts
           )
         )
  from items i
  join categories c on c.id = i.category_id
  where i.etablissement_id = v_etab
    and c.name = 'Boissons'
    and i.name in ('Coca Cola', 'Coca Zero', 'Ice Tea', 'Perrier', 'Cristalline');

  insert into formules (etablissement_id, name, description, price, disponible, days, etapes)
  select v_etab, 'Formule Boho', '1 cocktail + 1 dessert', 14.90, true, '{5,6,7}',
         jsonb_build_array(
           jsonb_build_object(
             'id', gen_random_uuid(), 'name', 'Cocktail', 'obligatoire', true,
             'articles', jsonb_agg(jsonb_build_object(
               'id', gen_random_uuid(), 'name', i.name, 'supplement', 0,
               'itemId', i.id, 'options', i.options
             ) order by i.position, i.created_at)
           ),
           jsonb_build_object(
             'id', gen_random_uuid(), 'name', 'Dessert', 'obligatoire', true,
             'articles', v_desserts
           )
         )
  from items i
  join categories c on c.id = i.category_id
  where i.etablissement_id = v_etab and c.name = 'Cocktails';
end;
$$;
