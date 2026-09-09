-- Les étapes que la salle voit dans Commandes, et leur ordre. Ce réglage ne
-- dit pas oui ou non, il dit dans quel ordre : il lui faut donc une colonne
-- propre, là où `features` ne sait porter que des booléens.
--
-- Le BOHO n'a que « À encaisser » puis « Historique » : ses tickets sortent à
-- l'imprimante, il n'a rien à suivre entre les deux. Un restaurant qui sert
-- avant d'encaisser mettra « À servir » en premier ; un autre gardera les
-- trois. C'est là que se lit, concrètement, si l'on encaisse au début ou à la
-- fin du repas.
--
-- (Le second réglage du même lot — le gérant monte son équipe au prénom
-- plutôt que par invitation — est un booléen : il rejoint `features` sous la
-- clé `equipe_sans_comptes`, sans migration, comme le permet le jsonb.)

create type public.order_tab as enum ('a_encaisser', 'a_servir', 'historique');

-- Par défaut, ce que l'écran faisait déjà : l'addition puis l'historique.
-- « À servir » n'y est pas parce qu'une commande encaissée part à l'imprimante
-- et se clôt dans la foulée — l'onglet serait vide. Il se rajoute de lui-même
-- quand une assiette y attend vraiment, et se règle à demeure pour un
-- restaurant qui sert avant de faire payer. Passer la migration ne change donc
-- rien pour personne.
--
-- Au moins une étape, jamais plus que les trois existantes. L'unicité, elle,
-- ne s'exprime pas dans un CHECK sans sous-requête : ces lignes ne s'écrivent
-- que depuis l'administration d'Ominin, et l'écran ne propose pas de doublon.
alter table public.etablissement_settings
  add column order_tabs public.order_tab[] not null
    default '{a_encaisser,historique}'::public.order_tab[]
    constraint order_tabs_bornes
      check (cardinality(order_tabs) between 1 and 3);

-- L'espace de gestion lit ce réglage comme il lit `features` : la policy
-- « member read » existante le couvre déjà, et seule Ominin l'écrit.
comment on column public.etablissement_settings.order_tabs is
  'Étapes de l''onglet Commandes, dans l''ordre d''affichage.';
