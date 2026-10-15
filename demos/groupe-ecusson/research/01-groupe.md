# Groupe de l'Écusson (JSK Holding / « Groupe CKL ») — recherche groupe

Relevé du 2026-10-15. Pages ouvertes directement (curl, navigateur intégré) sauf mention contraire.
Niveaux : **confirmé** (source primaire ouverte), **probable** (source secondaire ou déduction solide),
**non vérifié** (indice faible, ou rien trouvé). Ne reprend pas ce qui est déjà dans
`demos/{le-victoria,le-novelty,cafe-des-arts}/docs/recherche-profile.md`, sauf pour le comparer.

Sources principales :
- API recherche-entreprises : `https://recherche-entreprises.api.gouv.fr/search?q=<siren>`
- Comptes (ratios INPI/BCE, plusieurs années) : `https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/ratios_inpi_bce/records?where=siren="<siren>"`
- BODACC : `https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records?where=registre like "<siren>"`
- Site du groupe : https://www.cafedesarts34.fr/ (+ `/sitemap.xml`, pages `-w1` et `details-…`)
- Google Maps (vue limitée, sans connexion) des quatre fiches, ouvertes le 2026-10-15

---

## 1. Chiffre d'affaires et effectifs

| Société (enseigne) | SIREN | CA 2024 | Résultat net 2024 | Années précédentes (CA) | Effectif INSEE (année) | Confiance |
|---|---|---|---|---|---|---|
| TGT (Le Victoria) | 878 398 387 | 1 687 153 € | 246 628 € | 2020 : 711 463 € · 2021 : 1 429 904 € · 2022 : non publié dans le jeu · 2023 : 2 222 549 € | 10–19 (2024) | confirmé |
| NEWVELTY (Le Novelty) | 898 370 200 | 829 260 € | 215 € | 2021 : 63 161 € (1 mois, activité au 01/12/2021) · 2023 : 1 174 128 € | 6–9 (2024) | confirmé |
| BKB (Le Novelty, exploitant probable) | 988 381 083 | aucun compte publié (créée 2025) | — | — | non renseigné | confirmé (absence) |
| C.K.L (Café des Arts) | 523 954 857 | 2 601 633 € | 570 684 € | 2019 : 2 018 427 € · 2020 : 1 322 236 € · 2016-2018 et 2021 : comptes confidentiels | 20–49 (2024) | confirmé |
| LAISSAC (Brasserie Laissac) | 104 083 670 | aucun compte (créée 2026) | — | — | non renseigné | confirmé (absence) |
| JSK HOLDING | 894 402 320 | 649 200 € | 64 327 € | 2021 : 178 000 € · 2022 : 501 400 € · 2023 : 528 200 € | 6–9 (2024) | confirmé |
| BARMAX (ancien exploitant de Laissac) | 832 258 370 | comptes confidentiels (toutes années) | — | — | 3–5 (2024) | confirmé |

Sources : API recherche-entreprises (champ `finances`, `tranche_effectif_salarie`) et ratios INPI/BCE
(`confidentiality: Public` pour toutes les lignes chiffrées ci-dessus) ; BODACC pour les dépôts.

Notes :
- **CA cumulé 2024 des trois sociétés d'exploitation : 5 118 046 €** (TGT + NEWVELTY + C.K.L), résultat net cumulé
  817 527 €. Calcul à partir des chiffres confirmés ; le CA de JSK Holding (NAF 70.10Z, holding) est exclu car
  probablement facturé aux filiales (management fees) — **probable**, non vérifié.
- **Effectif cumulé 2024 : 36 à 77 salariés** dans les trois sociétés d'exploitation (42 à 86 avec JSK Holding),
  d'après les tranches INSEE. Confirmé (tranches), le chiffre exact n'est pas public.
- Comptes 2025 déposés pour TGT, NEWVELTY, C.K.L et JSK Holding (BODACC du 02/10/2026), pas encore dans les jeux de
  données ouverts. BARMAX : comptes 2025 déposés avec déclaration de confidentialité (BODACC 06/10/2026). Confirmé.
- TGT : CA en baisse de 24 % entre 2023 et 2024 (2,22 → 1,69 M€) mais résultat net doublé. NEWVELTY : −29 %
  (1,17 → 0,83 M€). Calcul, confirmé.
- C.K.L clôturait au 30/06 jusqu'en 2021 ; l'exercice publié suivant clôt au 31/12/2024. Sa durée n'est pas
  vérifiée : le 2,6 M€ ne couvre peut-être pas 12 mois. Non vérifié.
- NEWVELTY : fonds racheté 1 130 000 € (acte du 16/02/2024) ; BKB y a commencé son activité le 01/08/2025
  (BODACC 16/08/2025). Le CA 2025 de NEWVELTY devrait donc chuter (location-gérance) — déduction, **probable**.

## 2. Capacité par établissement

| Établissement | Capacité trouvée | Source | Confiance |
|---|---|---|---|
| Le Victoria | « capacité de 150 personnes » et terrasse sur la place | cafedesarts34.fr/le-victoria-w1 ; Privateaser « Réservation jusqu'à 150 pers. », « Privatisation : Non » (https://www.privateaser.com/lieu/56860-le-victoria) | confirmé (chiffre annoncé, sans détail salle/terrasse) |
| Café des Arts | Terrasse ombragée sous les pins « jusqu'à 150 personnes » ; trois espaces : grande salle avec bar, salle à l'étage dédiée à la restauration, salle privatisable ; groupes jusqu'à 100 | cafedesarts34.fr/le-cafe-des-arts-w1 ; Privateaser « terrasse ombragée de 150 places », « Réservation jusqu'à 100 pers. » (https://www.privateaser.com/lieu/50727-cafe-des-arts-montpellier) | confirmé (terrasse) ; places en salle : non trouvé |
| Le Novelty | Réservation ou privatisation « jusqu'à 50 personnes » ; grand écran, micros, sono ; terrasse éphémère | cafedesarts34.fr/le-novelty-w1 et page `details-bar+happy+hour…-24` ; Privateaser (en-tête « jusqu'à 100 pers. », texte « jusqu'à 50 personnes ») (https://www.privateaser.com/lieu/41384-le-novelty) | probable (50 ; contradiction 50/100 sur Privateaser) |
| Brasserie Laissac | « Capable d'accueillir 100 personnes », salle spacieuse, terrasse | Privateaser, fiche rédigée sous l'ancien exploitant (cuisine asiatique, mardi–samedi) (https://www.privateaser.com/lieu/48581-brasserie-laissac) ; le site du groupe dit « salle spacieuse » et « terrasse ensoleillée » sans chiffre | probable (chiffre antérieur à la reprise) |

- Nombre de tables : **aucune source** pour aucun des quatre. Non trouvé.
- Ordre de grandeur : ≈ 450 personnes annoncées pour les quatre (150 + 150 en terrasse + 50 + 100), salle du Café
  des Arts non comptée. Calcul sur chiffres hétérogènes (capacité d'accueil, terrasse, groupes) — probable.
- Proximité (coordonnées des fiches Google Maps) : Café des Arts, Novelty et Victoria tiennent dans un rayon
  d'environ 30 m autour de la place Castellane ; la Brasserie Laissac est à ≈ 410 m au sud. Calcul, probable.

### Brasserie Laissac : reprise par le groupe
- Fonds de commerce « brasserie licence IV » acheté **400 000 €** par la SAS LAISSAC à **BARMAX** (SASU,
  SIREN 832 258 370, créée 2017), acte du 22/07/2026, publié au BODACC le 04/08/2026. Confirmé —
  https://www.bodacc.fr/pages/annonces-commerciales-detail/?q.id=id:A202601461358
- Mise en activité de LAISSAC : **12/08/2026** (BODACC 18/08/2026). Confirmé —
  https://www.bodacc.fr/pages/annonces-commerciales-detail/?q.id=id:B202601561378
- BARMAX l'exploitait depuis fin 2017 (fonds acheté 190 000 €, BODACC 29/12/2017). Confirmé (BODACC).
- Lien avec le groupe : la présidente de LAISSAC, Nathalie Rabaglia, est co-gérante avec Med Oul Hocine Belkhir
  de la SARL **ANNA** (SIREN 103 567 509, holding NAF 70.10Z, créée le 26/03/2026). Confirmé (API
  recherche-entreprises). Même avocat pour les oppositions (Me Yann Viguier) que pour l'achat du Victoria en
  2019. Confirmé (BODACC), lien déduit.
- Fiche Google « BRASSERIE LAISSAC » : site web désormais **cafedesarts34.fr/la-brasserie-laissac-w1**, horaires
  7j/7 9h–1h. Confirmé (Google Maps, 2026-10-15). Avant la reprise : 9h–22h en semaine, 23h le week-end
  (https://www.schlouk-map.com/fr/places/brasserie-laissac), dimanche fermé (Wanderlog,
  https://wanderlog.com/place/details/2627985/brasserie-laissac). Le groupe a donc allongé l'amplitude — probable.
- Presse (Midi Libre, Métropolitain, Actu Montpellier) sur la reprise : **rien trouvé**. Instagram non consulté
  (bloqué). Facebook de l'ancienne exploitation : facebook.com/profile.php?id=61557652253148 (lien Wanderlog), non ouvert.

## 3. Outils actuels

### Caisse (POS)
- **Non identifiée pour aucun des quatre.** Aucune offre d'emploi publique trouvée (voir § 6), aucune mention
  dans les avis lus, rien de visible sur les photos archivées (`le-victoria/docs/salle-privateaser.jpg`,
  `cafe-des-arts/docs/neon-salle.jpg`, `chevalet-qr.jpg`). Non vérifié.
- Moyens de paiement du Café des Arts (attributs Google repris par Sluurpy) : cartes de crédit et de débit,
  paiement mobile NFC, titres-restaurant Pluxee. Probable — https://www.sluurpy.fr/montpellier/restaurant/1991675/le-cafe-des-arts

### QR code et carte en ligne
- **Chevalet du Café des Arts** (`cafe-des-arts/docs/chevalet-qr.jpg`) : chevalet rouge au logo, icônes
  Instagram et Facebook au-dessus du QR, puis « 3 rue Saint-Guilhem – 34000 Montpellier / Tél. 04 67 60 81 87 /
  horaires d'ouverture ». Le QR fait ≈ 40 px dans la photo : **illisible**, décodage OpenCV échoué. Le placement
  sous les icônes sociales laisse penser à un lien vers les réseaux ou le site plutôt qu'à une commande — non vérifié.
- **lacarte.menu** (où est hébergé le PDF de carte du Victoria) : c'est « Carte », un **annuaire grand public de
  restaurants** (menus « y compris en PDF », avis, horaires, « Revendiquer le restaurant », « Site Web Gratuit
  Pour Restaurant »), pas un outil de QR commande ni de paiement. Confirmé — page d'accueil archivée du
  06/10/2026 : http://web.archive.org/web/20261006074026/https://lacarte.menu/ (le site en direct renvoie 403
  Cloudflare). Sluurpy l'agrège comme source d'avis (« Lacarte.menu 3,0/5, 237 avis » pour le Café des Arts).
  Que le QR des tables du Victoria pointe vers ce PDF : non vérifié.
- Café des Arts : le site du groupe n'a pas de carte (« La carte » mène au contact) — déjà relevé, confirmé.
  Novelty : carte sur son site une page (lenovelty-montpellier.fr). Victoria : seule carte publiée = Deliveroo.
  Aucune commande ni paiement à table en ligne trouvés pour les quatre. Confirmé (absence sur les pages ouvertes).

### Réservation
| Établissement | Outil | Source | Confiance |
|---|---|---|---|
| Le Victoria | Lien « Trouver une table » de Google → **formulaire Jotform gratuit** (nom, e-mail, téléphone, nombre de personnes, date, demande) | Google Maps ; https://form.jotform.com/242043539570354 (ouvert, non soumis) | confirmé |
| Le Novelty | « Trouver une table » → section #reservation de son site : **formulaire Formspree**, « confirmation par email sous 24h » | Google Maps ; https://lenovelty-montpellier.fr/ (form action formspree.io) | confirmé |
| Café des Arts | Aucun lien de réservation sur Google ; bouton « Réserver » du site du groupe → formulaire de contact (traité par « C K L », site Jalis) | Google Maps ; https://www.cafedesarts34.fr/contact | confirmé |
| Brasserie Laissac | « réservations par téléphone uniquement » | https://www.schlouk-map.com/fr/places/brasserie-laissac (fiche peut-être antérieure à la reprise) | probable |

- Privateaser : les quatre ont une fiche, **aucune n'est réservable** (« Cet établissement n'est pas réservable sur
  Privateaser »). Confirmé (quatre pages ouvertes).
- TheFork, Zenchef : aucune fiche trouvée pour les quatre. Non vérifié (recherche seulement).
- Aucun outil de réservation partagé entre les établissements : trois mécanismes différents (Jotform, Formspree,
  formulaire Jalis) plus le téléphone. Confirmé.

### Livraison et vente à emporter
- Le Victoria : Deliveroo (déjà relevé, carte désactivée le jour du relevé précédent). Confirmé (recherche-profile.md).
- Novelty, Café des Arts : ni Deliveroo ni Uber Eats trouvés (relevé précédent). Brasserie Laissac : « À emporter :
  Oui » (Schlouk, fiche ancienne), aucune plateforme trouvée. Probable.

### Site web
- cafedesarts34.fr est un site **Jalis** (agence web, liens « agence Jalis » dans le sitemap), avec des dizaines
  de pages SEO générées (« selon le brief de l'établissement »). Confirmé — https://www.cafedesarts34.fr/sitemap.xml

## 4. Avis : vitesse de service et thèmes

### Notes (Google Maps, ouvert le 2026-10-15, vue limitée)
| Établissement | Note | Répartition 5/4/3/2/1 ★ | Part de 1 ★ | Thèmes Google (nb d'avis) | Confiance |
|---|---|---|---|---|---|
| Le Victoria | 4,0 (2 540) | 1 597 / 304 / 134 / 120 / 385 | 15 % | serveur 298, happy hour 70, terrasse 60, tapas 45, service 28, girafe 19, shooters 17 | confirmé |
| Café des Arts | 4,2 (4 268) | 2 625 / 718 / 325 / 179 / 421 | 10 % | tapas 43, happy hour 32, girafe 17, shooter 12, match 11 | confirmé |
| Le Novelty | 3,9 (1 209) | 678 / 186 / 99 / 50 / 196 | 16 % | terrasse 31, happy hour 28, étudiant 15, girafes 12, mojito 12, match 7 | confirmé |
| Brasserie Laissac | 4,4 (279) | 204 / 42 / 10 / 0 / 23 | 8 % | cuisine asiatique 6, tapas 6, happy hour 4 (avis surtout antérieurs à la reprise) | confirmé |

Total : **8 296 avis Google** sur les quatre fiches. Autres plateformes (Sluurpy, agrégats) : Café des Arts
Tripadvisor 3,0 (544), Facebook 3,0 (194), Petit Futé 2,0 (12) ; Novelty Tripadvisor 2,0 (45), Restaurant Guru
3,0 (790), Facebook 4,0 (47). Probable (chiffres repris par Sluurpy, plateformes d'origine non ouvertes :
Tripadvisor et Restaurant Guru renvoient 403).

### Citations (verbatim, moins de 20 mots, pages ouvertes)
1. Café des Arts — 4 ★, avis Google repris sur Sluurpy, « il y a 4 mois » au 15/10/2026 :
   « petit bémol pour le service un peu long, nous avons dû nous déplacer pour passer la commande »
   — https://www.sluurpy.fr/montpellier/restaurant/1991675/le-cafe-des-arts
2. Café des Arts — 1 ★, Google Maps, « il y a un mois » (visite en août 2026) :
   « Nous avons demandé qu'un simple calage soit effectué, mais personne n'est finalement venu »
   — fiche Google Maps « Le cafe des arts »
3. Le Novelty — 1 ★, Google Maps, « il y a 6 mois » (visite en avril 2026, pendant le happy hour) :
   « Lors du paiement, mon amie paye 12€ au lieu des 9€ indiqué précédemment »
   (malentendu sur le prix happy hour des mojitos parfumés et le format XXL à la prise de commande)
   — fiche Google Maps « Le Novelty »
4. Le Novelty — 5 ★, avis Google repris sur Sluurpy, « Modifié il y a 5 mois » :
   « Serveur et service efficace malgré la foule de monde »
   — https://www.sluurpy.fr/montpellier/restaurant/1996127/le-novelty
5. Le Victoria — 5 ★, Google Maps, « il y a 4 mois » (déjeuner, visite en juin 2026) :
   « Accueil super par des serveurs en plein rush. Ils ont été rapide, sympathique, polis. »
   — fiche Google Maps « le victoria »
6. Le Victoria — 5 ★, WanderBoat (avis agrégés), « 2 years ago » :
   « le service est quand même un peu long par rapport au nombre qu'ils sont et au nombre de tables »
   — https://wanderboat.ai/restaurants/france/montpellier/le-victoria/UjwhIq2GTMm6p8-6iXxzaw

Thèmes par établissement :
- **Le Victoria** — attente : service jugé long à l'heure de pointe malgré l'effectif (citation 6). Éloges très
  nombreux pour les serveurs (thème « serveur » dans 298 avis, prénoms cités), rapides même « en plein rush » ou
  quand « la terrasse est bondé[e] » (WanderBoat, 5 ★, 1 an). Groupe de 40 personnes accepté le jour de la Fête de
  la musique (WanderBoat, 5 ★, 16 semaines). Reproche récurrent : carafe d'eau refusée (Google, 1 ★, 3 mois). Confirmé.
- **Café des Arts** — attente : devoir aller commander soi-même en terrasse (citation 1), personne ne vient (citation 2).
  Wanderlog (résumé automatique) conseille « Be clear when paying your bill to ensure correct change » et cite
  « slow service at times » — https://wanderlog.com/place/details/1133015 (probable, texte généré). Éloges : terrasse
  sous les pins, salle climatisée, tapas, service (avis 5 ★ récents). Confirmé.
- **Le Novelty** — paiement : écart entre le prix annoncé à la commande et le prix payé pendant le happy hour
  (citation 3) ; affluence (citation 4) ; « le service est rapide », « Temps d'attente : 10 min maximum » (Google,
  5 ★, 4 mois). Reproches : portions et prix des tapas, pas de formule étudiante les soirs de match. Confirmé.
- **Brasserie Laissac** — trop peu d'avis depuis la reprise pour un thème ; « Temps d'attente 10-30 min » sur un
  brunch 5 ★ (Google, 9 mois, ancienne exploitation). Les éloges (cuisine asiatique, soupe thaï, tarte tatin) visent
  l'ancienne équipe. Probable.

## 5. Horaires et service du midi

| Établissement | Ouverture | Restauration / midi | Happy hour | Sources | Confiance |
|---|---|---|---|---|---|
| Le Victoria | 7j/7 10h–1h | Service continu « petit déjeuner, brunch, déjeuner, dîner » ; deux plats du jour dès 9,90 € | 16h–1h | cafedesarts34.fr/le-victoria-w1 ; Privateaser (réservation lun–dim 10h–1h) ; WanderBoat (jeu. 10h–1h) | confirmé |
| Café des Arts | 7j/7 10h–1h (site du groupe) ; Google (via Wanderlog) 8h–1h tous les jours | **Restauration 11h30–23h** ; deux plats du jour chaque midi dès 9,90 € | 17h–21h (Privateaser) ; groupe : « généralement de 16h à 23h » | cafedesarts34.fr/le-cafe-des-arts-w1 et page `details-bar+restaurant+avec+terrasse+ombragee…-22` ; Wanderlog `openingPeriods` | confirmé (site) / contradiction sur l'ouverture |
| Le Novelty | 7j/7 8h30–1h | « Déjeuner 09h00 – 17h00 » (son site) ; café à 1 € 9h–12h ; plats du jour midi dès 9,90 € ; formule goûter | 17h–23h | https://lenovelty-montpellier.fr/ ; cafedesarts34.fr/le-novelty-w1 | confirmé |
| Brasserie Laissac | 7j/7 9h–1h (Google, 15/10/2026) | Plats du jour dès 9,90 € (site du groupe) ; heures de cuisine : non trouvées | 17h–20h (Schlouk, avant reprise ?) | Google Maps ; cafedesarts34.fr ; schlouk-map.com | confirmé (Google) / probable (HH) |

## 6. Le groupe dans son ensemble

- **Nom public : « Groupe CKL »** — « Le Groupe CKL réunit quatre établissements complémentaires au cœur de
  Montpellier » (page FAQ). Le site se présente comme « Le café des arts — quatre adresses au cœur de Montpellier ».
  Confirmé — https://www.cafedesarts34.fr/conseils-et-faq-w1
- Formulaire de contact unique pour les quatre lieux (« Choix du lieu »), données traitées par « C K L ».
  Boîte mail commune **ckl.cafedesarts@gmail.com** pour le Novelty et le Victoria ; contact@cafedesarts34.fr pour le
  Café des Arts ; téléphone seul pour Laissac (04 67 57 72 10). Confirmé — https://www.cafedesarts34.fr/contact
- Signature commune : **girafes de bières et de cocktails de 3 à 5 L** « disponibles ici comme dans les autres
  établissements » ; plats du jour à 9,90 € dans les quatre. Confirmé (site du groupe).
- Événements et privatisation : anniversaires, afterworks, pots de départ, EVG/EVJF, soirées étudiantes dans les
  quatre ; Novelty équipé grand écran, micros, sono ; Café des Arts : salle privatisable, soirées à thème,
  retransmissions sportives, DJ le week-end dès 22h (Privateaser). Confirmé (site du groupe, Privateaser).
- Recrutement : **aucune offre publique trouvée** au 15/10/2026 — France Travail (Montpellier, 5 km) : 0 offre pour
  « café des arts », « victoria », « novelty », « laissac », « CKL » ; HelloWork : 0 offre pertinente ; Indeed : 403.
  Le volume de recrutement (rotation du personnel) n'est donc pas documenté. Confirmé (absence), sans valeur de preuve
  sur la rotation réelle.
- Autres sociétés liées à JSK Holding / Med Oul Hocine Belkhir (API recherche-entreprises, BODACC) :
  - **M A N** (ex-« CAFFE PANIS », SIREN 987 451 150, présidente JSK Holding) : fonds de café-glacier acheté en
    2025 et donné en **location-gérance** à FFS (Nîmes) depuis le 19/06/2025. Même schéma que le Novelty (NEWVELTY →
    BKB). Confirmé (BODACC) ; voir aussi `demos/caffe-panis/profile.json`.
  - **ANNA** (SARL holding, 2026, co-gérée avec la présidente de LAISSAC), **JUVIGNAC** (SCI, 01/12/2025, JSK
    associée) et **CAFE CARRE** (SCI, 15/04/2026) : structures récentes, objet immobilier ou de participation.
    Confirmé (existence) ; projet derrière « Café Carré » ou « Juvignac » : non vérifié.
  - Rythme : une acquisition ou création par an depuis 2019 (Victoria 2019, Novelty 2021/2024, Caffè Panis Nîmes
    2025, Laissac 2026). Déduction, probable.

---

## Ce qui sert au pitch

1. **Quatre lieux, un seul propriétaire, déjà nommé « Groupe CKL »** sur son propre site, avec un formulaire et une
   boîte mail communs : la vue groupe d'Ominin colle à une organisation qui se pense déjà comme un groupe.
   (confirmé — cafedesarts34.fr/conseils-et-faq-w1, /contact)
2. **≈ 5,1 M€ de CA 2024** sur les trois sociétés d'exploitation (Café des Arts 2,6 M€, Victoria 1,69 M€, Novelty
   0,83 M€) et **36 à 77 salariés**. (confirmé — API recherche-entreprises, ratios INPI)
3. **Un 4e lieu à équiper maintenant** : Brasserie Laissac rachetée 400 000 € le 22/07/2026, ouverte par le groupe
   le 12/08/2026, horaires passés à 9h–1h 7j/7. (confirmé — BODACC, Google Maps)
4. **Trois lieux dans un rayon de ≈ 30 m**, le quatrième à ≈ 410 m : un responsable peut suivre les quatre salles
   depuis un seul écran. (probable — coordonnées Google Maps)
5. **Grosses jauges** : Victoria 150 personnes, terrasse du Café des Arts 150 places plus trois salles, Novelty 50 en
   privatisation, Laissac ≈ 100. (confirmé / probable selon le lieu — site du groupe, Privateaser)
6. **Happy hours longs, donc prix qui changent selon l'heure** : Victoria 16h–1h, Novelty 17h–23h. Un client du
   Novelty paie 12 € au lieu des 9 € annoncés à la commande : une carte QR qui applique seule le tarif horaire évite
   ce litige. (confirmé — site du groupe, avis Google 1 ★)
7. **Attente pour commander aux heures de pointe** : « nous avons dû nous déplacer pour passer la commande » (Café des
   Arts), service « un peu long par rapport au nombre qu'ils sont » (Victoria), « malgré la foule de monde » (Novelty).
   (confirmé — Sluurpy, WanderBoat, Google)
8. **Le personnel est l'atout n° 1** (« serveur » dans 298 avis du Victoria) : la commande et le paiement par QR
   libèrent les serveurs pour l'accueil, sans les remplacer. (confirmé — Google Maps)
9. **Aucun outil numérique commun** : aucune commande ou paiement en ligne, réservation par Jotform (Victoria),
   Formspree (Novelty), formulaire Jalis (Café des Arts) ou téléphone (Laissac) ; Privateaser non réservable ; la carte
   du Victoria n'existe en ligne que sur Deliveroo et dans un annuaire (lacarte.menu). (confirmé)
10. **8 296 avis Google**, dont 10 à 16 % à 1 ★ sur les trois lieux de l'Écusson : l'expérience à table pèse sur une
    réputation très exposée. (confirmé — Google Maps, 2026-10-15)

## Questions ouvertes

- Quelle caisse dans chaque lieu, et la même partout ? Contrat, coût, intégration TPE (rien trouvé en ligne).
- Vers quoi pointe le QR des chevalets du Café des Arts ? Y a-t-il un QR sur les tables du Victoria (PDF lacarte.menu ?)
  et du Novelty (site) ?
- Le Novelty est-il bien exploité par BKB en location-gérance depuis le 01/08/2025 ? Si oui, qui décide des outils
  au Novelty : JSK Holding ou BKB ?
- Capacité réelle salle / terrasse et nombre de tables par lieu ; les 150 du Victoria incluent-ils la terrasse ?
- Brasserie Laissac sous le groupe : carte, équipe, horaires de cuisine, happy hour actuel, caisse reprise de BARMAX ?
- Durée de l'exercice 2024 de C.K.L (changement de date de clôture) : le 2,6 M€ est-il sur 12 mois ?
- Volume de recrutement et rotation : combien d'extras en saison, combien de serveurs par service de pointe ?
- Quel lien entre le groupe et les SCI JUVIGNAC / CAFE CARRE : un cinquième lieu en préparation ?
- Les prix happy hour doivent-ils s'appliquer automatiquement à la commande (Victoria 16h–1h, Novelty 17h–23h) ?
