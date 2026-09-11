-- Renvoyer les tickets d'une table. Un ticket ne sort pas toujours : rouleau
-- fini, bourrage, boîtier redémarré, ticket égaré entre le passe et le piano.
-- La salle doit pouvoir le refaire partir depuis la fiche de table qu'elle a
-- déjà sous les yeux, sans défaire un encaissement pour le refaire.
--
-- Les tickets de commande naissent par trigger (sync_order_tickets) et la
-- policy d'insertion de print_jobs ne laisse passer que les tests du gérant :
-- ce geste passe donc par une fonction, qui vérifie le rôle et
-- l'établissement, plutôt qu'en rouvrant la file en écriture.
--
-- Ce qui est renvoyé l'est pour toutes les imprimantes de l'établissement,
-- comme à la première impression : c'est /omilink/sync qui applique le
-- routage (item_printers) et abandonne les tickets restés vides. Une
-- commande dont un ticket attend encore sa sortie ne se dédouble pas —
-- l'ancien est abandonné avant que le nouveau prenne sa place, sinon un
-- boîtier revenu d'une panne sortirait deux fois le même ticket.

create function public.reprint_order_tickets(p_order_ids uuid[])
returns integer
language plpgsql security definer
set search_path = public
as $$
declare
  v_etabs uuid[];
  v_etab uuid;
  v_role public.member_role;
  v_count integer;
begin
  if coalesce(array_length(p_order_ids, 1), 0) = 0 then
    raise exception 'Aucune commande à renvoyer.';
  end if;

  select array_agg(distinct etablissement_id) into v_etabs
  from orders where id = any(p_order_ids);
  if v_etabs is null then
    raise exception 'Commande introuvable.';
  end if;
  if array_length(v_etabs, 1) <> 1 then
    raise exception 'Les commandes doivent appartenir au même établissement.';
  end if;
  v_etab := v_etabs[1];

  -- Un non-membre n'a pas de rôle : le null ne doit pas passer le test.
  v_role := current_member_role(v_etab);
  if v_role is null or v_role not in ('gerant', 'serveur') then
    raise exception 'Modification non autorisée.';
  end if;

  if exists (
    select 1 from orders where id = any(p_order_ids) and status = 'annulee'
  ) then
    raise exception 'Une commande annulée n''a pas de ticket.';
  end if;

  update print_jobs set status = 'cancelled'
  where order_id = any(p_order_ids) and status = 'pending';

  insert into print_jobs (etablissement_id, printer_id, order_id, kind)
  select v_etab, p.id, o.id, 'order'
  from orders o
  cross join printers p
  where o.id = any(p_order_ids) and p.etablissement_id = v_etab;

  -- Zéro : aucune imprimante déclarée. L'écran le dit plutôt que de laisser
  -- croire qu'un ticket est parti.
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.reprint_order_tickets(uuid[]) from public, anon;
grant execute on function public.reprint_order_tickets(uuid[]) to authenticated;
