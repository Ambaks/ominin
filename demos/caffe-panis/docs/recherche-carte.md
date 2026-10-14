# Caffè Panis (Montpellier) — carte relevée le 2026-10-14

## Ce qui existe (et ce qui n'existe pas) en ligne

- **Aucune carte de salle actuelle n'est publiée.** Le lien « MENU » du Linktree
  (https://linktr.ee/caffepanis) ouvre Sunday
  (https://sundayapp.io/venues/8c979d11-0d9c-4ba5-94f3-748374cd641c/menus), qui affiche
  « Aucun menu disponible — Veuillez demander la carte papier » ; l'API Sunday renvoie
  404 « Menu not found » en FR, EN et IT. Sunday ne sert qu'au paiement à table.
  Preuves : raw/sunday-rendered.txt, raw/sunday-mobile.png, raw/sunday-resp-*.json.
- Une ancienne carte Sunday (venue 52fc66ec-…, liée par le blog Une Pintade en 2022)
  affiche aujourd'hui « Oups, cette page n'existe pas » (raw/sunday2-rendered.txt).
- caffepanis.com ne sert plus de site (le serveur renvoie le site de l'agence AT NIGHT,
  /traiteur en 404). Archives 2024 : pages traiteur et jeu-concours seulement, pas de carte.
- Google Maps : aucun lien menu, le site déclaré est la réservation FoodCollect.

Sources utilisées, de la plus proche de la salle à la plus éloignée :

| # | Source | Date | Ouverte ? | Fichier brut |
|---|---|---|---|---|
| A | TheFork, fiche Caffè Panis, menu « À la carte » (archive Wayback) | 2022-08-07 | oui, JSON de la page | raw/wb-thefork-20220807.html |
| B | Une Pintade à Montpellier, menus du midi | 2022-04-14 | oui | raw/pintade.html, raw/pintade.txt |
| C | caffepanis.com/traiteur (archive Wayback) : noms de plats sans prix | 2024-06-15 | oui | raw/wb-traiteur.dec.html |
| D | Deliveroo « Ciccio Gang By Caffè Panis » (en ligne, fermé à l'heure du relevé, « Ouvre à 19:00 ») | 2026-10-14 | oui, rendu Playwright | raw/pw-deliveroo-rendered.txt, raw/deliveroo-next.json |
| E | Uber Eats « Ciccio Gang by Caffe Panis » (archive Wayback, JSON-LD hasMenu) | 2025-11-26 (et 2025-10-29) | oui | raw/wb-ue-ciccio-20251126.html, raw/ue-ciccio-menu-ld.json, raw/wb-ue-ciccio-20251029.html |

D et E sont la marque de livraison (même adresse) : prix de livraison, pas de salle.
Uber Eats en direct (2026-10-14) renvoie un contrôle anti-robot : non contourné, état
actuel de la fiche inconnu.

Convention : chaque ligne est VERBATIM sauf mention contraire (orthographe, majuscules,
ponctuation et coquilles de la source conservées). Alcool signalé [ALCOOL].

---

## A. TheFork « À la carte » — 2022-08-07 (prix de salle, 2022)

Prix moyen affiché : 30 €. Horaires déclarés : 08:00–01:00 tous les jours.

### Entrée
- Pane & mortadella — 7 € — « Petit pain ciabatta maison, mortadella aux pistaches »
- Pane amore & fantasia — 8 € — « Petit pain ciabatta maison, jambon de parme, mozzarella di bufala, tomate, basilic »
- Pane parigino — 7 € — « Petit pain ciabatta maison, jambon/beurre »

### Plat principal
- Pizze Marinara — 11 € — « Sauce tomate, olive taggiasche, origan, ail, huile d'olive, basilic »
- Pizze Luna rossa — 14 € — « Sauce tomate, mozzarella fior di latte, anchois, olives, câpres, origan, ail, basilic, huile d'olive »
- Pizze Mama King — 17 € — « Sauce tomate, mozzarella fior di latte, jambon blanc, champignons, basilic »

### Dessert
- Tiramisu café — 7 € — (pas de description)
- Ainsi font, font, font... — 9 € — « Mousse aux chocolats au siphon »
- Tiramisu praliné — 7 € — (pas de description)

### Boissons
- Café Illy — 2 € — (pas de description)

---

## B. Menus du midi — Une Pintade, 2022-04-14 (texte de l'article)

Introduction : « Pour le midi, il existe deux menus bien pensés pour les clients pressés
qui travaillent en centre ville. » Le texte ne dit PAS « en semaine ».

- Menu du midi à 13€ : « ▪ salade composée ▪ penne sauce tomate basilic ou Spaghetti pesto maison ▪ café »
- Menu du midi à 17€ : « ▪ salade tomate mozzarella de bufala ▪ 1/2 pizza de ton choix ou plat du jour ▪ verre de vin ▪ café » [ALCOOL : verre de vin]

Autres mentions de l'article, sans prix (VERBATIM) : pizza « BUFALA KILL » : « Tomates
fraiches, huile d'olives, mozzarella fior di latte, mozzarella di bufala, pesto maison,
jambon de Parma et copeaux de parmesan ». Plats cités : « Paccheri al ragu napoletano,
escalope marsala, boulette de viande, sauce tomate, pesto maison, aubergine, lasagne, gratin
de courgette parmesan, pecorino, scamorza fumé, mozzarella, foccacia, jambon de Parme ».
Vins du Pic Saint-Loup cités : Domaine Desvabre, Domaine d'Hondrat, Grande Sieste, Domaine
Cammaous et Caussarelle.

---

## C. Plats du service traiteur — caffepanis.com/traiteur, archive 2024-06-15 (légendes de photos, sans prix)

- « Escalope de poulet marinée sauce marsala, pistache, et gratin d'aubergine »
- « Gnocchis dans un panier à Pizza nappé sauce tomate basilic »
- « Pizza "Mama King" Sauce tomate, mozzarella fior di latte, jambon blanc, champignons , basilic »

(Le gnocchi en panier de pâte à pizza est le plat le plus cité des avis Google : sujet
« gnocchis », 16 avis.)

---

## D. Deliveroo « Ciccio Gang By Caffè Panis » — en ligne le 2026-10-14

Catégorie unique « Pizzas🍕🍕🍕 ». Noms avec l'emoji « 🍕 » en suffixe sur la source.

- Margherita du seigneur🍕 — 13,00 € — « Tomate, mozza et basilic. »
- Puissance 4🍕 — 15,00 € — « Tomate, mozza, gorgonzola, chèvre et parmesan. »
- Parma de la night🍕 — 17,00 € — « Tomate, mozza, jambon de parme, roquette et parmesan. »
- Maman est sortie (hot)🍕 — 16,00 € — « Tomate, mozza, lardo, chorizo et roquette. »
- Rasta rocket🍕 — 14,00 € — « Tomate, mozza, frarielli, câpres et oignons, » (virgule finale sur la source ; « frarielli » sic)
- Burrata addiction🍕 — 18,00 € — « Tomate, basilic, burrata et roquette. »
- Truffe moi si tu peux 🍕 — 19,00 € — « Crème de truffe, jambon de parme, mozza et roquette. »

---

## E. Uber Eats « Ciccio Gang by Caffe Panis » — archive 2025-11-26

Fiche : 3,9/5 (39 avis) ; horaires livraison 12:00–15:00 et 19:00–22:00 (14:30 le lun.–mer.
selon une ligne en double). Prix de livraison.

### Les Dwich du Panis
- Les Dwich du Gang — 6,90 € — « Le dwich jambon pâte à pizza bien fluffy, jambon blanc et mozza fior di latte xxtra fondante. »
- Le Dwich Regina — 7,90 € — « Pâte à pizza bien fluffy, sauce de tomates italiennes en direct de notre producteur fiammante, mozza fior di latte, jambon blanc, champignons de Paris cuits et olives taggiasche. »
- Le Dwich Truffe — 8,90 € — « Pâte à pizza bien fluffy, crème de ricotta à la truffe d'été, mozza fior di latte et champignons de Paris cuits. »

### Pizze
- Pizza Mama King — 14,90 € — « Champignons de paris cuit finement tranchés, jambon blanc aux herbes, mozza fior di latte, sauce tomates italiennes olive taggiasche et basilic frais. »
- Pizza Margherita — 11,90 € — « Mozza fior di latte, sauce de tomates italiennes en direct de notre producteur fiammante, gran formaggio rapé et basilic frais. »
- Pizza Puissance 4 — 14,90 € — « Crème fraîche, gorgonzola, gran formaggio râpé, mozza fior di latte et ciboulette. Du cheesy comme on aime. »
- Pizza Stracciatella Versace — 19,90 € — « Jambon de parme, stracciatella fumée bien crémeuse, pecorino romano rapé, roquette fraiche et sauce tomates italiennes en direct de notre producteur fiammante. »
- Pizza Capo — 15,90 € — « Fines tranches de salame piccante, salsa nduja xxxtra hot, mozza fior di latte, sauce tomates italiennes en direct de notre producteur fiammante et marjolaine fraîche. »
- Pizza Truffle Suprême — 20,90 € — « Crème de truffe d'été à la ricotta, mozza fior di latte, petits champignons de paris, beaux copeaux de truffe fraîche d'automne, gran formaggio râpé et ciboulette. »
- Pizza Amor Amatriciana — 15,90 € — « Pancetta "Poitrine de porc" et sauce de tomates italiennes pour une extra dose de saveurs, mozza fior di latte, pecorino et basilic frais. »
- Pizza Green Circle — 14,90 € — « Mozza fior di latte, sauce de tomates italiennes en direct de notre producteur fiammante, gran formaggio râpé, aubergines frites et basilic frais. »

### Pastas
- Pasta Carbonara Originale — 13,90 € — « Pasta rigatoni à la sauce carbonara, guanciale de cochon et pecorino. »
- Pasta Vivi E Vechio — 12,90 € — « Pasta rigatoni à la sauce de tomates italiennes, stracciatella fumée et feuilles de basilic. » (« Vechio » sic)
- Pasta Con Il Pesto — 12,90 € — « Pasta casareccia au pesto de basilic frais, gran formaggio italiano, petites noisettes et feuilles de basilic. »
- Pasta Alla Bolognese — 14,90 € — « Pasta rigatoni au ragù de boeuf, gran formaggio italiano et feuilles de basilic. »
- Pasta All'amatriciana — 14,90 € — « Pasta rigatoni à la sauce de tomates italiennes, pancetta de cochon et pecorino. »
- Pasta Al Tartufo — 18,90 € — « Pasta mafaldine à la crème de gorgonzola, jambon truffé, éclat de noisettes, copeaux de parmesan, huiles truffée »

### Antipasti
- Stracciatella Fumee 125 G — 6,90 € — « Stracciatella de 125 g fumée et crémeuse à souhait straight from puglia, basilic frais, un filet d'huile d'olive et une pointe de sel de poivre e basta. »
- Trio d'arancini — 6,90 € — « Trois dodues boulettes frites de risotto au prosciutto et fromage mozza fior di latte, ouuuuh. »
- Prosciutto — 7,90 € — « L'inoubliable jambon en direct de la région de Parme, fondant à souhait. »
- Burrata Pesto Forever — 8,90 € — « Belle burrata straight from puglia fourrée au pesto de basilic, tomates séchées à l'huile, huile d'olive et basilic frais. Servi avec une boule de pain maison. »
- Burrata Truffe & Mortadelle — 10,90 € — « Dodue burrata bien fraîche en direct des pouilles et crème de truffe d'été. » (le nom cite la mortadelle, la description non)
- Classic Burrata — 6,90 € — « Burrata de 125 g crémeuse à souhait straight from puglia, basilic frais, un filet d'huile d'olive e basta. »

### Desserts
- Il Tiramisù — 6,90 € — « Le grand classique de la casa bien onctueux et une petite pointe de liqueur de marsala, c'est que du love. » [ALCOOL : liqueur de marsala dans la recette]
- Mousse Big-love — 6,90 € — « Inimitable mousse au bon chocolat, praliné noisette et crunchy gaufrette au chocolat au lait. »
- Deurty Cookie — 5,90 € — « Décadent cookie choco-praliné mi-cuit, noix de pécan, big pépites de chocolat et pour l'overdose de love, cœur fondant ultra coulant à la gianduja. »

### Boissons
- Coca-Cola — 2,90 € — « 33 cl. »
- Coca-Cola Zéro — 2,90 € — « 33 cl. »
- Fuzetea Pêche — 2,90 € — (pas de description)

### Noms différents dans l'archive du 2025-10-29 (mêmes descriptions, mêmes prix)
Margherita 3.0 (→ Margherita), Regina Forever (→ Mama King), Cheesy (→ Puissance 4),
Xxtra Hot (→ Capo), Aubergine (→ Green Circle), Carbonara Di Alfredo (→ Carbonara
Originale), Burrata Al Tartufo (→ Burrata Truffe & Mortadelle), Arancini Prosciutto
(→ Trio d'arancini). La carte de livraison se renomme souvent.

---

## Conflits entre sources (non résolus)

| Plat | Source | Version |
|---|---|---|
| Mama King | A (salle 2022) | 17 €, sauce tomate, fior di latte, jambon blanc, champignons, basilic |
| Mama King | E (livraison 2025) | 14,90 €, + jambon aux herbes, olive taggiasche |
| Puissance 4 | D (Deliveroo 2026) | 15 €, base tomate : « Tomate, mozza, gorgonzola, chèvre et parmesan. » |
| Puissance 4 | E (Uber 2025) | 14,90 €, base crème : « Crème fraîche, gorgonzola, gran formaggio râpé, mozza fior di latte et ciboulette. » |
| Margherita | D | « Margherita du seigneur » 13 € |
| Margherita | E | « Pizza Margherita » 11,90 € |
| Bufala Kill | B (2022) | tomates fraîches, fior di latte, bufala, pesto, Parme, parmesan |
| Burrata addiction | D (2026) | tomate, basilic, burrata, roquette (l'ancienne réponse « Bufala Kill = burrata » d'Uber « Lost » n'a pas été revue : la fiche n'est pas archivée) |
| Mousse au chocolat | A (2022) | « Ainsi font, font, font... » 9 €, mousse au siphon |
| Mousse au chocolat | E (2025) | « Mousse Big-love » 6,90 €, praliné noisette, gaufrette |
| Tiramisu | A | Tiramisu café 7 € et Tiramisu praliné 7 € |
| Tiramisu | E | « Il Tiramisù » 6,90 € |

Deux cartes de livraison actives en même temps (Deliveroo D et Uber E) avec des noms et
des recettes différents : à demander au gérant.

## Toujours introuvable

Cafés (sauf « Café Illy 2 € » en 2022), petit-déjeuner/brunch, salades, plats
(scaloppina, tartare, burger, gnocchi), focaccias, glaces (la maison se dit « Gelateria »,
avec une enseigne GELATERIA au n° 1), cocktails/spritz, bières (une bière blanche maison
« Panis & Fils Palavas » existe en bouteille), vins, pastis « Panis Fantastis » et gin
« Panis & Fils » (produits maison, photos Google et Une Pintade), happy hour (ardoise
« HAPPY HOUR » visible sur une photo Google de février 2026, horaires peu lisibles, peut-être « 17h à 19h » ; le « 16h-19h en semaine » de Mapstr du passage précédent n'est PAS dans la page Mapstr ouverte aujourd'hui).
Seule la carte papier en salle peut les donner.

---

## Écarts avec la démo actuelle (const caffePanis, frontend/lib/menu-data.ts l. 4128–4233)

### Lignes fausses ou à corriger
1. **« Mousse au chocolat » 9 €** : le nom n'existe dans aucune source. Le vrai libellé
   (TheFork 2022) est « Ainsi font, font, font... », description « Mousse aux chocolats au
   siphon », 9 €.
2. **Catégorie « Le midi », tagline « En semaine »** : le blog ne dit pas « en semaine ».
   Retirer ou faire confirmer.
3. **Menu du midi** : « spaghetti » mis en minuscule (source : « Spaghetti ») — mineur.
   Prix 2022.
4. **Puissance 4** (démo sans description) : Deliveroo donne maintenant la description
   « Tomate, mozza, gorgonzola, chèvre et parmesan. »
5. **Maman est sortie** : nom source « Maman est sortie (hot) » ; description disponible
   « Tomate, mozza, lardo, chorizo et roquette. » ; le piment de la démo est cohérent avec
   « (hot) ».
6. **Parma de la night** : description disponible « Tomate, mozza, jambon de parme,
   roquette et parmesan. »
7. **Margherita du seigneur** : description disponible « Tomate, mozza et basilic. »
8. **Marinara / Luna rossa / Mama King** : la source écrit « Pizze Marinara », « Pizze Luna
   rossa », « Pizze Mama King » (le « Pizze » est un préfixe de catégorie, retrait
   acceptable). Prix de salle 2022 ; Mama King est à 14,90 € sur Uber 2025 (livraison,
   recette différente).
9. **Dwich** : noms de la source « Les Dwich du Gang » (jambon), « Le Dwich Regina »,
   « Le Dwich Truffe » ; catégorie « Les Dwich du Panis » ; descriptions verbatim désormais
   disponibles (voir E). La tagline « Le sandwich en pâte à pizza » n'est sur aucune source.
10. **Tagline du restaurant « Ristorante · Pizzeria · Caffè »** : la maison écrit
    « Ristorante - Caffè - Gelateria » (Facebook) et « Caffè-Ristorante-Gelateria 🇮🇹 »
    (Instagram). « Pizzeria » n'est pas leur mot ; « Gelateria » manque.
11. **Mélange de sources** : la catégorie Pizze mêle prix de salle 2022 (TheFork) et prix
    Deliveroo 2026 sous un même titre.

### Lignes manquantes (publiées, avec prix)
- Entrées 2022 : Pane & mortadella 7 €, Pane amore & fantasia 8 €, Pane parigino 7 €.
- Menu du midi à 17 € (verre de vin inclus).
- Café Illy 2 € (2022).
- Carte Ciccio Gang 2025 (livraison) : 8 pizzas dont Stracciatella Versace, Capo, Truffle
  Suprême, Amor Amatriciana, Green Circle ; 6 pâtes ; 6 antipasti (burratas,
  stracciatella, arancini, prosciutto) ; 3 desserts (Il Tiramisù, Mousse Big-love, Deurty
  Cookie) ; 3 softs. À n'utiliser que comme indication tant que le gérant n'a pas donné la
  carte de salle.

### Lignes de la démo sans source
- « Mousse au chocolat » (nom inventé, voir 1).
- Tagline Dwich « Le sandwich en pâte à pizza ».
- Tagline « En semaine ».
- Highlights « Cuisine italienne », « Terrasse place du Marché aux Fleurs » : descriptifs
  justes, pas des citations (sans enjeu).
