-- Troisième présentation des catégories du menu QR : une roue translucide
-- posée sur la carte (components/menu/category-wheel.tsx). Elle devient celle
-- de tous les établissements, et de ceux qui viendront ; chaque gérant peut
-- revenir à la barre ou au rail dans sa gestion.
-- ---------------------------------------------------------------------------

alter table public.etablissements
  drop constraint etablissements_category_layout_check,
  add constraint etablissements_category_layout_check
    check (category_layout in ('top', 'rail', 'wheel')),
  alter column category_layout set default 'wheel';

update public.etablissements set category_layout = 'wheel';
