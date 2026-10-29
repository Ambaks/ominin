-- Réseaux sociaux : les Reels en scènes (frontend/lib/social/script.ts). Un
-- Reel se monte soit d'après reel (voix off, l'ancien format), soit d'après
-- script (blocs animés du site), que les agents du montage corrigent scène par
-- scène puis transition par transition au moment du rendu (social-render) ;
-- production garde leurs notes, que l'admin affiche avec la vidéo.
alter table public.social_posts
  add column script jsonb,
  add column production jsonb,
  drop constraint social_posts_reel_check,
  add constraint social_posts_reel_check
    check ((format = 'reel') = ((reel is not null or script is not null) and render_status is not null)),
  add constraint social_posts_script_check check (reel is null or script is null);
