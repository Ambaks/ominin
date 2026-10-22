-- Avis de l'arbitre sur un brouillon de l'agent réseaux sociaux : chaque
-- version est notée par un appel séparé, et réécrite d'après sa critique
-- jusqu'à la note visée ; la meilleure part en validation avec son avis
-- (score sur 10, verdict, corrections restantes, réécritures faites),
-- affiché dans l'admin. Effacé quand l'admin modifie le post à la main.
-- ---------------------------------------------------------------------------

alter table public.social_posts add column review jsonb;
