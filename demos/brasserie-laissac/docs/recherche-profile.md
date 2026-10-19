# Brasserie Laissac — fiche de recherche (profil client)

Recherche du 15 octobre 2026. Niveaux de confiance : **confirmé** (lu sur la page citée), **probable** (déduit de plusieurs indices concordants, raisonnement donné), **non trouvé**.
Les pages sont citées telles que réellement récupérées. Les dossiers de travail (JSON, HTML, captures) sont dans `profile/_work/`.

---

## 0. L'essentiel en une minute

- **Le fonds a changé de mains à l'été 2026, pas au printemps.** La SAS LAISSAC (créée le 20/04/2026 sans activité, coquille) a acheté le fonds de commerce « brasserie licence IV » à BARMAX par **acte du 22/07/2026, prix 400 000 €**. L'acte a été enregistré au SPFE Montpellier 2 le 29/07/2026, publié dans *La Gazette Économique* le 03/08 puis au BODACC le 04/08/2026. La mise en activité est datée du 12/08/2026 au BODACC et du 28/08/2026 à l'INSEE : les dates ne concordent pas.
- **Trois exploitants avant le groupe** :
  1. Charles Wells (France), exploitant de pubs, de 2010 à 2017.
  2. BARMAX, présidée par M. Delplanque, de 2017 à 2023, avec une cuisine asiatique (thaï, cambodgienne, vietnamienne).
  3. BARMAX après la cession des titres à M. Iche (fin 2023 à juillet 2026) : tapas et cuisine « 100 % maison ».
- **Presque tout ce qui est en ligne date d'avant la reprise** : le logo bleu canard, les photos de pub anglais, les avis, les horaires de Schlouk, Privateaser et Wanderlog. Le nouvel exploitant a seulement :
  - mis à jour la fiche Google (site, horaires 7j/7 9h–1h) ;
  - changé la photo de profil Instagram (nouveau logo noir et or) ;
  - publié chaque jour le menu du jour en reels depuis le 2 octobre 2026 ;
  - ajouté une page sur le site du groupe, illustrée par des photos de banque d'images.
- **Deux identités visuelles circulent en même temps** : le logo bleu canard de 2024 (site du groupe, Facebook) et le nouvel écusson noir et or de 2026 (Instagram, chevalets de table, visuel happy hour).

---

## 1. Adresse

| Fait | Valeur | Confiance | Source |
|---|---|---|---|
| Adresse normalisée | **9 Place Alexandre Laissac, 34000 Montpellier**, id BAN `34172_0170_00009`, score 0,97 | confirmé | https://api-adresse.data.gouv.fr/search/?q=9+place+Alexandre+Laissac+Montpellier |
| Coordonnées | BAN : 43.606193, 3.876298. INSEE : 43.606155, 3.876270. Google : 43.6062445, 3.8762565. Plus code **JV4G+FG** | confirmé | BAN ; recherche-entreprises ; Google Maps |
| Quartier | Le groupe écrit « quartier des Gares », « au pied des Halles Laissac ». **Contradiction** : le titre de la page Laissac du groupe dit « Montpellier Les Arceaux ». L'IRIS INSEE est 341722001 « Pont de Sète » | probable (IRIS via pyris, base non officielle) | https://www.cafedesarts34.fr/la-brasserie-laissac-w1 ; https://pyris.datajazz.io/api/coords?geojson=false&lat=43.606193&lon=3.876298 |
| Contexte | Place des Halles Laissac (marché couvert), en lisière sud-ouest de l'Écusson | confirmé (texte du groupe) | site du groupe |
| **Tram le plus proche** | **Observatoire (lignes 3 et 4)**, à ~40 m à vol d'oiseau et **~85 m à pied (~1 min)** | confirmé (OSM + Wikipédia) | OSM via Overpass ; https://fr.wikipedia.org/wiki/Ligne_3_du_tramway_de_Montpellier (wikitext : Gambetta - Saint-Denis → Observatoire → Gare Saint-Roch - République) ; https://fr.wikipedia.org/wiki/Ligne_4_du_tramway_de_Montpellier |
| Autres arrêts | « Gambetta - Saint-Denis » (L3, correspondance L5) ~231 m à pied ; Gare Saint-Roch - République ~330 m | confirmé | OSRM piéton (routing.openstreetmap.de) |
| **Contradiction** | Le site du groupe dit « ligne 3, arrêt **Saint-Denis**, à environ 300 m ». C'est inexact : l'arrêt Observatoire (L3 + L4) est quasiment devant la porte, et l'arrêt Saint-Denis s'appelle désormais « Gambetta - Saint-Denis » selon Wikipédia et OSM | confirmé | — |
| Distances à pied vers les autres adresses du groupe | Café des Arts (3 rue Saint-Guilhem) **546 m, ~7 min** ; Le Novelty (10 rue Saint-Guilhem) **549 m, ~7 min** ; Le Victoria (3 pl. Castellane) **517 m, ~7 min** | confirmé (géocodage BAN + OSRM piéton) | https://routing.openstreetmap.de/routed-foot/ |

---

## 2. Entité juridique

### 2.1 Exploitant actuel : SAS LAISSAC

| Fait | Valeur | Confiance | Source |
|---|---|---|---|
| Raison sociale / enseigne | **LAISSAC**, enseigne et nom commercial **BRASSERIE LAISSAC** | confirmé | https://recherche-entreprises.api.gouv.fr/search?q=104083670 |
| Forme / capital | SAS, capital **10 000 €** | confirmé | BODACC A20260080681 |
| SIREN / SIRET / TVA | **104 083 670** / **104 083 670 00018** / FR68104083670 | confirmé | recherche-entreprises |
| NAF | 56.10A Restauration traditionnelle (NAF 2025 : 56.11G). Activité déclarée : « brasserie, restauration, bar licence IV » | confirmé | recherche-entreprises ; BODACC B202601561378 |
| Dirigeante | **Nathalie Rabaglia, présidente** | confirmé | recherche-entreprises ; BODACC |
| Dates | Créée le 20/04/2026, immatriculée le 22/04/2026 « sans activité » (BODACC du 26/04). Début d'activité : **28/08/2026** (INSEE) contre **12/08/2026** (BODACC B, « mise en activité », publié le 18/08) | confirmé, contradiction de dates | https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records?where=registre%20like%20%22104083670%22 |
| Employeur | caractère employeur « O » ; tranche d'effectif non renseignée | confirmé | recherche-entreprises |
| **Achat du fonds** | Avis « Ventes et cessions », BODACC A n° 1358 du **04/08/2026** : fonds « brasserie licence IV » acquis **au prix de 400 000 €** auprès de **BARMAX (832 258 370)**. Acte du **22/07/2026**, enregistré au SPFE Montpellier 2 le 29/07/2026. Annonce légale dans *La Gazette Économique* du 03/08/2026. Oppositions reçues chez Me Yann Viguier | confirmé | même requête BODACC (id A202601461358) |

**Lien avec le groupe Café des Arts (C.K.L / Belkhir)**

- Mme Rabaglia est **cogérante de la holding ANNA** (SIREN 103 567 509, créée le 26/03/2026, siège à Saint-Clément-de-Rivière) avec **Med Oul Hocine Belkhir**. Confiance : confirmé (https://recherche-entreprises.api.gouv.fr/search?q=rabaglia).
- M. Belkhir est gérant de **JSK HOLDING** (894 402 320, siège 3 place Castellane). JSK HOLDING préside **TGT** (Le Victoria, 878 398 387) et **NEWVELTY** (Le Novelty, 898 370 200).
- **Med Belkhir** préside **C.K.L** (523 954 857, Café des Arts, 3 rue Saint-Guilhem). C.K.L est l'éditeur du site du groupe (mentions légales).
- Les données ouvertes ne montrent **pas** qui détient le capital de LAISSAC SAS : elles listent les dirigeants, pas les associés. Le rattachement au groupe est donc **probable** (page du groupe + cogérance d'ANNA), mais le schéma capitalistique n'est **pas vérifié**.
- Mme Rabaglia préside aussi deux autres sociétés créées en 2026 : CAFE LA RESERVE (Saint-Clément-de-Rivière) et NATHALIE (Nîmes). Ce sont d'éventuels prospects.
- Curiosité : le registre montre une deuxième société à l'enseigne LE NOVELTY au 10 rue Saint-Guilhem, BKB (988 381 083, créée en 06/2025, autres dirigeants). Le Novelty a peut-être été repris lui aussi. Non vérifié.

### 2.2 Ancien exploitant : BARMAX

| Fait | Valeur | Confiance | Source |
|---|---|---|---|
| Raison sociale | **BARMAX**, anciennement « SASU BARMAX » ; enseigne déclarée **BRASSERIE LAISSAC** | confirmé | https://recherche-entreprises.api.gouv.fr/search?q=832258370 |
| SIREN / SIRET | **832 258 370** / 832 258 370 00010 | confirmé | idem |
| NAF / effectif | 56.10A ; tranche 02 (3 à 5 salariés) en 2024 | confirmé | idem |
| Création / début | Créée le 26/09/2017 ; début d'activité le 09/11/2017 | confirmé | idem |
| Historique | **2017** : SASU, capital 20 000 €, président **Maxime Delplanque**. Achat du fonds à **CHARLES WELLS (FRANCE)** (652 023 680) pour **190 000 €**, acte du 09/11/2017 (BODACC du 29/12/2017). **Nov. 2023** : nouveau président **Fabrice Iche** (BODACC B du 29/11/2023). **Janv. 2024** : passage en **SARL**, Fabrice Iche gérant (BODACC B du 17/01/2024) | confirmé | https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records?where=registre%20like%20%22832258370%22 |
| Comptes | Déposés pour chaque exercice 2018 à 2025, toujours avec déclaration de **confidentialité** : aucun chiffre public. Les comptes 2025 ont été publiés au BODACC le 06/10/2026 | confirmé | idem |
| Statut | Toujours **active** au registre au 15/10/2026, malgré la vente du fonds | confirmé | recherche-entreprises |
| Interprétation | Les titres de BARMAX ont changé de mains fin 2023. Un avis Google d'il y a ~3 ans dit : « ils changent de propriétaire fin du mois ». Le fonds lui-même n'a été vendu qu'en juillet 2026 | probable | avis Google (Olivier Latortue) + BODACC |

### 2.3 Avant 2017

- **2010** : Charles Wells (France) (NAF 56.30Z, débits de boissons, 24 établissements) achète le fonds « bar brasserie » à la société **CARRENO** (495 267 528) pour **330 000 €**. Acte avec entrée en jouissance le 31/01/2010, BODACC du 25/05/2010. Confiance : confirmé (même API, registre 652023680, avis A20100100345).
- **Probable** : le décor de **pub anglais** (comptoir en chêne sculpté, enseignes « Fine Beers », « Stout », « Ales », pompes à bière) vient de l'époque Charles Wells (2010–2017), un brasseur exploitant de pubs.

**pappers.fr** : 403 sur les deux fiches, non consultable.

---

## 3. Téléphone et contact

| Fait | Valeur | Confiance | Source |
|---|---|---|---|
| Téléphone | **04 67 57 72 10** (+33 4 67 57 72 10). Le même numéro sert avant et après la reprise : Schlouk, Wanderlog, Facebook, Google, site du groupe, chevalets de table 2026 | confirmé | site du groupe ; Google Maps ; Facebook ; https://www.schlouk-map.com/fr/places/brasserie-laissac |
| Recherche web du numéro | Aucune page indexée trouvée (« 04 67 57 72 10 ») | non trouvé | WebSearch |
| E-mail | **laissac.mtp@gmail.com** (onglet « À propos » de la page Facebook). Époque inconnue, peut-être celle de l'ancien exploitant | confirmé (affiché) ; époque non trouvée | https://www.facebook.com/profile.php?id=61557652253148&sk=about |
| E-mail du groupe | contact@cafedesarts34.fr (Café des Arts) ; ckl.cafedesarts@gmail.com (Novelty, Victoria). **Aucun e-mail affiché pour Laissac** sur le site du groupe | confirmé | site du groupe |
| Réservation | « par téléphone uniquement » selon Schlouk (pré-reprise) | confirmé (ancien) | Schlouk |

---

## 4. Horaires

| Source | Horaires | Avant ou après la reprise | Confiance |
|---|---|---|---|
| **Google Maps** (vue complète, 15/10/2026) | **7j/7, 09:00–01:00** | **après** : la fiche pointe désormais vers cafedesarts34.fr | confirmé — https://www.google.com/maps/place/?q=place_id:ChIJVVXRGqavthIRizXRq7pQJtw&hl=fr |
| **Instagram** (bio) | « 7j/7 • 9h-01h00 » | **après** (bio actuelle, nouveau logo) | confirmé — https://www.instagram.com/brasserie.laissac/ |
| Facebook (intro) | « 7j/7 • 9h-22h » | probablement **avant** (bio de 2024 jamais mise à jour) | confirmé (affiché) |
| Restaurant Guru | « Jeudi 09:00-01:00 », « Ouvert maintenant 09:00 - 01:00 » (copie de Google, page mise à jour le 11/10/2026) | après (recopié) | confirmé — https://fr.restaurantguru.com/Brasserie-Laissac-Montpellier |
| Schlouk Map | lun.–ven. 09:00–22:00 ; sam.–dim. 09:00–23:00 ; happy hour tous les jours 17:00–20:00 | **avant** | confirmé — https://www.schlouk-map.com/fr/places/brasserie-laissac |
| Wanderlog (instantané Google ancien) | lun.–ven. 9h–22h ; sam. 9h–23h ; **dim. fermé** | **avant** (lien site = Facebook, 254 avis) | confirmé — https://wanderlog.com/place/details/2627985/brasserie-laissac |
| Privateaser | mar.–sam. 08:00–23:30 ; lundi et dimanche absents | **avant** (fiche « cuisine asiatique ») | confirmé — https://www.privateaser.com/lieu/48581-brasserie-laissac |
| Site du groupe | **aucun horaire pour Laissac**. Les autres adresses sont annoncées « 7j/7 10h–1h » ou « 8h30–1h » | après | confirmé |
| Happy hour actuel | **17h–23h** (visuel Facebook au nouveau logo) | après | confirmé (visuel) |

**Contradictions** :
- Amplitude actuelle (Google et Instagram : 9h–1h tous les jours) contre la bio Facebook (9h–22h) et les annuaires anciens.
- Happy hour : 17–20h (Schlouk, ancien) contre 17–23h (visuel 2026).
- Les heures de cuisine (service le soir ou non) ne sont publiées nulle part : **non trouvé**.

---

## 5. Google Maps

| Fait | Valeur | Confiance |
|---|---|---|
| Nom de la fiche | **BRASSERIE LAISSAC** (en capitales), catégorie « Brasserie » | confirmé |
| URL | https://www.google.com/maps/place/?q=place_id:ChIJVVXRGqavthIRizXRq7pQJtw — place_id `ChIJVVXRGqavthIRizXRq7pQJtw`, CID 0xdc2650baabd1358b. Le lien « Accès » du site du groupe (https://maps.app.goo.gl/Gwqy9cyDjDpLCjt89) mène à cette même fiche | confirmé |
| Note / avis | **4,4 / 5 — 279 avis** (15/10/2026). Restaurant Guru affichait 277 le 11/10, Wanderlog 254 (ancien instantané) | confirmé |
| Répartition (Wanderlog, 254 avis, avant reprise) | 5★ 181 · 4★ 41 · 3★ 10 · 2★ 0 · 1★ 22 | confirmé (données Wanderlog) |
| Photos | 157 photos. La photo principale est une **photo client d'avril 2018** (« tea caroline », iPhone SE, EXIF du 03/04/2018) montrant l'intérieur pub | confirmé |
| Site / téléphone | **cafedesarts34.fr** / 04 67 57 72 10 | confirmé |
| Accessibilité | entrée, places et toilettes accessibles en fauteuil roulant | confirmé |
| Thèmes d'avis | cuisine asiatique (6), tapas (6), happy hour (4), brioche (4), thaïlandais (3), fléchettes (3), pho (2), pub irlandais (2), bobun (2) : tous des thèmes d'avant la reprise | confirmé |
| **Fiche de l'ancien exploitant ?** | C'est **la même fiche historique** (photos depuis 2018, avis cumulés surtout sous BARMAX). Elle a été **reprise et modifiée** : site du groupe, horaires 9h–1h. Qui gère le compte propriétaire ? Non vérifiable | probable |

Note : sans compte connecté, Google n'affiche que 5 avis (tri impossible). Aucun avis postérieur à la reprise n'a pu être lu, même si le compteur est passé de 277 à 279 entre le 11 et le 15/10.

---

## 6. Sites web

### 6.1 Site du groupe (Jalis), page Laissac — **après** la reprise

- URL : https://www.cafedesarts34.fr/la-brasserie-laissac-w1, plus deux sous-pages :
  - https://www.cafedesarts34.fr/details-brasserie+vintage+dans+le+quartier+des+gares+a+montpellier+pres+des+halles+laissac-28
  - https://www.cafedesarts34.fr/details-restaurant+groupe+anniversaire+montpellier+laissac-29
- Accueil : https://www.cafedesarts34.fr/ (bloc « Pour une pause calme »).
- **Éditeur** : C K L (SIRET 523 954 857 00026), responsable Med Belkhir, hébergeur et webmaster JALIS (Marseille). Source : https://www.cafedesarts34.fr/mentions-legales.
- **Ce que dit le site** (confirmé, ce sont des affirmations du groupe, non vérifiées) :
  - Positionnement : « brasserie de quartier », « l'adresse du groupe qui s'écarte de l'agitation de l'Écusson », « pour une pause calme ».
  - Décor : **ambiance vintage**, « mobilier rétro, décoration nostalgique », « salle spacieuse ».
  - Terrasse : « terrasse ensoleillée » sur la place, animée par le marché des Halles.
  - Cuisine : « généreuse et gourmande, dans la continuité des autres établissements » ; **plats du jour à partir de 9,90 €** (texte d'accueil) ; **girafes de bière et de cocktails de 3 L à 5 L**.
  - Événements : anniversaires, pots de départ, afterworks, EVG/EVJF, repas d'affaires.
  - Accès : « ligne 3, arrêt Saint-Denis, ~300 m », ce qui est **inexact** (voir §1).
- **Absent** : horaires, capacité chiffrée, petit-déjeuner (annoncé pour le Victoria et le Novelty, pas pour Laissac), carte, e-mail, réseaux sociaux. Les trois autres adresses ont leurs liens Instagram et TikTok en pied de page, **Laissac n'en a aucun**.
- Formulaire de contact unique pour les quatre lieux (choix « La Brasserie Laissac »).
- SEO : la page porte le titre « Brasserie de quartier et terrasse à Montpellier **Les Arceaux** » (incohérent) et une série de pages « vers Pérols / Lattes / Juvignac… » typiques de Jalis.

### 6.2 Ancien site propre

- **Non trouvé.** Les annuaires anciens donnaient comme « site » la page Facebook.
- aleou.fr (https://www.aleou.fr/xg/contact/supplier/47875) : bloqué (429, contrôle anti-robot). Selon les extraits de recherche, sa description générique situe la brasserie « près de la Comédie », ce qui est faux.

---

## 7. Réseaux sociaux

| Réseau | Compte | Appartient bien à cette brasserie ? | Chiffres | Avant ou après | Source |
|---|---|---|---|---|---|
| **Instagram** | **@brasserie.laissac** — « BRASSERIE LAISSAC » | **confirmé** : chevalets de table portant l'adresse et le téléphone, menus du jour « à la Brasserie Laissac », lien depuis Facebook | **125 abonnés, 13–14 abonnements, 51 publications**. Bio : « Restaurant/ Brasserie Montpellier · Restaurant, bar, cocktail, happy hour · Terrasse, ombragée · 1 salle, climatisé · 7j/7 • 9h-01h00 ». Stories à la une : *Plat du jour*, *Terrasse ☀️🌸*, *Assiettes 🍛🥘*, *Events 🥳🍻* | **Compte hérité** : les couvertures de stories bleu canard datent de ~2024. Il est **repris par la nouvelle équipe** : photo de profil au nouveau logo, **reels quotidiens de menus du jour du 2 au 15/10/2026** (5 à 16 j'aime chacun) | https://www.instagram.com/brasserie.laissac/ ; ex. https://www.instagram.com/brasserie.laissac/reel/DegruSitaZV/ |
| **Facebook** | Page « **Brasserie Laissac** » (Page · Restaurant), id 61557652253148 | **confirmé** (adresse, téléphone, renvoi vers Instagram brasserie.laissac) | **21 followers**, « Pas encore évalué (3 avis) », prix €€. Intro : « Brasserie Montpelliéraine avec terrasse ensoleillée ☀️ 100% frais, 100% maison 🌱👨🏼‍🍳 Cuisine généreuse et gourmande 🍛 📍 7j/7 • 9h-22h » | **Page créée sous BARMAX**, vraisemblablement vers mars 2024 (déduit des identifiants Meta de la page et de la photo de profil, aucune date affichée). Profil et bannière au logo bleu canard (2024). **Toujours utilisée** : publication « Menus du jour » il y a ~8 h, reels partagés depuis Instagram | https://www.facebook.com/profile.php?id=61557652253148 |
| **TikTok** | **Non trouvé.** Les pseudos testés @brasserie.laissac, @brasserielaissac, @brasserie_laissac, @laissac.mtp et @brasserielaissacmontpellier renvoient « compte inexistant » (statusCode 10221). Le même test sur @lecafedesartsmontpellier et @levictoriamontpellier renvoie bien les comptes (1 031 et 837 abonnés) | — | — | — | tiktok.com/@… |

---

## 8. Plateformes de livraison et de réservation, annuaires

| Plateforme | Résultat | Date du contenu | Confiance | URL |
|---|---|---|---|---|
| Uber Eats | **non trouvé** (recherche web négative ; pages magasin non devinables) | — | non trouvé | — |
| Deliveroo | **non trouvé** (recherche négative ; URL devinées → 403 anti-robot) | — | non trouvé | — |
| Just Eat | **non trouvé** (idem) | — | non trouvé | — |
| TheFork | **non trouvé** (recherche négative ; site 403 anti-robot) | — | non trouvé | — |
| **Privateaser** | Fiche « Brasserie Laissac », **non réservable** sur Privateaser. Elle décrit un grand bar à bières au mobilier vintage, avec **« plats asiatiques traditionnels »**, Ginger Beer et Alaryk ; capacité **100 personnes** ; mar.–sam. 8h–23h30 ; prix sur devis ; 13 photos ; note Google 4,4 | **avant** (cuisine asiatique, donc vraisemblablement 2017–2023) | confirmé | https://www.privateaser.com/lieu/48581-brasserie-laissac |
| **Tripadvisor** | Fiche existante, location id **13972876** : 4,5/5 (4 avis) selon Wanderlog, 4,2/5 (5 avis) selon Restaurant Guru. La page elle-même renvoie 403 | inconnue (fiche créée vers 2018 d'après l'id) | probable | https://www.tripadvisor.fr/Restaurant_Review-g187153-d13972876 (non lisible) |
| **Restaurant Guru** | « BRASSERIE LAISSAC », n° 365 sur 857 pubs et bars de Montpellier ; « Française, Méditerranéen » ; 20–30 € par personne ; 158 photos ; Google 4,4 (277), Trip 4,2 (5) ; mots-clés : pub irlandais, bo bun, plats asiatiques, happy hour, brioche perdue. Les images de menus portent le nom « BRASSERIE-LAISSAC-asiatique ». Page mise à jour le 11/10/2026 | contenu surtout **avant** (avis vieux de 3 à 5 ans) ; horaires recopiés **après** | confirmé | https://fr.restaurantguru.com/Brasserie-Laissac-Montpellier |
| Petit Futé | **non trouvé** (la recherche du site renvoie 404 ; recherche web négative) | — | non trouvé | — |
| **Schlouk Map** | Fiche « Bar Brasserie Pub », **revendiquée** (« Claimed »), sans avis. Wifi, terrasse, TV (sport, foot), clim, PMR, fléchettes, jeux de société, concerts, à emporter. Réservation par téléphone. Happy hour 17–20h. Pression 50 cl : Alaryk Blonde 6 € (4,50 € en HH), Alaryk Blanche 7 €, Ambrée 7 €, DIPA 8,50 €, ZooBrew Bower Bird IPA 7 €, Chouffe 8,50 €. 3 photos envoyées le **01/03/2022** (déduit de l'identifiant de fichier) | **avant** | confirmé | https://www.schlouk-map.com/fr/places/brasserie-laissac |
| lacarte.menu | **non trouvé** (recherche négative ; URL devinée → 403) | — | non trouvé | — |
| Wanderlog | Fiche : 4,4 (254), Trip 4,5 (4), horaires anciens, site = Facebook ; résumé IA des avis (voir §10) | **avant** | confirmé | https://wanderlog.com/place/details/2627985/brasserie-laissac |

---

## 9. Identité visuelle

### 9.1 Logo « bleu canard » (2024, époque BARMAX/Iche), encore utilisé par le site du groupe

- **`logo4.jpg` est bien Laissac** (confirmé) :
  - sur l'accueil du groupe, il illustre la vignette « Halles Laissac / La Brasserie Laissac » ;
  - c'est le logo d'en-tête de la page Laissac et de ses deux sous-pages ;
  - l'image elle-même porte le texte « BRASSERIE LAISSAC ».
  - Les autres logos : logo.jpg = Café des Arts, logo2 = Le Novelty, logo3 = Le Victoria.
- URL : https://www.cafedesarts34.fr/templates/captain/img/interface/logo4.jpg (200 × 200).
- Description :
  - carré **bleu canard / bleu pétrole** (échantillon ≈ **#004E58**) ;
  - texte sur deux lignes, « BRASSERIE » / « LAISSAC », en **capitales sans-serif condensées très grasses**, type affiche (police non identifiée, famille Bebas/Oswald) ;
  - lettres **blanc cassé** (#FCFCFA) avec **ombre portée décalée vieux rose / saumon** (≈ #C99795 sur le JPEG), d'où un effet rétro en relief.
- **C'est le même dessin que la photo de profil Facebook**, vraisemblablement mise en ligne vers mars 2024. Le logo date donc d'**avant la reprise**, et le groupe l'a repris tel quel (probable).
- Bannière Facebook (même époque) : fond bleu canard, « BRASSERIE / MONTPELLIÉRAINE » en petites capitales condensées, « Cuisine **100%** frais, **100%** fait maison. » avec les « 100% » en saumon.
- Couvertures des stories Instagram (même époque) : pictos blancs au trait (soleil, chef, flûtes) sur bleu canard.

### 9.2 Nouveau logo « écusson noir et or » (2026, nouvel exploitant)

- Où on le voit : photo de profil Instagram, chevalets de table dans les reels d'octobre 2026, visuel happy hour.
- Description :
  - **badge rond noir** ;
  - illustration **façon gravure au trait or/bronze** (≈ #AE9677–#C09A63, mesuré sur 150 px, approximatif) d'un bâtiment de brasserie : grande baie en arc, cheminée d'usine, cyprès, collines ;
  - **cônes de houblon** en haut et en bas, **épis de blé** ;
  - « BRASSERIE » en petites capitales espacées, entre deux filets ;
  - « **LAISSAC** » en grandes **capitales à empattements classiques** (romain de type Trajan), blanc crème.
  - Le style ressemble à un écusson générique de brasserie artisanale. Ce n'est pas une représentation des Halles.
- Visuel happy hour : fond noir, « HAPPY » en capitales serif blanches, « Hour » en **script doré**, bandeau doré « 17H - 23H », pastille **framboise** pour le prix des cocktails.
- Chevalets de table (reels d'octobre 2026) : noirs, logo or, adresse, « Tél 04 67 57 72 10 » et **QR code**. La destination du QR code est inconnue.

### 9.3 Façade, enseigne, terrasse

- Immeuble d'angle **haussmannien en pierre crème** avec balcons en fer forgé. **Devanture peinte bordeaux / sang-de-bœuf**, impostes vitrées en arc. Sur la photo Schlouk de 2022, **aucune lettre visible** sur le bandeau. Confiance : confirmé pour 2022.
- **Enseigne drapeau** sur potence en fer forgé : panneau **bordeaux** avec **lettrage or à empattements**, « Brasserie Laissac » en majuscules et minuscules, style pub anglais. Photo Facebook vraisemblablement de fin 2024 (avant reprise).
- Mobilier de terrasse, selon l'époque :
  - 2022 : chaises **résine tressée noire** et tables noires, parasol vert foncé ;
  - fin 2024 : tables à plateau bois, **chaises pliantes métal jaunes** et chaises métal **bleu canard**.
- **État actuel de la façade et de la terrasse après la reprise : non trouvé** (aucune photo d'extérieur datée de 2026).
- Contradiction mineure : « terrasse ensoleillée » (groupe, Facebook) contre « terrasse ombragée » (bio Instagram actuelle).

### 9.4 Intérieur

- **Avant la reprise** (photos de 2018 à 2022 : Google, Schlouk, Privateaser, en-tête du site du groupe) : **pub anglais** classique.
  - Long **comptoir courbe en chêne verni sculpté** et **tabourets en simili framboise/magenta**.
  - **Murs rouges**, boiseries sombres, plafond à caissons, frise dorée, suspensions.
  - Enseignes peintes « SPIRITS », « Fine BEERS », « STOUT », « ALES » ; pompes à bière (Alaryk).
  - Boxes et banquettes framboise, plusieurs écrans TV, sol carrelage rouge et noir et parquet.
  - Véranda avant vitrée sur la place.
  - Cela colle avec les avis : « ressemble à un vieux pub ».
- **Après la reprise** (reels du 2 au 15/10/2026, confirmé) : **chaises en cuir ou simili cognac matelassé en losanges**, tables effet bois clair, serviettes rouges, **portes et boiseries en pin clair**, chevalets noir et or.
  - **Probable** : le mobilier a été au moins en partie renouvelé.
  - Une rénovation complète est **à confirmer** : le comptoir pub n'apparaît pas dans les reels.

### 9.5 Galerie du site du groupe pour Laissac (carrousel de 7 images sur l'accueil)

Ces images sont toutes dans le bloc « La Brasserie Laissac », mais **aucune ne montre Laissac**. Elles ont des airs de **banque d'images** génériques.

| Image | Ce qu'elle montre |
|---|---|
| `84a7b0b5` | barmaid en chemise blanche, shaker, bar de bouteilles rétroéclairé |
| `9116e2d4` | mur en lambris, portrait encadré, lampe, chevalet « 304 » |
| `d97421ba` | mur noir à la craie « Cooking with love provides food for the soul » et « **Burger Sochi** » (sans aucun rapport avec Laissac), table haute bois |
| `e4fb5dc1` | barman au panama et gilet, verre à mélange |
| `30c19808` | mains qui trinquent avec des bouteilles de bière |
| `b23682ef` | table ronde nappée blanche, chaises en fer forgé, devant une façade sombre |
| `77bfd3d0` | pintes qui trinquent dans un bar sombre |

- URL type : https://media.jalis.pro/images/<id>_large.webp. La variante `_large` (1 920 px) est la plus grande : `_original`, `_xl` et l'URL sans suffixe renvoient 403.
- Dans les sous-pages Laissac, `2ecd82ab`, `eb82fc1c` et `664d5761` sont des doublons de photos de banque déjà utilisées pour le Victoria (barman au panama, cocktail versé, tablée aux chandeliers).
- **Seule vraie photo de Laissac sur le site du groupe : l'en-tête `c9f39225`** (comptoir pub, tabourets framboise). C'est **la même prise de vue** que la photo Schlouk de mars 2022, recadrée : une image **d'avant la reprise**.

---

## 10. Avis

### 10.1 Avant la reprise (presque tout le corpus)

**Google — 5 avis visibles sans connexion, tous antérieurs au 22/07/2026 :**

| Auteur | Note | Date | Contenu |
|---|---|---|---|
| Olivier Latortue | 5★ | « il y a 3 ans » (~2023) | « plats asiatiques au goût authentique », thaï et cambodgiens, plus des plats de brasserie, desserts maison, service rapide. Signale : « ils changent de propriétaire fin du mois » |
| BUYING DIRECT | 5★ | visite **juin 2024** | déjeuner en famille : filet mignon, steak de thon, tapas, nuggets « fait maison jusqu'aux nuggets », bières locales, serveurs sympathiques, terrasse agréable |
| Audrey Puy | 5★ | visite **avril 2025** | « tout fait maison », service très appréciable |
| ameyling Tran | 5★ | visite **janvier 2026** | « ressemble à un vieux pub mais très mignon », carte courte, cuisine généreuse, maison, excellente |
| magalie perrin | 3★ | visite **mai 2026** | se plaint d'une **tranche de citron facturée 20 cts**. Le texte commence par « On adore les halles ! » : l'avis visait peut-être un bar des Halles, à vérifier |

**Restaurant Guru :**
- olivier bourneton, Google « il y a 4 mois » (~juin 2026) : « très bon rapport qualité-prix en plein centre ». Nourriture 5, service 5, ambiance 3.
- « Maxime », il y a ~3 ans : bœuf lok lac, bo bun, travers de porc laqué.
- « maxime », il y a ~5 ans : « ban soong ».
- Ces deux derniers avis élogieux portent le même prénom que l'ancien président, M. Delplanque. Ce sont **peut-être** des avis maison : simple hypothèse, non vérifiable.

**Résumé IA de Wanderlog (sans dates) :**
- Éloges : soupe thaï aux crevettes, tarte Tatin, portions généreuses, accueil chaleureux des patrons.
- Plaintes : politique du midi, un client ne prenant qu'une boisson s'est entendu dire qu'on lui demanderait de partir si la salle se remplissait ; accès aux toilettes refusé ; manque d'empathie envers une cliente enceinte.

**Thèmes Google** : cuisine asiatique, tapas, happy hour, brioche, thaï, fléchettes, pho, pub irlandais, bobun.

**Ce qui revient** :
- Points forts : cuisine **maison et généreuse**, **bon rapport qualité-prix**, **personnel sympathique**, **terrasse**, bières locales.
- Points faibles : **décor vieillot** (« vieux pub », « petit air ancien »), politique « consommation obligatoire » le midi, petites facturations jugées mesquines.

### 10.2 Après la reprise

- **Aucun avis lisible.** Google n'affiche que 5 avis sans connexion. Le compteur est passé de 277 (Restaurant Guru, 11/10) à 279 (Google, 15/10), donc quelques avis récents existent probablement.
- Facebook : « Pas encore évalué (3 avis) ».
- Tripadvisor : non lisible (403).
- Engagement Instagram : 5 à 16 j'aime par reel.

---

## 11. Offre actuelle (après la reprise, d'après Instagram et Facebook, octobre 2026)

**Menus du jour publiés chaque matin vers 12h** (heure de Paris), en général deux plats et un dessert. Exemples :
- demi-magret sauce orange, mousseline ;
- gambas grillées, chimichurri ;
- couscous royal ;
- sauté de veau forestière ;
- seiche à la persillade ;
- côtes d'agneau ;
- desserts : Saint-Honoré revisité, crème brûlée au rhum, crêpe Suzette, tiramisu aux fruits rouges.

Hashtags utilisés : #cuisinefrançaise #platdujour. Confiance : confirmé (légendes des reels du 2 au 15/10/2026).

**Prix des plats du jour : non affichés dans les légendes.** Le groupe annonce « à partir de 9,90 € » sans le prouver.

**Happy hour 17h–23h** (visuel au nouveau logo) :

| Boisson | Prix |
|---|---|
| Verre punch / sangria maison | 3 € |
| Verre chardonnay | 3 € |
| Verre vin moelleux | 3,50 € |
| Apérol Spritz | 6 € |
| Pinte blonde | 4 € |
| Pinte Monaco | 4,20 € |
| Cocktails (mojito, sex on the beach, planteur…) | 5,50 € |

Confiance : confirmé (visuel Facebook).

**Ancienne carte (avant la reprise)**, pour mémoire. Ardoise Facebook vraisemblablement de l'automne 2024 :
- tapas à 6 € (pan con tomate, croquetas, burrata…) ;
- plats de 14 à 18 € (cœur d'entrecôte au poivre 18 €, seiches en persillade 16 €, burgers 15 €…) ;
- desserts à 6 €.

---

## 12. Images enregistrées (dossier `profile/`)

| Fichier | Contenu | Époque | Source |
|---|---|---|---|
| `logo-teal_brasserie-laissac_site-groupe_200px.jpg` | logo bleu canard (logo4.jpg) | 2024, réutilisé en 2026 | cafedesarts34.fr |
| `logo-teal_brasserie-laissac_facebook-profil_500px_2024.jpg` | même logo, plus grand (500 px) | ~2024 | Facebook |
| `banniere-teal_facebook_brasserie-montpellieraine_2024.png` | bannière « Brasserie montpelliéraine · Cuisine 100% frais, 100% fait maison » (1 809 × 794) | ~2024 | Facebook |
| `logo-noir-or_brasserie-laissac_instagram-profil_150px_2026.jpg` | **nouveau** logo écusson noir et or (seule taille accessible : 150 px) | 2026 | Instagram |
| `pictos-teal_instagram-highlight_{terrasse,assiettes,events}.jpg` | couvertures de stories bleu canard | ~2024 | Instagram |
| `interieur_bar-pub-bois_tabourets-framboise_site-groupe-entete_1920px.webp` | en-tête de la page Laissac du groupe : comptoir pub, tabourets framboise (même photo que Schlouk 2022) | ≤ 2022 | cafedesarts34.fr |
| `interieur_bar-pub_google-photo-principale_avril-2018_4032px.jpg` | photo principale de la fiche Google (photo client, 4 032 px) | avril 2018 | Google Maps |
| `facade_angle-haussmannien_devanture-bordeaux_terrasse_schlouk_2022.jpg` | façade d'angle, devanture bordeaux, terrasse aux chaises noires | mars 2022 | Schlouk |
| `interieur_comptoir-tabourets-framboise_schlouk_2022.png`, `interieur_comptoir-pompes_spirits-stout-ales_schlouk_2022.png` | comptoir pub | mars 2022 | Schlouk |
| `interieur_*_privateaser_01…13.jpg`, `biere-alaryk-…_08.jpg`, `pompes-alaryk-…_12.jpg` | 13 photos de la salle pub, des pompes, des boxes et de la véranda (1 280 à 1 500 px) | avant reprise (≤ 2023 probable) | Privateaser |
| `facade_enseigne-drapeau-bordeaux-or_terrasse-chaises-jaunes_facebook_315px.jpg` | enseigne drapeau bordeaux et or, terrasse animée (seule taille accessible : 315 px) | ~fin 2024 | Facebook |
| `terrasse_cafe-creme_vue-place_facebook_315px.jpg` | table de terrasse, chaises bleu canard, vue sur la place | ~fin 2024 | Facebook |
| `visuel_happy-hour-17h-23h_prix_facebook_315px.jpg` | visuel happy hour au nouveau logo | 2026 | Facebook |
| `ardoise-carte_tapas-plats-desserts_facebook_315px.jpg` | ardoise de l'ancienne carte | ~2024 | Facebook |
| `salle-2026_boiseries-claires_chaises-cuir-cognac_reel_540px.jpg` | nouvelle salle, boiseries claires, chaises cognac (reel du couscous, 09/10/2026) | oct. 2026 | Facebook / Instagram |
| `salle-2026_chevalet-noir-logo-or_qr-code_reel_540px.jpg`, `plat-2026_chevalet-logo_reel_540px.jpg`, `salle-2026_cliente-chevalet-logo_reel_540px.jpg` | chevalets de table noir et or avec QR code, plats du jour | oct. 2026 | Facebook / Instagram |
| `galerie-site-groupe-stock/stock_*.webp` (7 fichiers) | carrousel « Laissac » du site du groupe, **sans lien avec Laissac** (banque d'images ; voir §9.5) | — | media.jalis.pro |

**Tailles** :
- Facebook et Instagram ne servent que des miniatures (315 à 640 px) sans connexion. Les originaux des reels et le logo 2026 en haute définition sont à demander au client.
- Les photos Privateaser viennent du chemin `/original/` (1 280 à 1 500 px max).
- Les photos Schlouk viennent du chemin `uploads/` d'origine, non mis en cache.

---

## 13. Contradictions relevées (récapitulatif)

1. **Date de la reprise** :
   - acte et « commencement d'activité » du fonds : 22/07/2026 ;
   - mise en activité de la SAS : 12/08/2026 au BODACC, 28/08/2026 à l'INSEE ;
   - le brief parlait du printemps 2026, mais ce n'est que la date de création de la coquille.
2. **Horaires** : 9h–1h tous les jours (Google, Instagram) contre 9h–22h (Facebook) et les horaires anciens des annuaires (dimanche fermé, ou mardi–samedi seulement).
3. **Happy hour** : 17–20h (Schlouk, ancien) contre 17–23h (visuel 2026).
4. **Tram** : « Saint-Denis à 300 m » (groupe) contre Observatoire L3/L4 à ~85 m.
5. **Quartier** : « Gares » contre « Les Arceaux » (titre de la page du groupe).
6. **Deux logos en circulation** : bleu canard (site du groupe, Facebook) et noir et or (Instagram, salle, visuels).
7. **Terrasse** : « ensoleillée » contre « ombragée ».
8. **Cuisine** : les annuaires et les avis décrivent une cuisine asiatique, un pub et des fléchettes. L'offre actuelle est une cuisine française et méditerranéenne avec plats du jour.
9. **Photos** : le site du groupe illustre Laissac par des photos de banque d'images plus une photo de 2022 de l'ancien décor.

---

## 14. Pour l'onboarding

**Opportunités**

- **Menu du jour quotidien** : la nouvelle équipe publie chaque jour deux plats et un dessert en reel. Une carte QR Ominin avec un bloc « plat du jour » éditable dans /gestion remplacerait ce travail manuel et resterait cohérente avec Instagram.
- **QR code déjà présent sur les chevalets** : savoir où il mène. Si c'est vers une carte PDF ou rien, c'est l'argument direct pour Connect.
- **Un groupe de quatre adresses à ~7 min à pied** (Café des Arts, Novelty, Victoria, Laissac), plus d'autres sociétés de la présidente créées en 2026 : l'occasion d'une offre multi-établissements.
- **Remise à plat de l'image en ligne**, qui date de l'ancien exploitant :
  - logo et bannière Facebook en bleu canard, bio 9h–22h ;
  - photos Google de 2018 ;
  - fiches Schlouk, Privateaser et Wanderlog qui parlent de cuisine asiatique, de fléchettes et d'Alaryk ;
  - galerie du site du groupe faite de photos de banque ;
  - information tram erronée ;
  - aucun lien social pour Laissac sur le site du groupe.
- **Avis** : 279 avis Google hérités, dont aucun ne décrit l'offre actuelle. Un parcours de collecte d'avis après repas permettrait de relancer la note sous la nouvelle offre.
- **Aucune présence en livraison ni en click & collect** trouvée : piste Collect pour les plats du jour à emporter (clientèle des Halles, bureaux, gare).
- **Groupes et événements** (girafes 3 à 5 L, anniversaires, EVG/EVJF, ~100 places selon une ancienne fiche) : prise de demande ou de devis en ligne.
- **Happy hour 17h–23h** : à mettre en avant sur la carte, avec les horaires.

**Questions pour le gérant**

1. Qui décide et qui signe : Mme Rabaglia (présidente de LAISSAC SAS) ou M. Belkhir (groupe) ? LAISSAC SAS est-elle détenue par ANNA ou JSK HOLDING ?
2. Date exacte de réouverture sous la nouvelle direction (acte du 22/07, activité au 12/08 ou au 28/08) ? Y a-t-il eu une fermeture pour travaux ?
3. La salle a-t-elle été rénovée ? Le comptoir pub et les tabourets framboise sont-ils toujours là ? Faut-il refaire des photos ?
4. Quel logo est officiel : bleu canard (site du groupe, Facebook) ou écusson noir et or (Instagram, chevalets) ? Peut-on avoir les fichiers sources en haute définition ?
5. Horaires réels de la salle et de la cuisine (service le soir ? petit-déjeuner dès 9h ?), et happy hour confirmé à 17h–23h ?
6. Carte complète actuelle (en dehors des plats du jour) et prix. Le plat du jour est-il à 9,90 € ?
7. Capacité en salle et en terrasse ? Terrasse ensoleillée ou ombragée ?
8. Où mène le QR code des chevalets ? Quelle caisse et quel TPE utilisez-vous ?
9. Qui gère la fiche Google, Facebook et Instagram ? Avez-vous les accès propriétaire de la fiche Google et de la page Facebook héritées ?
10. L'adresse laissac.mtp@gmail.com est-elle toujours active ?
11. Les trois autres établissements du groupe sont-ils intéressés par la même solution ?
