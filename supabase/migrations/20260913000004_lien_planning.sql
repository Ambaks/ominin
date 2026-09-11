-- Le lien de planning d'un serveur ne montre que son planning. Ses heures —
-- le total prévu de la semaine, les badgeages en regard de chaque jour — n'y
-- paraissent que si Ominin l'ouvre au restaurant (capacité lien_heures). Le
-- BOHO n'en veut pas : le serveur y lit ses créneaux, rien d'autre.
--
-- Le réglage se lit ici, dans la fonction que la page publique appelle : un
-- lien anonyme ne sait pas résoudre l'offre. Absent des réglages, le drapeau
-- vaut oui — ce que l'offre ouvre (OFFRE_FEATURES) — et un restaurant sans
-- badgeage n'a de toute façon ni créneaux ni badgeages à montrer.

create or replace function public.staff_planning(
  p_token text,
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_staff public.staff;
  v_etablissement text;
  v_hours boolean;
begin
  select * into v_staff from staff where planning_token = p_token;
  if not found then
    return null;
  end if;
  select name into v_etablissement
  from etablissements where id = v_staff.etablissement_id;
  select coalesce((features->>'lien_heures')::boolean, true) into v_hours
  from etablissement_settings where etablissement_id = v_staff.etablissement_id;
  v_hours := coalesce(v_hours, true);

  return jsonb_build_object(
    'name', v_staff.name,
    'etablissement', v_etablissement,
    'hours', v_hours,
    'shifts', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', id, 'starts_at', starts_at, 'ends_at', ends_at, 'note', note)
        order by starts_at
      )
      from shifts
      where staff_id = v_staff.id and starts_at >= p_from and starts_at < p_to
    ), '[]'::jsonb),
    'entries', case when v_hours then coalesce((
      select jsonb_agg(
        jsonb_build_object('id', id, 'started_at', started_at, 'ended_at', ended_at)
        order by started_at
      )
      from time_entries
      where staff_id = v_staff.id and started_at >= p_from and started_at < p_to
    ), '[]'::jsonb) else '[]'::jsonb end
  );
end;
$$;

-- Le BOHO, nommément (même geste que 20260911000004) : pas d'heures sur le
-- lien de ses serveurs, et pas d'onglet Produits sur la tablette du comptoir.
update public.etablissement_settings
set features = features || '{"lien_heures": false, "produits": false}'::jsonb,
    updated_at = now()
where etablissement_id = (
  select id from public.etablissements where slug = 'boho'
);
