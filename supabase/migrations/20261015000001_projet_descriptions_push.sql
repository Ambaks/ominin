-- Section Projet : une description pour chaque étape (ce qu'il faut faire,
-- concrètement, et quand c'est fini), et les notifications push de l'admin.

-- ---------------------------------------------------------------------------
-- Abonnements push de l'admin. Séparés de push_subscriptions, rattachés à un
-- établissement : un admin n'en a pas. owner dit qui reçoit les tâches de qui
-- (choisi sur l'appareil). Écriture et lecture par les routes /api/admin/push
-- (clé service, après is_admin) : aucune policy.
create table public.admin_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  owner text not null check (owner in ('marwan', 'ambaka')),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  device_label text,
  created_at timestamptz not null default now()
);
alter table public.admin_push_subscriptions enable row level security;

-- ---------------------------------------------------------------------------
-- Descriptions de la pipeline type : une seule source, lue par
-- projet_add_client pour chaque client ajouté et par le rattrapage ci-dessous.
create table public.projet_step_templates (
  shop boolean not null,
  position int not null,
  phase text not null,
  title text not null,
  detail text not null,
  primary key (shop, position)
);
alter table public.projet_step_templates enable row level security;
create policy "admin" on public.projet_step_templates for select to authenticated
  using ((select public.is_admin()));

insert into public.projet_step_templates (shop, position, phase, title, detail) values
  (false, 1, 'Prospection', 'Recherche : carte, caisse, TPE, imprimantes, décideur',
   'Relever la carte complète (photos ou site), la caisse et le TPE utilisés, les imprimantes en cuisine et au bar, et qui décide (gérant, associé, siège). Fini quand ces infos sont dans les notes du client.'),
  (false, 2, 'Prospection', 'Démo prête sur sa carte (et pitch pour un réseau)',
   'Monter sa carte dans la démo (menu.ominin.com/demo) avec ses couleurs, pour qu''il se voie dedans. Pour un réseau (franchise), préparer aussi le pitch sur le kit de pitch. Fini quand le lien de démo marche sur téléphone.'),
  (false, 3, 'Prospection', 'Premier contact (message, appel ou passage)',
   'Prendre contact avec le décideur : passage au restaurant, appel, message ou par une connaissance. Fini quand il a répondu et qu''un rendez-vous est proposé.'),
  (false, 4, 'Prospection', 'Rendez-vous et démo présentée',
   'Montrer la démo sur sa carte, sur téléphone : le client scanne, commande, paie, le ticket sort en cuisine. Noter ses questions et objections. Fini quand la démo est faite.'),
  (false, 5, 'Prospection', 'Accord : offre, prix et date de mise en service',
   'Se mettre d''accord sur l''offre (Connect, Click & collect), le prix (0 €/mois + commission) et une date de mise en service. Fini quand la date est fixée.'),
  (false, 6, 'Intégration', 'Inscription et CGV acceptées dans l''application',
   'Le gérant crée son compte sur menu.ominin.com/inscription et accepte les CGV dans l''application : c''est sa signature, sans elle on ne peut pas facturer. Fini quand l''acceptation apparaît en base.'),
  (false, 7, 'Intégration', 'Encaissement relié (Square ou Stripe) et paiement test réel',
   'Relier sa caisse Square, sinon ouvrir Stripe Connect (pièce d''identité, IBAN, SIRET). Puis payer une vraie petite commande de bout en bout. Fini quand l''argent du test arrive sur son compte.'),
  (false, 8, 'Intégration', 'Carte transcrite et validée par le gérant (prix, options, allergènes)',
   'Transcrire toute la carte (skill new-restaurant) : prix, options, suppléments, allergènes, photos. La faire relire et valider par le gérant. Fini quand il a dit OK.'),
  (false, 9, 'Intégration', 'Thème aux couleurs et logo de l''établissement',
   'Poser son logo et ses couleurs sur le menu QR. Fini quand le gérant valide le rendu sur téléphone.'),
  (false, 10, 'Intégration', 'Tables saisies et Cachets commandés',
   'Saisir les tables dans l''espace de gestion et commander les Cachets (QR à son logo, 1,50 € par table + livraison). Pas de Cachets en fast food : un seul QR au comptoir. Fini quand les QR sont posés.'),
  (false, 11, 'Intégration', 'Imprimantes et boîtier Omilink installés, tickets testés',
   'Brancher le boîtier Omilink si la caisse n''imprime pas en cuisine, relier les imprimantes cuisine et bar, et faire sortir un ticket test de chaque côté. Fini quand chaque article sort sur la bonne imprimante.'),
  (false, 12, 'Intégration', 'Équipe formée (salle, cuisine, comptoir)',
   'Montrer à l''équipe les vues serveur, cuisine et comptoir : accepter, servir, encaisser au comptoir, rembourser. Fini quand chacun a fait une commande de bout en bout.'),
  (false, 13, 'Suivi', 'Premier service accompagné',
   'Être présent (ou joignable) pendant le premier vrai service, régler ce qui coince sur le moment. Fini quand le service est passé sans blocage.'),
  (false, 14, 'Suivi', 'Bilan à 2 semaines : chiffres, retours, tarif définitif',
   'Deux semaines après : regarder ses chiffres (Clients → Synthèse), recueillir ses retours, confirmer le tarif. Fini quand le bilan est noté dans les notes du client.'),
  (false, 15, 'Suivi', 'Avis client et accord pour le citer',
   'Lui demander un avis en une ou deux phrases et son accord pour le citer sur le site et les réseaux. Fini quand l''avis et l''accord sont écrits.'),
  (true, 1, 'Prospection', 'Recherche : carte, caisse, TPE, imprimantes, décideur',
   'Relever ce qu''elle vend, où (Instagram, Snapchat, TikTok), combien de commandes par semaine et comment elle encaisse aujourd''hui. Fini quand c''est dans les notes.'),
  (true, 2, 'Prospection', 'Boutique de démo prête avec ses produits',
   'Monter une boutique de démo avec 5 à 10 de ses vrais produits et ses couleurs. Fini quand le lien marche sur téléphone.'),
  (true, 3, 'Prospection', 'Premier contact (message, appel ou passage)',
   'Lui écrire (message privé) ou l''appeler. Fini quand elle a répondu et qu''un rendez-vous est proposé.'),
  (true, 4, 'Prospection', 'Rendez-vous et démo présentée',
   'Montrer la boutique de démo : une cliente commande et paie sans compte, la commande arrive prête à préparer. Fini quand la démo est faite.'),
  (true, 5, 'Prospection', 'Accord : offre, prix et date de mise en service',
   'Se mettre d''accord sur la mise en place, l''abonnement et la date de lancement. Fini quand la date est fixée.'),
  (true, 6, 'Intégration', 'Inscription et CGV acceptées dans l''application',
   'Elle crée son compte et accepte les CGV dans l''application : c''est sa signature. Fini quand l''acceptation apparaît en base.'),
  (true, 7, 'Intégration', 'Stripe Connect activé et commande test réelle',
   'Ouvrir son compte Stripe Connect avec elle (pièce d''identité, IBAN, SIRET de sa micro-entreprise), puis passer une vraie commande test. Fini quand l''argent du test arrive sur son compte.'),
  (true, 8, 'Intégration', 'Catalogue en ligne : photos, prix, stock, livraison',
   'Mettre en ligne tous ses produits (photos, prix, stock) et paramétrer la livraison (Colissimo, Mondial Relay, remise en main propre). Fini quand elle a validé le catalogue.'),
  (true, 9, 'Intégration', 'Mentions légales et CGV de la boutique',
   'Remplir avec elle ses mentions légales (nom, SIRET, adresse) et les CGV de sa boutique. Fini quand les pages légales sont complètes.'),
  (true, 10, 'Intégration', 'Lien en bio et nom de domaine',
   'Mettre le lien de la boutique en bio de ses réseaux, et brancher son nom de domaine si elle en veut un. Fini quand le lien est en ligne.'),
  (true, 11, 'Intégration', 'Lancement annoncé sur ses réseaux',
   'L''aider à annoncer la boutique (story, post). Fini quand l''annonce est publiée.'),
  (true, 12, 'Intégration', 'Prise en main de l''espace de gestion',
   'Lui montrer comment préparer, expédier, rembourser et modifier un produit. Fini quand elle a traité une commande seule.'),
  (true, 13, 'Suivi', 'Premières ventes suivies',
   'Suivre ses premières commandes et régler ce qui coince. Fini quand cinq commandes sont passées sans aide.'),
  (true, 14, 'Suivi', 'Bilan à 2 semaines : chiffres, retours, tarif définitif',
   'Deux semaines après : ses ventes (Clients → Synthèse Shop), ses retours, le tarif. Fini quand le bilan est noté.'),
  (true, 15, 'Suivi', 'Avis client et accord pour le citer',
   'Lui demander un avis et son accord pour le citer. Fini quand l''avis et l''accord sont écrits.');

create or replace function public.projet_add_client(
  p_name text,
  p_product public.ominin_product,
  p_etablissement uuid default null,
  p_shop uuid default null
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into projet_clients (name, product, etablissement_id, shop_id)
  values (p_name, p_product, p_etablissement, p_shop)
  returning id into v_id;

  insert into projet_steps (client_id, phase, position, title, detail)
  select v_id, t.phase, t.position, t.title, t.detail
  from projet_step_templates t
  where t.shop = (p_product = 'shop');

  return v_id;
end;
$$;

-- Rattrapage : les étapes des clients déjà suivis reçoivent la description
-- de leur modèle (même position, même titre).
update public.projet_steps s
set detail = t.detail
from public.projet_clients c, public.projet_step_templates t
where s.client_id = c.id
  and t.shop = (c.product = 'shop')
  and t.position = s.position
  and t.title = s.title
  and s.detail = '';

-- Descriptions des étapes de chantier existantes, par titre.
update public.projet_steps s
set detail = d.detail
from (values
  ('Choisir et chiffrer les 3 imprimantes thermiques (cuisine, bar, comptoir) : modèle, prix, fournisseur',
   'Choisir un modèle d''imprimante ticket 80 mm (Ethernet ou USB) compatible avec le boîtier, pour la cuisine, le bar et le comptoir. Noter pour chacune le prix, le fournisseur et le délai. Fini quand le tableau des trois est rempli.'),
  ('Chiffrer le Raspberry Pi, la carte SD, l''alimentation, le boîtier et les câbles',
   'Lister et chiffrer tout ce qui compose le boîtier Omilink : Raspberry Pi, carte SD, alimentation, boîtier, câbles réseau et USB, rouleaux de papier. Fini quand le coût total d''un kit est connu.'),
  ('Trouver 2 fournisseurs par composant (prix, délai, garantie)',
   'Pour chaque composant, deux fournisseurs (prix, délai de livraison, garantie), pour ne jamais être bloqué par une rupture. Fini quand le tableau est complet.'),
  ('Image Omilink installable en une commande (script et clé Tailscale réutilisable)',
   'Préparer une image de carte SD (ou un script) qui installe Omilink en une commande, avec une clé Tailscale réutilisable pour l''accès à distance. Fini quand un boîtier neuf est prêt en moins de 15 minutes.'),
  ('Procédure écrite de montage et de test du boîtier',
   'Écrire, étape par étape, le montage du boîtier et le test d''impression avant de partir chez le client. Fini quand quelqu''un d''autre arrive à monter un boîtier en la suivant.'),
  ('Emballage et notice de branchement du kit',
   'Choisir l''emballage du kit et écrire une notice d''une page pour le brancher (où brancher quoi, quoi faire si rien ne sort). Fini quand un kit est emballé avec sa notice.'),
  ('Réviser le prix du kit (89 € aujourd''hui) d''après le coût réel',
   'À partir du coût total d''un kit (composants, livraison, temps de montage), décider le prix de vente et le mettre à jour sur le site. Fini quand le nouveau prix est en ligne.'),
  ('Commander un kit de démo complet',
   'Commander un kit identique à celui du BOHO pour les démos et le premier client fast food. Fini quand le kit est reçu et testé.'),
  ('Passer l''app Meta en Live (confidentialité, CGV, suppression des données)',
   'Sur developers.facebook.com, app « Ominin » : renseigner la politique de confidentialité (ominin.com/confidentialite), les CGV (ominin.com/cgv), l''URL de suppression des données (ominin.com/confidentialite#article-6), l''icône et la catégorie, puis passer le mode en Live. Fini quand l''app affiche « Live ».'),
  ('Reconnecter les 8 comptes Facebook et Instagram dans l''admin',
   'Admin → Réseaux → Comptes → « Actualiser la connexion Meta » : cocher les 4 Pages et les 4 comptes Instagram, garder toutes les permissions. Fini quand les 8 comptes apparaissent reliés.'),
  ('Publier un post de test, puis réactiver l''agent social',
   'Publier un vrai post de test sur un compte (on peut le supprimer après) pour vérifier que Meta accepte, puis réactiver les workflows agent-social-post et agent-social-research sur GitHub. Fini quand le post de test est en ligne.'),
  ('Poser OPERATOR_ALERT_EMAIL sur Render (alerte si une publication échoue)',
   'Sur Render, service backend → Environment : ajouter OPERATOR_ALERT_EMAIL avec l''adresse qui doit recevoir les alertes. Sans ça, une publication en échec ne prévient personne. Fini quand la variable est posée.'),
  ('Ajouter Marwan super administrateur de la page LinkedIn',
   'Sur la page LinkedIn Ominin : Outils d''administration → Gérer les administrateurs → ajouter Marwan en Super administrateur. Fini quand Marwan voit le mode admin de la page.'),
  ('Créer les pages vitrines LinkedIn Menu, Collect et Shop',
   'Depuis la page Ominin, créer trois pages vitrines (Menu, Collect, Shop) avec logo, bannière et description. Fini quand les trois sont en ligne.'),
  ('Publier les 6 Reels validés (branche feat/reels)',
   'Les 6 Reels validés sont dans demos/reels/out sur la branche feat/reels. Les publier à la main avec la légende du README du dossier, sur la bonne marque. Fini quand les 6 sont en ligne.'),
  ('Session Reels du mercredi soir',
   'Chaque mercredi soir, session avec Claude pour faire les nouveaux Reels de la semaine. Fini quand les Reels de la semaine sont validés.'),
  ('Nouvelle ligne éditoriale : visages et réel, 4 marques',
   'Écrire, pour chaque marque, à qui on parle, sur quel ton et quels formats (vrais services, vous deux face caméra, démo filmée), puis mettre à jour les consignes de l''agent. Fini quand la ligne est validée et chargée dans l''agent.'),
  ('Tester de bout en bout le paiement Stripe dans la page (Apple Pay, Google Pay, carte)',
   'Sur un restaurant Stripe, passer une vraie commande avec Apple Pay, Google Pay et une carte, vérifier qu''elle arrive réglée en cuisine, puis la rembourser. Fini quand les trois moyens marchent.'),
  ('Activer Apple Pay et Google Pay sur les domaines des comptes connectés',
   'Enregistrer menu.ominin.com et collect.ominin.com sur les comptes Stripe connectés existants, pour qu''Apple Pay et Google Pay s''affichent. Fini quand les boutons apparaissent au paiement.'),
  ('Vérifier que le mode fast food encaisse avec le moyen de paiement de Big Smash',
   'Savoir si Big Smash est sur Square ou autre chose, et tester le mode fast food avec ce moyen de paiement (ou le repli « payer au comptoir »). Fini quand une commande test passe.'),
  ('Décider qui paie HubRise (35 € HT par restaurant et par mois)',
   'HubRise coûte 35 € HT par restaurant et par mois (27 € au-delà de 30). Décider si on le refacture au restaurant ou si on l''offre au-delà d''un volume. Fini quand la décision est écrite.'),
  ('Construire le connecteur HubRise (commandes vers les caisses compatibles)',
   'Compte développeur HubRise, bouton « Connecter HubRise » dans gestion, envoi de chaque commande payée vers la caisse, suivi des statuts, import de la carte, puis validation par HubRise. Fini quand une commande arrive dans une caisse de test.'),
  ('Relecture avocat des CGV et de l''annexe de sous-traitance',
   'Faire relire par un avocat les CGV, la révision des tarifs sans préavis et l''annexe de sous-traitance (RGPD). Fini quand les corrections sont intégrées.'),
  ('Mentions légales complètes (SIREN, RCS, adresse)',
   'Compléter les mentions légales du site : SIREN à 9 chiffres, RCS, adresse, directeur de publication, hébergeur. Fini quand la page est complète en ligne.'),
  ('RC Pro couvrant le matériel installé et l''encaissement',
   'Souscrire une RC Pro qui couvre le matériel installé chez les clients et l''activité d''encaissement. Fini quand l''attestation est reçue.'),
  ('Créer les prix Stripe live',
   'Créer en mode live les produits et prix Stripe des offres (Connect, Click & collect, kit), et les relier au site. Fini quand un paiement live passe.'),
  ('Décider le taux de commission Shop',
   'Décider la commission prélevée sur les ventes des boutiques et la poser dans la configuration. Fini quand le taux est en ligne.'),
  ('Boutique de démo et fiche tarifaire Shop',
   'Une boutique de démo complète et une fiche tarifaire d''une page, pour les rendez-vous. Fini quand les deux sont prêtes à montrer.'),
  ('Mesurer le trafic et la conversion des boutiques',
   'Mesurer les visites et la conversion des boutiques sans cookie tiers, pour pouvoir le montrer aux vendeuses. Fini quand les chiffres apparaissent dans l''admin.')
) as d (title, detail)
where s.chantier_id is not null and s.title = d.title and s.detail = '';
