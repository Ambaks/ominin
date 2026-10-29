-- Réseaux sociaux : la fonctionnalité que présente chaque publication
-- (frontend/lib/social/features.ts). L'agent tourne sur le catalogue : il
-- reprend la moins récemment présentée, jamais deux fois de suite.
alter table public.social_posts add column feature text;
