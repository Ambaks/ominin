-- Ordre d'affichage des articles. Jusqu'ici l'ordre était celui de la
-- création : pour remonter un plat en tête de sa catégorie, il fallait le
-- supprimer et le recréer. Les catégories avaient déjà leur position ; les
-- articles reçoivent la leur, comptée au sein de leur catégorie.

alter table public.items add column position int not null default 0;

-- Les articles existants gardent l'ordre qu'ils avaient — celui de la
-- création — désormais écrit noir sur blanc.
update public.items i
set position = t.ord - 1
from (
  select id,
         row_number() over (partition by category_id order by created_at, id) as ord
  from public.items
) t
where i.id = t.id;

-- Même forme que reorder_categories : un seul UPDATE ensembliste, l'ordre du
-- tableau fait la position. Droits de l'appelant : la RLS et le trigger des
-- articles s'appliquent, le gérant ne réordonne que sa carte.
create function public.reorder_items(p_ids uuid[])
returns void
language sql
as $$
  update items i
  set position = t.ord - 1
  from unnest(p_ids) with ordinality as t(id, ord)
  where i.id = t.id;
$$;

revoke execute on function public.reorder_items(uuid[]) from public, anon;
grant execute on function public.reorder_items(uuid[]) to authenticated;
