-- Un téléphone connecté à l'espace de gestion (menu.ominin.com sert les deux,
-- une seule session) commande comme un client : ses gestes passent par les
-- RPC du menu (place_order, abandon_online_payment, loyalty_claim_order) avec
-- un jeton « authenticated ». Le garde des droits refusait tout compte qui
-- n'est pas membre de l'établissement : « Payer au bar » échouait au Caffè
-- Panis depuis le téléphone de l'admin (2026-10-23). Sans membre, l'écriture
-- ne peut venir que d'une RPC — la RLS « member update » ferme la table aux
-- autres —, et chacune de celles de l'équipe vérifie elle-même le rôle : le
-- compte passe comme un anonyme. Un serveur qui commande pour lui peut, de
-- même, revenir au comptoir (online_payment_started_at effacé), rien d'autre
-- de neuf. Reprise de 20261015000003_precommandes.sql.

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
  if v_role is null or v_role = 'gerant' then
    return new;
  end if;
  if v_role = 'serveur' then
    if to_jsonb(new) - 'status' - 'payment_mode' - 'cash_given' - 'cash_change' - 'tip_amount' - 'estimated_ready_at' - 'staff_id' - 'online_payment_started_at'
         is distinct from to_jsonb(old) - 'status' - 'payment_mode' - 'cash_given' - 'cash_change' - 'tip_amount' - 'estimated_ready_at' - 'staff_id' - 'online_payment_started_at'
       or (new.online_payment_started_at is not null
           and new.online_payment_started_at is distinct from old.online_payment_started_at)
       or old.status in ('servie', 'annulee', 'retiree')
       or (old.payment_mode is not null and new.payment_mode is null)
       or ((new.payment_mode = 'en_ligne' or old.payment_mode = 'en_ligne')
           and new.payment_mode is distinct from old.payment_mode)
       or (new.status <> old.status
           and new.status not in ('payee', 'servie', 'en_preparation', 'prete', 'retiree')
           and not (new.status = 'annulee' and not old.paid_online and (
             old.status = 'en_attente'
             or (old.type = 'collect' and old.payment_mode is distinct from 'en_ligne'
                 and not exists (select 1 from order_items
                                 where order_id = old.id and paid_mode is not null))
           ))) then
      raise exception 'Le rôle serveur ne permet pas cette modification.';
    end if;
    return new;
  end if;
  raise exception 'Modification non autorisée.';
end;
$$;
