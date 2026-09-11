-- Nom d'un article sur le ticket de cuisine. La carte dit « L'entrecôte, la
-- fameuse » ; la cuisine n'a besoin que d'« Entrecôte », en gros caractères
-- sur un rouleau de quarante-deux colonnes. Nul, le nom de la carte sort tel
-- quel : rien ne change pour qui n'en veut pas.
--
-- Le nom imprimé se lit au moment de l'impression, sur l'article — pas figé
-- sur la ligne de commande comme le nom de la carte : renvoyer un ticket
-- après avoir raccourci un surnom sort le surnom corrigé.

alter table public.items add column print_name text
  check (print_name is null or length(trim(print_name)) > 0);
