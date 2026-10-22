-- Avancement du rendu d'un Reel, écrit par le workflow social-render au fil
-- du travail et affiché en barre dans l'admin (« À valider ») : l'étape en
-- cours, la part faite (0 à 1) et, pendant le montage, le temps restant
-- estimé en secondes.
-- ---------------------------------------------------------------------------

alter table public.social_posts
  add column render_stage text,
  add column render_progress real check (render_progress between 0 and 1),
  add column render_eta_seconds int check (render_eta_seconds >= 0);
