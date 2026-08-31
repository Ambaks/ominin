-- Correction administrative du gérant : annuler un encaissement en espèces
-- (saisie erronée, encaissement fantôme). Seule transition ajoutée :
-- payee → annulee, réservée aux paiements espèces — un paiement carte ou en
-- ligne correspond à une transaction réelle qui ne s'efface pas d'ici.
create or replace function public.enforce_order_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status = old.status then
    return new;
  end if;
  if not (case
    when new.type = 'collect' then case old.status
      when 'en_attente' then new.status in ('en_preparation', 'annulee')
      when 'en_preparation' then new.status in ('prete', 'annulee')
      when 'prete' then new.status in ('retiree', 'annulee')
      else false
    end
    else case old.status
      when 'en_attente' then new.status in ('en_preparation', 'annulee')
      when 'en_preparation' then new.status in ('prete', 'annulee')
      when 'prete' then new.status in ('servie', 'annulee')
      when 'servie' then new.status = 'payee'
      when 'payee' then new.status = 'annulee'
        and old.payment_mode = 'especes'
      else false
    end
  end) then
    raise exception 'Transition de statut invalide : % → %.', old.status, new.status;
  end if;
  return new;
end;
$$;

-- La transition payee → annulee ouverte ci-dessus ne doit être accessible
-- qu'au gérant : le cuisinier ne touche plus à une commande déjà payée.
-- Le serveur est déjà limité aux passages vers servie/retiree.
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
       or new.status = 'payee'
       or old.status = 'payee' then
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
