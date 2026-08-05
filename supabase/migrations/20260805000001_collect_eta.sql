-- Estimation de préparation d'une commande à emporter « dès que possible » :
-- choisie par le restaurateur au moment de passer la commande en préparation
-- (puces 5/15/25/40 min côté dashboard). Null = pas d'estimation — soit une
-- commande à heure de retrait fixe (pickup_at fait foi), soit le comportement
-- historique conservé.

alter table public.orders
  add column estimated_ready_at timestamptz;

-- Le cuisinier doit pouvoir poser l'estimation en même temps que le statut :
-- sans cette exemption, le garde-fou par rôle rejette l'update combiné
-- {status, estimated_ready_at}. Branches gérant/serveur inchangées.
create or replace function public.enforce_order_update_rights()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_role public.member_role;
begin
  if auth.role() is distinct from 'authenticated' then
    return new;
  end if;
  v_role := current_member_role(new.etablissement_id);
  if v_role = 'gerant' then
    return new;
  end if;
  if v_role = 'cuisinier' then
    if to_jsonb(new) - 'status' - 'estimated_ready_at'
         is distinct from to_jsonb(old) - 'status' - 'estimated_ready_at'
       or new.status = 'payee' then
      raise exception 'Le rôle cuisinier ne permet pas cette modification.';
    end if;
    return new;
  end if;
  if v_role = 'serveur' then
    if to_jsonb(new) - 'status' - 'group_id'
         is distinct from to_jsonb(old) - 'status' - 'group_id'
       or (new.status <> old.status and new.status not in ('servie', 'retiree')) then
      raise exception 'Le rôle serveur ne permet pas cette modification.';
    end if;
    return new;
  end if;
  raise exception 'Modification non autorisée.';
end;
$$;
