-- Réseaux sociaux : plus rien ne part sans validation. L'agent prépare le
-- mercredi soir les brouillons de la semaine (trois créneaux par marque),
-- l'admin les relit, les corrige ou les fait réécrire, puis les valide ; le
-- job de publication ne publie que les posts validés dont l'heure est venue.
-- L'analyse des résultats ne réécrit plus la ligne éditoriale : elle propose,
-- l'admin adopte ou ignore.
-- ---------------------------------------------------------------------------

alter table public.outreach_runs drop constraint outreach_runs_job_check;
alter table public.outreach_runs add constraint outreach_runs_job_check
  check (job in (
    'discover', 'enrich', 'outreach', 'inbox', 'autoresearch',
    'social_post', 'social_research', 'social_draft', 'social_redraft',
    'social_render', 'agents_tick'
  ));

-- Format choisi par l'agent pour chaque créneau. carousel : slides (5 à 8
-- images). image : un seul visuel, slides d'une image. reel : vidéo verticale
-- montée d'après reel (scènes : voix off, texte à l'écran, visuel), rendue
-- par le workflow social-render (Remotion, dossier social-video/) et déposée
-- dans le bucket social-videos ; render_status suit ce rendu.
alter table public.social_posts drop constraint social_posts_format_check;
alter table public.social_posts
  add constraint social_posts_format_check
    check (format in ('carousel', 'image', 'reel')),
  add column reel jsonb,
  add column render_status text
    check (render_status in ('pending', 'rendering', 'ready', 'failed')),
  add column render_error text,
  -- Chemin dans le bucket : <post>/<horodatage>.mp4, nouveau à chaque rendu
  -- (le CDN du stockage garde l'ancienne vidéo en cache sous l'ancien nom).
  add column video_path text,
  add constraint social_posts_reel_check
    check ((format = 'reel') = (reel is not null and render_status is not null));

-- Public : Instagram et Facebook viennent chercher la vidéo à son URL.
-- Écrit par le seul service_role (le workflow de rendu).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('social-videos', 'social-videos', true, 104857600, array['video/mp4'])
on conflict (id) do nothing;

-- draft : à relire. redrafting : l'admin a demandé une réécriture (feedback),
-- le job social_redraft la reprend. approved : part à scheduled_at.
-- published : tous ses comptes ont été tentés avec succès (ou préparés pour
-- Snapchat). rejected : écarté. Les posts d'avant la validation sont tous
-- partis ou abandonnés : 'published', pour que rien d'ancien ne soit retenté.
alter table public.social_posts
  add column status text not null default 'published'
    check (status in ('draft', 'redrafting', 'approved', 'published', 'rejected')),
  add column scheduled_at timestamptz,
  add column feedback text,
  add column updated_at timestamptz not null default now();

update public.social_posts
  set scheduled_at = (post_date + time '13:30') at time zone 'UTC';

alter table public.social_posts
  alter column status set default 'draft',
  alter column scheduled_at set not null;

create index social_posts_due_idx on public.social_posts (scheduled_at)
  where status = 'approved';

-- updated_at versionne les images : l'URL d'une image porte ?v=<updated_at>,
-- une correction donne une nouvelle URL (les images sont en cache immuable).
create trigger social_posts_touch before update on public.social_posts
  for each row execute function public.set_updated_at();

-- L'admin corrige les textes, valide, rejette, demande une réécriture.
create policy "admin update" on public.social_posts
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Proposition de l'analyse, posée sur la version en vigueur :
-- { guidelines, change_summary, findings, created_at }. L'adopter insère une
-- nouvelle version ; l'ignorer la vide.
alter table public.social_playbooks add column proposal jsonb;

create policy "admin update" on public.social_playbooks
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Nouvelles lignes éditoriales. Ominin porte la vision et renvoie vers les
-- trois offres ; Menu, Collect et Shop font la publicité de la leur.
insert into public.social_playbooks (brand, version, guidelines, change_summary)
select
  brand,
  coalesce(
    (select max(version) from public.social_playbooks p where p.brand = b.brand),
    0
  ) + 1,
  btrim(case when brand = 'ominin' then $ominin$
- Ce compte raconte Ominin : pourquoi on existe, ce qu'on construit, pour qui. Sa ligne : que l'intelligence artificielle prenne le poids, que l'humain garde le sens. Le travail répétitif des commerçants n'est pas une fatalité.
- Alterne d'une publication à l'autre : un manifeste (une seule idée forte, dite avec énergie) ; un problème du quotidien d'un commerçant et l'offre Ominin qui le règle ; une offre présentée en entier ; un avant / après dans la journée d'un commerçant.
- Formats : le Reel porte le manifeste et l'émotion (des visages, une voix, un rythme) ; le carrousel explique ; l'image seule frappe une idée en une phrase.
- Chaque publication renvoie vers au moins un compte produit (Menu, Collect ou Shop), avec son compte, à la fin et dans la légende.
- Montre ce qu'on fait : quand le sujet touche une offre, on voit l'outil (capture ou démo filmée).
- Ton : celui du site ominin.com. Phrases courtes, affirmées, qui ont du souffle. Vouvoiement. Pas de jargon, pas de superlatif creux.
- Légende : deux ou trois phrases qui prolongent l'accroche, le compte produit concerné, puis l'action. Sur Instagram, 5 à 8 hashtags précis en fin de légende.
$ominin$ else $offre$
- Chaque publication est une publicité pour l'offre : son but est qu'un commerçant de la cible nous écrive ou essaie la démo cette semaine.
- Déroulé : une accroche qui nomme un problème vécu, avec les mots de la cible ; ce que ce problème coûte (temps, argent, clients perdus) ; notre solution, montrée à l'écran ; comment ça se met en place (notre équipe s'occupe de tout) ; une seule action à la fin.
- On montre le produit, on ne le décrit pas seulement : captures dans le carrousel, démos filmées dans le Reel.
- Formats : le Reel pour faire vivre le problème puis la solution (vraies personnes, voix, démo) ; le carrousel pour expliquer pas à pas ou faire un calcul ; l'image seule pour une offre ou une objection en une phrase.
- Alterne les angles d'une publication à l'autre : problème et solution, avant / après, une fonctionnalité en gros plan, une objection fréquente levée, le calcul de ce que l'offre coûte face à ce qu'elle évite (avec les seuls chiffres de la fiche et des tarifs).
- Cite un tarif quand il aide à décider, jamais un autre que ceux du bloc des tarifs.
- Ton : direct, concret, énergique. Vouvoiement. Phrases courtes. Zéro jargon technique.
- Légende : deux ou trois phrases qui prolongent l'accroche, puis l'action. Sur Instagram, 5 à 8 hashtags précis (métier, ville, usage) en fin de légende.
$offre$ end, E'\n'),
  'Refonte : validation dans l''admin, format libre (Reel, carrousel, image), Ominin raconte la vision, les offres font leur publicité en montrant l''outil.'
from (values ('ominin'), ('menu'), ('collect'), ('shop')) as b (brand);
