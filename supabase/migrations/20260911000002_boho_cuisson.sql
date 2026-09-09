UPDATE public.items
SET    options = jsonb_build_array(
         jsonb_build_object(
           'id',          gen_random_uuid(),
           'name',        'Cuisson',
           'obligatoire', true,
           'choices',     jsonb_build_array(
             jsonb_build_object('id', gen_random_uuid(), 'name', 'À point',  'supplement', 0),
             jsonb_build_object('id', gen_random_uuid(), 'name', 'Saignant', 'supplement', 0),
             jsonb_build_object('id', gen_random_uuid(), 'name', 'Bleu',     'supplement', 0),
             jsonb_build_object('id', gen_random_uuid(), 'name', 'Bien cuit','supplement', 0)
           )
         )
       )
WHERE  etablissement_id = (SELECT id FROM public.etablissements WHERE slug = 'boho')
AND    name IN (
         'L''Entrecôte « La Fameuse »',
         'Pièce de bœuf grillée',
         'Magret de canard grillé',
         'Escalope de saumon frais à la plancha',
         'Burger original Boho'
       );
