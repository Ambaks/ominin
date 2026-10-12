-- Composeur Connect (/composer) : les réponses du restaurateur — caisse,
-- tickets, imprimantes et leur branchement, matériel commandé, service,
-- tables, supports QR — enregistrées à la création de l'établissement.
-- L'e-mail de commande de démarrage et la fiche client de l'admin les
-- relisent (lib/composer.ts, parseAnswers) : le contenu vient d'un client et
-- n'est jamais interprété tel quel.
--
-- Table à part, pas une colonne d'etablissements : celle-ci est lisible par
-- tous (vitrine publique du menu), et la salle d'un client ne regarde que
-- lui et Ominin.

create table public.starter_setups (
  etablissement_id uuid primary key
    references public.etablissements (id) on delete cascade,
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  created_at timestamptz not null default now(),
  -- E-mail de commande de démarrage parti : une relivraison du webhook
  -- Stripe ne le renvoie pas.
  notified_at timestamptz
);

alter table public.starter_setups enable row level security;

-- Lecture : le gérant, et Ominin depuis l'admin. Aucune écriture directe —
-- save_starter_setup pour le gérant, service_role pour le webhook.
create policy "gerant or admin read" on public.starter_setups
  for select to authenticated
  using (
    public.current_member_role(etablissement_id) = 'gerant'
    or public.is_admin()
  );

-- Le gérant enregistre les réponses de son établissement ; un comptoir
-- (service = fast_food) ouvre aussitôt le mode fast food.
create function public.save_starter_setup(
  p_etablissement_id uuid,
  p_setup jsonb
)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if public.current_member_role(p_etablissement_id) is distinct from 'gerant' then
    raise exception 'Seul le gérant enregistre le démarrage.';
  end if;

  insert into starter_setups (etablissement_id, answers)
  values (p_etablissement_id, p_setup)
  on conflict (etablissement_id) do update
    set answers = excluded.answers, created_at = now();

  if p_setup ->> 'service' = 'fast_food' then
    update etablissements
    set service_mode = 'fast_food'
    where id = p_etablissement_id;
  end if;
end;
$$;

revoke execute on function public.save_starter_setup(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.save_starter_setup(uuid, jsonb)
  to authenticated;
