-- Le code d'encaissement devient facultatif. Sans code posé, l'équipe
-- encaisse sans rien saisir ; un code posé reste exigé à chaque encaissement,
-- et le gérant peut le retirer quand il veut. La base seule en décide : seule
-- l'absence de code en base dispense de le saisir.

-- Vide, le code est retiré, comme le code Admin.
create or replace function public.set_payment_pin(
  p_etablissement_id uuid,
  p_code text
)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  v_scope text := 'admin:' || p_etablissement_id;
  v_admin_hash text;
begin
  if current_member_role(p_etablissement_id) is distinct from 'gerant' then
    raise exception 'Réservé au gérant de l''établissement.';
  end if;
  if p_code is null or length(trim(p_code)) = 0 then
    delete from payment_pins where etablissement_id = p_etablissement_id;
    update etablissements
    set payment_pin_set = false
    where id = p_etablissement_id;
    return true;
  end if;
  if p_code !~ '^[0-9]{4}$' then
    raise exception 'Le code d''encaissement doit compter exactement 4 chiffres.';
  end if;
  select pin_hash into v_admin_hash
  from admin_pins
  where etablissement_id = p_etablissement_id;
  if v_admin_hash is not null
     and extensions.crypt(p_code, v_admin_hash) = v_admin_hash then
    raise exception 'Le code d''encaissement doit être différent du code Admin.';
  end if;
  perform pin_guard(v_scope);
  if is_ominin_admin_pin(p_code) then
    return pin_attempt(v_scope, false);
  end if;
  insert into payment_pins (etablissement_id, pin_hash)
  values (
    p_etablissement_id,
    extensions.crypt(p_code, extensions.gen_salt('bf'))
  )
  on conflict (etablissement_id) do update
    set pin_hash = excluded.pin_hash, updated_at = now();
  update etablissements
  set payment_pin_set = true
  where id = p_etablissement_id;
  return true;
end;
$$;

-- Sans code posé, il n'y a rien à vérifier : une tablette qui croit encore à
-- un code retiré entre-temps encaisse quand même, sans compter d'échec.
create or replace function public.verify_payment_pin(
  p_etablissement_id uuid,
  p_code text
)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  v_scope text := 'payment:' || p_etablissement_id;
  v_hash text;
begin
  if current_member_role(p_etablissement_id) is null then
    return false;
  end if;
  select pin_hash into v_hash
  from payment_pins
  where etablissement_id = p_etablissement_id;
  if v_hash is null then
    return true;
  end if;
  perform pin_guard(v_scope);
  return pin_attempt(
    v_scope,
    coalesce(extensions.crypt(p_code, v_hash) = v_hash, false)
  );
end;
$$;

-- Un code posé après le chargement de la page arrive ici sans code saisi :
-- refus explicite, qui ne compte pas comme un essai.
create or replace function public.pay_order_items(
  p_items jsonb,
  p_mode public.payment_mode,
  p_payment_code text,
  p_cash_given numeric default null,
  p_cash_change numeric default null,
  p_tip numeric default null,
  p_cash_amount numeric default null
)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  v_etab uuid;
  v_scope text;
  v_hash text;
begin
  select o.etablissement_id into v_etab
  from order_items oi
  join orders o on o.id = oi.order_id
  where oi.id = (p_items->0->>'item_id')::uuid;
  if v_etab is null then
    raise exception 'Aucun article sélectionné.';
  end if;
  if current_member_role(v_etab) is null then
    raise exception 'Encaissement non autorisé.';
  end if;
  select pin_hash into v_hash
  from payment_pins
  where etablissement_id = v_etab;
  if v_hash is not null then
    if p_payment_code is null then
      raise exception 'Un code d''encaissement est désormais demandé : rechargez la page.';
    end if;
    v_scope := 'payment:' || v_etab;
    perform pin_guard(v_scope);
    if not pin_attempt(
      v_scope,
      coalesce(extensions.crypt(p_payment_code, v_hash) = v_hash, false)
    ) then
      return false;
    end if;
  end if;
  perform public.pay_order_items_internal(
    p_items,
    p_mode,
    p_cash_given,
    p_cash_change,
    p_tip,
    p_cash_amount
  );
  return true;
end;
$$;
