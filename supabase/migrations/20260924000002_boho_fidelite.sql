-- La carte de fidélité du BOHO, telle que son affiche la présente : 1 € = 1
-- point, quatre paliers. La capacité est ouverte et le programme allumé : le
-- restaurant l'a demandé, il n'a rien à régler de plus.
--
-- Les articles se retrouvent par catégorie et par nom, comme les autres
-- réglages du BOHO. Softs : les boissons fraîches de la carte, hors Redbull.
-- Cocktails : la carte du BOHO est sans alcool ; le jus de fruits frais, rangé
-- avec eux, n'est ni smoothie, ni milkshake, ni cocktail.

do $$
declare
  v_etab uuid;
  v_reward uuid;
begin
  select id into v_etab from etablissements where slug = 'boho';
  if v_etab is null then
    return;
  end if;

  update etablissement_settings
  set features = features || '{"fidelite": true}'::jsonb,
      updated_at = now()
  where etablissement_id = v_etab;

  update etablissements
  set loyalty_enabled = true, loyalty_points_per_euro = 1
  where id = v_etab;

  insert into loyalty_rewards (etablissement_id, label, points)
  values (v_etab, '1 café ou thé ou soft offert', 50)
  returning id into v_reward;
  insert into loyalty_reward_items (reward_id, item_id)
  select v_reward, i.id
  from items i
  join categories c on c.id = i.category_id
  where i.etablissement_id = v_etab
    and (
      c.name = 'Boissons chaudes'
      or i.name ilike 'thé%'
      or (c.name = 'Boissons'
          and i.name in ('Coca Cola', 'Coca Zero', 'Ice Tea', 'Perrier', 'Cristalline'))
    );

  insert into loyalty_rewards (etablissement_id, label, points)
  values (v_etab, '1 smoothie ou milkshake ou cocktail sans alcool offert', 100)
  returning id into v_reward;
  insert into loyalty_reward_items (reward_id, item_id)
  select v_reward, i.id
  from items i
  join categories c on c.id = i.category_id
  where i.etablissement_id = v_etab
    and c.name in ('Smoothies', 'Milkshakes', 'Cocktails')
    and i.name <> 'Jus de fruits naturel';

  insert into loyalty_rewards (etablissement_id, label, points)
  values (v_etab, '1 chicha classique menthe offerte', 150)
  returning id into v_reward;
  insert into loyalty_reward_items (reward_id, item_id)
  select v_reward, i.id
  from items i
  join categories c on c.id = i.category_id
  where i.etablissement_id = v_etab and c.name = 'Chichas' and i.name = 'Classique';

  insert into loyalty_rewards (etablissement_id, label, points)
  values (v_etab, '1 chicha premium Adalya offerte', 200)
  returning id into v_reward;
  insert into loyalty_reward_items (reward_id, item_id)
  select v_reward, i.id
  from items i
  join categories c on c.id = i.category_id
  where i.etablissement_id = v_etab and c.name = 'Chichas' and i.name = 'Premium';
end;
$$;
