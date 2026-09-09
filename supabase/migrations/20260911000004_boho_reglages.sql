-- Les réglages du BOHO, posés nommément. Deux choses à ne pas confondre :
-- ce que le produit fait par défaut, et ce que ce restaurant-là a demandé.
--
-- Le défaut, d'abord, repasse aux trois étapes. La migration précédente le
-- mettait à « addition puis historique » pour ne rien changer en passant ;
-- mais ce faisant elle retirait « À servir » à tout le monde, alors que
-- c'est une demande du BOHO seul — ses tickets sortent à l'imprimante, il n'a
-- rien à suivre entre l'addition et l'historique. Un restaurant qu'on n'a pas
-- réglé voit donc désormais son service en entier, et Ominin retire ce qui ne
-- lui sert pas.

alter table public.etablissement_settings
  alter column order_tabs
    set default '{a_encaisser,a_servir,historique}'::public.order_tab[];

-- Le BOHO ensuite, et lui seul.
--
--  1. Pas d'onglet « À servir ». Le filet reste : si un boîtier Omilink
--     tombe, l'écran le rajoute de lui-même le temps de la panne.
--  2. L'équipe se monte au prénom. Le gérant travaille sur la tablette du
--     comptoir, sous une seule adresse ; ses serveurs n'ont pas d'email et
--     n'en veulent pas. Leur fiche entre au planning et sur la badgeuse, et
--     leur lien personnel leur montre leurs horaires sans rien installer.
--
-- `||` plutôt qu'une affectation : les autres capacités déjà réglées pour ce
-- client — s'il en a — ne doivent pas disparaître au passage.

update public.etablissement_settings
set order_tabs = '{a_encaisser,historique}'::public.order_tab[],
    features = features || '{"equipe_sans_comptes": true}'::jsonb,
    updated_at = now()
where etablissement_id = (
  select id from public.etablissements where slug = 'boho'
);
