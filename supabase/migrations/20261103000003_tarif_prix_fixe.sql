-- Tarifs planifiés : un prix fixe, en plus de « plus cher de » et « moins cher
-- de ». Le gérant du BOHO veut dire « 15 € le vendredi », pas calculer l'écart
-- avec le prix de chaque article.
--
-- Tout le calcul passe par prix_ajuste : tarifs_actifs, donc place_order et la
-- carte, le suivent sans changer. Le prix fixe tient la place du prix de la
-- cible : sur un article, il remplace le prix de la fiche, et les suppléments
-- de formats et d'options s'y ajoutent comme à toute règle posée sur l'article ;
-- sur un format, il donne le prix entier de ce format. Le départage ne bouge
-- pas : le plus précis l'emporte, puis le plus récent, sans cumul.
--
-- La nouvelle valeur d'enum ne se lit pas dans la transaction qui l'ajoute :
-- d'où les comparaisons en texte, ici et dans la contrainte.

alter type public.price_rule_direction add value 'prix_fixe';

alter table public.price_rules
  add constraint price_rules_prix_fixe_en_euros check (
    direction::text <> 'prix_fixe' or unit = 'montant'
  );

create or replace function public.prix_ajuste(
  p_prix numeric,
  p_direction public.price_rule_direction,
  p_unit public.price_rule_unit,
  p_valeur numeric
)
returns numeric
language sql
immutable
as $$
  select greatest(
    0,
    round(
      case
        when p_direction::text = 'prix_fixe' then p_valeur
        when p_unit = 'pourcentage' then
          p_prix * (1 + p_valeur / 100
            * (case p_direction::text when 'remise' then -1 else 1 end))
        else
          p_prix + p_valeur
            * (case p_direction::text when 'remise' then -1 else 1 end)
      end,
      2
    )
  );
$$;
