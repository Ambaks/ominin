-- Les réglages de MyBox, posés nommément (même principe que le BOHO côté
-- restaurants) : la boutique existe déjà en production avec ses commandes,
-- on ne la ressème pas, on la règle.
--
--  1. Photo d'accueil et collections mises en avant, avec leurs photos.
--  2. La personnalisation sur toutes les box (pas sur le duo de diffuseurs
--     seul) : une lettre ou un chiffre — l'initiale, l'âge fêté.
--  3. Une seconde photo pour les trois box photographiées deux fois.
--  4. Une question de FAQ pour expliquer la personnalisation.
--
-- Rejouable : chaque insertion vérifie son absence avant d'écrire.

update public.shops
set hero_image_url = '/shop/mybox/accueil.webp'
where slug = 'mybox';

update public.shop_categories c
set image_url = v.image_url, is_highlighted = true
from (
  values
    ('essentiel', '/shop/mybox/l-essentiel-30-ml.webp'),
    ('evasion', '/shop/mybox/l-evasion.webp'),
    ('petits-plaisirs', '/shop/mybox/chic-car-scent.webp')
) as v (slug, image_url), public.shops s
where s.slug = 'mybox' and c.shop_id = s.id and c.slug = v.slug;

update public.shop_products p
set personalization_label = 'Lettre ou chiffre sur la box'
from public.shops s
where s.slug = 'mybox' and p.shop_id = s.id and p.slug <> 'chic-car-scent';

insert into public.shop_product_images (product_id, url, alt, sort_order)
select p.id, '/shop/mybox/' || p.slug || '-2.webp', 'Box ' || p.name, 1
from public.shop_products p
join public.shops s on s.id = p.shop_id
where s.slug = 'mybox'
  and p.slug in ('duo-nomade-30-ml', 'duo-essentiel-10-ml', 'duo-nomade-10-ml')
  and not exists (
    select 1 from public.shop_product_images i
    where i.product_id = p.id and i.url = '/shop/mybox/' || p.slug || '-2.webp'
  );

insert into public.shop_faq_items (shop_id, question, answer, sort_order)
select s.id,
  'Puis-je personnaliser ma box ?',
  'Oui. Sur chaque box, tu peux indiquer une lettre ou un chiffre au moment de l''ajouter au panier : ton initiale, celle de la personne à qui tu l''offres, un âge, un jour à retenir. Il est réalisé à la main sur la box.',
  (select coalesce(max(sort_order), 0) + 1 from public.shop_faq_items f where f.shop_id = s.id)
from public.shops s
where s.slug = 'mybox'
  and not exists (
    select 1 from public.shop_faq_items f
    where f.shop_id = s.id and f.question = 'Puis-je personnaliser ma box ?'
  );
