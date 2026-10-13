-- Section Projet de l'admin : les clients à interfacer, un par un, et les
-- chantiers qui restent pour finir chaque offre. Remplace le suivi lu dans
-- GitHub (milestones et issues). Tables internes : lues et écrites par les
-- seuls admins, d'où des policies is_admin() — quelques dizaines de lignes,
-- aucune requête de restaurant ne les traverse.

create type public.projet_step_status as enum ('todo', 'doing', 'done', 'blocked');

create table public.projet_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (name <> ''),
  product public.ominin_product not null,
  -- Ce qui porte les chiffres une fois en service ; rien tant que c'est un deal.
  etablissement_id uuid references public.etablissements (id) on delete set null,
  shop_id uuid references public.shops (id) on delete set null,
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- Un chantier : ce qui manque à une offre (null = transverse) pour être finie.
create table public.projet_chantiers (
  id uuid primary key default gen_random_uuid(),
  product public.ominin_product,
  title text not null check (title <> ''),
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table public.projet_steps (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.projet_clients (id) on delete cascade,
  chantier_id uuid references public.projet_chantiers (id) on delete cascade,
  -- Phase d'une étape client (Prospection, Intégration, Suivi) ; vide pour un chantier.
  phase text not null default '',
  position int not null,
  title text not null check (title <> ''),
  detail text not null default '',
  status public.projet_step_status not null default 'todo',
  owner text check (owner in ('marwan', 'ambaka')),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(client_id, chantier_id) = 1)
);
create index projet_steps_client_idx on public.projet_steps (client_id, position);
create index projet_steps_chantier_idx on public.projet_steps (chantier_id, position);

create trigger projet_steps_updated_at before update on public.projet_steps
  for each row execute function public.set_updated_at();

alter table public.projet_clients enable row level security;
alter table public.projet_chantiers enable row level security;
alter table public.projet_steps enable row level security;

create policy "admin" on public.projet_clients for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin" on public.projet_chantiers for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin" on public.projet_steps for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Pipeline type d'un client, de la recherche au bilan : la seule définition,
-- utilisée par l'admin à chaque client ajouté et par le remplissage ci-dessous.
create function public.projet_add_client(
  p_name text,
  p_product public.ominin_product,
  p_etablissement uuid default null,
  p_shop uuid default null
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into projet_clients (name, product, etablissement_id, shop_id)
  values (p_name, p_product, p_etablissement, p_shop)
  returning id into v_id;

  insert into projet_steps (client_id, phase, position, title)
  select v_id, step.phase, step.position, step.title
  from (values
    ('Prospection', 1, 'Recherche : carte, caisse, TPE, imprimantes, décideur'),
    ('Prospection', 2, case when p_product = 'shop'
      then 'Boutique de démo prête avec ses produits'
      else 'Démo prête sur sa carte (et pitch pour un réseau)' end),
    ('Prospection', 3, 'Premier contact (message, appel ou passage)'),
    ('Prospection', 4, 'Rendez-vous et démo présentée'),
    ('Prospection', 5, 'Accord : offre, prix et date de mise en service'),
    ('Intégration', 6, 'Inscription et CGV acceptées dans l''application'),
    ('Intégration', 7, case when p_product = 'shop'
      then 'Stripe Connect activé et commande test réelle'
      else 'Encaissement relié (Square ou Stripe) et paiement test réel' end),
    ('Intégration', 8, case when p_product = 'shop'
      then 'Catalogue en ligne : photos, prix, stock, livraison'
      else 'Carte transcrite et validée par le gérant (prix, options, allergènes)' end),
    ('Intégration', 9, case when p_product = 'shop'
      then 'Mentions légales et CGV de la boutique'
      else 'Thème aux couleurs et logo de l''établissement' end),
    ('Intégration', 10, case when p_product = 'shop'
      then 'Lien en bio et nom de domaine'
      else 'Tables saisies et Cachets commandés' end),
    ('Intégration', 11, case when p_product = 'shop'
      then 'Lancement annoncé sur ses réseaux'
      else 'Imprimantes et boîtier Omilink installés, tickets testés' end),
    ('Intégration', 12, case when p_product = 'shop'
      then 'Prise en main de l''espace de gestion'
      else 'Équipe formée (salle, cuisine, comptoir)' end),
    ('Suivi', 13, case when p_product = 'shop'
      then 'Premières ventes suivies'
      else 'Premier service accompagné' end),
    ('Suivi', 14, 'Bilan à 2 semaines : chiffres, retours, tarif définitif'),
    ('Suivi', 15, 'Avis client et accord pour le citer')
  ) as step (phase, position, title);

  return v_id;
end;
$$;

revoke execute on function public.projet_add_client(text, public.ominin_product, uuid, uuid)
  from public, anon;
grant execute on function public.projet_add_client(text, public.ominin_product, uuid, uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Point de départ au 2026-10-14 : les clients et deals en cours, et ce qui
-- reste pour finir les offres. Statuts d'après le README et les échanges.

do $$
declare
  v uuid;
begin
  v := projet_add_client('BOHO', 'menu',
    (select id from etablissements where slug = 'boho'));
  update projet_steps set status = 'done' where client_id = v;

  v := projet_add_client('LZ.FOOD', 'collect',
    (select id from etablissements where slug = 'lz-food'));
  update projet_steps set status = 'done' where client_id = v and position in (1, 2, 3, 4, 5, 8, 9);
  update projet_clients set notes = 'En pause. Ambaka passe le voir. Aucune CGV acceptée dans l''application ; contrat papier à retrouver.' where id = v;

  v := projet_add_client('L''Adresse', 'menu');
  update projet_steps set status = 'done' where client_id = v and position in (1, 2, 3);
  update projet_steps set status = 'doing' where client_id = v and position in (4, 8);
  update projet_clients set notes = 'Restaurant lounge. Rendez-vous d''onboarding le mer. 14 oct. au soir ; carte aux couleurs déjà prête.' where id = v;

  v := projet_add_client('MyBox', 'shop', null,
    (select id from shops where slug = 'mybox'));
  update projet_steps set status = 'done' where client_id = v and position in (1, 2, 3, 4, 5, 6, 8);
  update projet_clients set notes = 'Reste l''onboarding Stripe Connect avec la gérante et ses CGV.' where id = v;

  v := projet_add_client('Big Smash', 'collect');
  update projet_steps set status = 'doing' where client_id = v and position in (1, 2);
  update projet_clients set notes = 'Contact par le grand frère. Vidéo de vente faite (chez Ambaka). Relever carte, caisse et TPE avant le 14 oct.' where id = v;

  v := projet_add_client('Chicken Street', 'collect');
  update projet_steps set status = 'done' where client_id = v and position in (1, 2);
  update projet_clients set notes = 'Siège CS DEVELOPPEMENT, ≈ 118 restaurants. Pitch prêt (/chicken-street) ; il manque un contact.' where id = v;

  v := projet_add_client('O''Crousti Poulet', 'collect');
  update projet_steps set status = 'done' where client_id = v and position in (1, 2, 3);
  update projet_clients set notes = 'Réseau ≈ 40 restaurants. Pitch envoyé au siège, en attente de réponse.' where id = v;

  v := projet_add_client('Cyprien', 'collect');
  update projet_steps set status = 'done' where client_id = v and position = 3;
  update projet_steps set status = 'doing' where client_id = v and position = 1;
  update projet_clients set notes = 'Boulangerie-restaurant : refonte du site, gestion de stock, click & collect, commande interne. Projet sur mesure.' where id = v;

  v := projet_add_client('Nash Burger', 'collect');
  v := projet_add_client('Jefe Burger', 'collect');
end;
$$;

insert into projet_chantiers (id, product, title, position) values
  ('5e1f8c3a-0b6e-4d55-9c0e-000000000001', 'menu', 'Kit matériel : la box complète', 1),
  ('5e1f8c3a-0b6e-4d55-9c0e-000000000002', null, 'Réseaux sociaux', 2),
  ('5e1f8c3a-0b6e-4d55-9c0e-000000000003', 'collect', 'Paiement et caisses', 3),
  ('5e1f8c3a-0b6e-4d55-9c0e-000000000004', null, 'Juridique et facturation', 4),
  ('5e1f8c3a-0b6e-4d55-9c0e-000000000005', 'shop', 'Offre Shop', 5);

insert into projet_steps (chantier_id, position, title, status, owner) values
  ('5e1f8c3a-0b6e-4d55-9c0e-000000000001', 1, 'Choisir et chiffrer les 3 imprimantes thermiques (cuisine, bar, comptoir) : modèle, prix, fournisseur', 'todo', 'ambaka'),
  ('5e1f8c3a-0b6e-4d55-9c0e-000000000001', 2, 'Chiffrer le Raspberry Pi, la carte SD, l''alimentation, le boîtier et les câbles', 'todo', 'ambaka'),
  ('5e1f8c3a-0b6e-4d55-9c0e-000000000001', 3, 'Trouver 2 fournisseurs par composant (prix, délai, garantie)', 'todo', 'ambaka'),
  ('5e1f8c3a-0b6e-4d55-9c0e-000000000001', 4, 'Image Omilink installable en une commande (script et clé Tailscale réutilisable)', 'todo', 'ambaka'),
  ('5e1f8c3a-0b6e-4d55-9c0e-000000000001', 5, 'Procédure écrite de montage et de test du boîtier', 'todo', 'ambaka'),
  ('5e1f8c3a-0b6e-4d55-9c0e-000000000001', 6, 'Emballage et notice de branchement du kit', 'todo', 'marwan'),
  ('5e1f8c3a-0b6e-4d55-9c0e-000000000001', 7, 'Réviser le prix du kit (89 € aujourd''hui) d''après le coût réel', 'todo', 'marwan'),
  ('5e1f8c3a-0b6e-4d55-9c0e-000000000001', 8, 'Commander un kit de démo complet', 'todo', 'ambaka'),
  ('5e1f8c3a-0b6e-4d55-9c0e-000000000002', 1, 'Passer l''app Meta en Live (confidentialité, CGV, suppression des données)', 'todo', 'marwan'),
  ('5e1f8c3a-0b6e-4d55-9c0e-000000000002', 2, 'Reconnecter les 8 comptes Facebook et Instagram dans l''admin', 'todo', 'marwan'),
  ('5e1f8c3a-0b6e-4d55-9c0e-000000000002', 3, 'Publier un post de test, puis réactiver l''agent social', 'todo', 'marwan'),
  ('5e1f8c3a-0b6e-4d55-9c0e-000000000002', 4, 'Poser OPERATOR_ALERT_EMAIL sur Render (alerte si une publication échoue)', 'todo', 'ambaka'),
  ('5e1f8c3a-0b6e-4d55-9c0e-000000000002', 5, 'Ajouter Marwan super administrateur de la page LinkedIn', 'todo', 'ambaka'),
  ('5e1f8c3a-0b6e-4d55-9c0e-000000000002', 6, 'Créer les pages vitrines LinkedIn Menu, Collect et Shop', 'todo', 'marwan'),
  ('5e1f8c3a-0b6e-4d55-9c0e-000000000002', 7, 'Publier les 6 Reels validés (branche feat/reels)', 'todo', 'marwan'),
  ('5e1f8c3a-0b6e-4d55-9c0e-000000000002', 8, 'Session Reels du mercredi soir', 'todo', 'marwan'),
  ('5e1f8c3a-0b6e-4d55-9c0e-000000000002', 9, 'Nouvelle ligne éditoriale : visages et réel, 4 marques', 'todo', 'marwan'),
  ('5e1f8c3a-0b6e-4d55-9c0e-000000000003', 1, 'Tester de bout en bout le paiement Stripe dans la page (Apple Pay, Google Pay, carte)', 'todo', 'ambaka'),
  ('5e1f8c3a-0b6e-4d55-9c0e-000000000003', 2, 'Activer Apple Pay et Google Pay sur les domaines des comptes connectés', 'todo', 'ambaka'),
  ('5e1f8c3a-0b6e-4d55-9c0e-000000000003', 3, 'Vérifier que le mode fast food encaisse avec le moyen de paiement de Big Smash', 'todo', 'ambaka'),
  ('5e1f8c3a-0b6e-4d55-9c0e-000000000003', 4, 'Décider qui paie HubRise (35 € HT par restaurant et par mois)', 'todo', 'marwan'),
  ('5e1f8c3a-0b6e-4d55-9c0e-000000000003', 5, 'Construire le connecteur HubRise (commandes vers les caisses compatibles)', 'todo', 'ambaka'),
  ('5e1f8c3a-0b6e-4d55-9c0e-000000000004', 1, 'Relecture avocat des CGV et de l''annexe de sous-traitance', 'todo', 'ambaka'),
  ('5e1f8c3a-0b6e-4d55-9c0e-000000000004', 2, 'Mentions légales complètes (SIREN, RCS, adresse)', 'todo', 'ambaka'),
  ('5e1f8c3a-0b6e-4d55-9c0e-000000000004', 3, 'RC Pro couvrant le matériel installé et l''encaissement', 'todo', 'ambaka'),
  ('5e1f8c3a-0b6e-4d55-9c0e-000000000004', 4, 'Créer les prix Stripe live', 'todo', 'ambaka'),
  ('5e1f8c3a-0b6e-4d55-9c0e-000000000005', 1, 'Décider le taux de commission Shop', 'todo', 'marwan'),
  ('5e1f8c3a-0b6e-4d55-9c0e-000000000005', 2, 'Boutique de démo et fiche tarifaire Shop', 'todo', 'marwan'),
  ('5e1f8c3a-0b6e-4d55-9c0e-000000000005', 3, 'Mesurer le trafic et la conversion des boutiques', 'todo', 'ambaka');
