-- Produits visés par un prospect. L'admin se lit désormais par produit (vue
-- d'ensemble, Menu, Collect, Shop, Clip, Agents, Sur mesure) : un prospect
-- apparaît dans la vue de chaque produit qu'on cherche à lui vendre.
--
-- Toute la prospection menée jusqu'ici vendait Ominin Menu : c'est le défaut,
-- pour les fiches existantes comme pour celles que créent l'import CSV, la
-- découverte et Léa. Un tableau vide est permis : la fiche ne reste visible
-- que dans la vue d'ensemble.

create type public.ominin_product as enum (
  'menu', 'collect', 'shop', 'clip', 'agents', 'sur-mesure'
);

alter table public.crm_leads
  add column target_products public.ominin_product[] not null default '{menu}';

comment on column public.crm_leads.target_products is
  'Produits Ominin proposés à ce restaurant ; filtre les vues produit de l''admin.';
