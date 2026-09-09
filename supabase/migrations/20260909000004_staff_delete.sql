-- Retirer un serveur le supprime, sans archive : sa fiche part, avec son lien
-- de planning et ses créneaux. Ses badgeages, eux, restent lisibles dans le
-- journal — ils portent son nom, figé au moment de la signature — car un
-- décompte du temps de travail se conserve même quand la personne est partie.
-- La fiche n'est donc plus la propriétaire de ses heures : elle s'en détache.

alter table public.time_entries
  drop constraint time_entries_staff_id_fkey,
  alter column staff_id drop not null,
  add constraint time_entries_staff_id_fkey
    foreign key (staff_id) references public.staff (id) on delete set null;

alter table public.staff drop column archived_at;

-- Le lien d'un serveur retiré ne répond plus parce que sa fiche n'existe
-- plus : le filtre sur l'archive n'a plus lieu d'être.
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
begin
  select * into v_staff from staff where planning_token = p_token;
  if not found then
    return null;
  end if;
  select name into v_etablissement
  from etablissements where id = v_staff.etablissement_id;

  return jsonb_build_object(
    'name', v_staff.name,
    'etablissement', v_etablissement,
    'shifts', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', id, 'starts_at', starts_at, 'ends_at', ends_at, 'note', note)
        order by starts_at
      )
      from shifts
      where staff_id = v_staff.id and starts_at >= p_from and starts_at < p_to
    ), '[]'::jsonb),
    'entries', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', id, 'started_at', started_at, 'ended_at', ended_at)
        order by started_at
      )
      from time_entries
      where staff_id = v_staff.id and started_at >= p_from and started_at < p_to
    ), '[]'::jsonb)
  );
end;
$$;
