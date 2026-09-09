-- Ce qu'Ominin ouvre à chaque restaurant. L'offre souscrite donne le lot
-- habituel ; ces réglages l'ajustent au cas par cas, dans un sens comme dans
-- l'autre — un client Smart à qui l'on ouvre les terminaux, un Connect qui ne
-- veut pas de badgeuse. Une ligne par établissement, créée avec lui.
--
-- Les capacités sont un objet et non des colonnes : la liste bouge à chaque
-- fonctionnalité, et une migration par case à cocher n'aurait pas de sens.
-- L'absence d'une clé veut dire « comme l'offre », pas « fermé » : c'est ce
-- qui permet à un nouveau réglage d'arriver sans toucher aux lignes.

create table public.etablissement_settings (
  etablissement_id uuid primary key
    references public.etablissements (id) on delete cascade,
  -- { "terminaux": true, "badgeage": false } — seulement les écarts à l'offre.
  features jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.etablissement_settings enable row level security;

-- L'équipe lit ses propres réglages (l'espace de gestion en dépend) ; Ominin
-- lit et écrit ceux de tout le monde depuis l'admin.
create policy "member read" on public.etablissement_settings
  for select to authenticated
  using (
    public.current_member_role(etablissement_id) is not null
    or public.is_admin()
  );
create policy "admin insert" on public.etablissement_settings
  for insert to authenticated
  with check (public.is_admin());
create policy "admin update" on public.etablissement_settings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Chaque établissement a sa ligne, dès sa création : l'écran d'administration
-- n'a jamais à distinguer « pas encore réglé » de « tout par défaut ».
create function public.etablissement_settings_row()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into etablissement_settings (etablissement_id)
  values (new.id)
  on conflict (etablissement_id) do nothing;
  return new;
end;
$$;

create trigger etablissements_settings_row
  after insert on public.etablissements
  for each row execute function public.etablissement_settings_row();

insert into public.etablissement_settings (etablissement_id)
select id from public.etablissements
on conflict (etablissement_id) do nothing;

-- L'écran des capacités part de ce que l'offre ouvre déjà : sans l'abonnement
-- sous les yeux, une case cochée ne voudrait rien dire.
create policy "admin read" on public.subscriptions
  for select to authenticated using (public.is_admin());

-- Le menu QR se retire comme le reste, et il se consulte sans compte : la page
-- publique doit pouvoir lire ce seul drapeau. Ces réglages n'en disent pas
-- plus que la colonne offre, déjà publique.
create policy "public read" on public.etablissement_settings
  for select to anon using (true);
