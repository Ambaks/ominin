-- Le choix « payer par carte » du menu QR n'a de sens que si un compte
-- Stripe relié peut encaisser : online_payment à true sans compte
-- charges_enabled envoie le client vers un paiement qui échoue (BOHO avait
-- été provisionné ainsi). L'invariant est posé en base, quel que soit le
-- chemin d'écriture (dashboard, script, migration).

update public.etablissements e
set online_payment = false
where online_payment
  and not exists (
    select 1
    from public.payment_accounts p
    where p.etablissement_id = e.id
      and p.charges_enabled
  );

create or replace function public.enforce_online_payment_account()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.online_payment and not exists (
    select 1
    from public.payment_accounts
    where etablissement_id = new.id
      and charges_enabled
  ) then
    raise exception 'Reliez un compte Stripe vérifié avant de proposer le paiement par carte.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger enforce_online_payment_account
  before insert or update of online_payment on public.etablissements
  for each row execute function public.enforce_online_payment_account();

-- Stripe peut retirer l'autorisation d'encaisser (vérification échouée) :
-- le menu cesse alors aussitôt de proposer la carte.
create or replace function public.sync_online_payment_with_account()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if not new.charges_enabled then
    update public.etablissements
    set online_payment = false
    where id = new.etablissement_id
      and online_payment;
  end if;
  return new;
end;
$$;

create trigger sync_online_payment_with_account
  after update of charges_enabled on public.payment_accounts
  for each row execute function public.sync_online_payment_with_account();
