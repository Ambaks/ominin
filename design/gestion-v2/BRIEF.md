# Gestion v2 — brief partagé pour les rendus « première page »

Objectif : une maquette HTML autonome (un seul fichier, CSS inline, zéro framework, polices Google autorisées)
de la **première page de l'espace de gestion Ominin** — l'Aperçu du gérant — dans un style donné
(`claymorphism.html` ou `liquid-glass.html`). C'est une comp de design pour choisir une direction,
pas du code de production. Même contenu dans les deux rendus pour comparer à armes égales.

## Produit et usage

Ominin Connect : back-office d'un restaurant. Le gérant l'ouvre sur un ordinateur portable en salle et sur
son téléphone entre deux services. Mode « Operate » : la précision et la retenue priment, les chiffres doivent
être honnêtes et lisibles d'un coup d'œil, la couleur porte du sens (pas de décor gratuit).
Identité : **lire `OMININ-SYSTEM.md` dans ce dossier avant toute couleur**. Il est la seule source de
jetons, matières et mouvement ; le style demandé (clay, glass, néon) est une *matière* appliquée à ces jetons,
jamais une autre palette. Fraunces + Instrument Sans, mot-symbole « Ominin » en `.ember-text`.

## Structure de l'écran (fidèle à la page réelle `app/menu/gestion/page.tsx`)

**Shell** : barre latérale (desktop) / barre d'onglets ou menu (téléphone) avec, dans l'ordre :
Aperçu (actif), Commandes, Bulles, Paiements, Tables, Menu, Produits, Équipe, Terminaux, Fidélité.
En haut : nom du restaurant **« Le Bistrot d'Olga »**, rôle « Gérant », bascule clair/sombre, cloche de
notifications (1 non lue), lien « Voir le menu ↗ », petit mot-symbole « Ominin ».

**Contenu**, de haut en bas :

1. Titre « Aperçu », sous-titre « vendredi 31 octobre ».
2. Deux tuiles du jour (cliquables) :
   - « Commandes en cours » **7** — repère : « 3 à encaisser · 4 à servir »
   - « CA du jour » **2 580 €** — repère : « +12 % vs vendredi dernier »
3. Bandeau d'état « Fermeture en cours » : « Cuisine fermée jusqu'à 19:00 — les boissons restent en vente »
   avec une action « Rouvrir ».
4. « Top ventes du jour » (liste classée) :
   1. Burrata di Parma ×14 · 2. Pizza Diavola ×11 · 3. Tiramisù ×9 · 4. Spritz Aperol ×8 · 5. Linguine vongole ×7
5. « À remettre en vente » : Tartare de thon — Stock épuisé · Panna cotta — Retiré de la vente ; action « Gérer ».
6. Section « Analytique » (« Vos ventes sur la période, mises à jour en direct ») avec un segmenté
   **7 jours** (actif) | 30 jours, puis quatre tuiles, chacune avec un repère unique (période précédente) :
   - CA encaissé **11 480 €** — +6 %
   - Commandes payées **412** — +3 %
   - Panier moyen **27,86 €** — +2,9 %
   - Pourboires **318 €** — +9 %
7. « CA par jour » — barres, 7 jours (CA / commandes) :
   sam 25 : 2 310 € / 83 · dim 26 : 1 420 € / 51 · lun 27 : 980 € / 35 · mar 28 : 1 160 € / 42 ·
   mer 29 : 1 340 € / 48 · jeu 30 : 1 690 € / 61 · ven 31 : 2 580 € / 92. Le maximum (ven 31) est étiqueté.
   Totaux connus : 11 480 € et 412 commandes — ils doivent se retrouver exactement.
8. Deux colonnes : « Top ventes » (barres horizontales, 7 jours) :
   Pizza Diavola ×96 · 1 440 € ; Burrata di Parma ×88 · 1 232 € ; Spritz Aperol ×81 · 648 € ;
   Tiramisù ×64 · 512 € ; Linguine vongole ×52 · 936 €.
   « Heures de pointe » (24 barres, commandes par heure, total 412) :
   0–10 h : 0 · 11 h : 6 · 12 h : 48 · 13 h : 61 · 14 h : 22 · 15 h : 5 · 16 h : 3 · 17 h : 4 ·
   18 h : 19 · 19 h : 57 · 20 h : 74 · 21 h : 66 · 22 h : 31 · 23 h : 16.
9. « Le combo parfait » (« Ce que les suggestions du menu ont fait commander, annulations exclues ») :
   trois tuiles — CA des suggestions **1 236 €** (sur 7 jours), Lignes suggérées **97**, Part du CA **10,8 %** —
   puis deux cartes : « Par origine » (Suggestion sous le plat : 54 lignes · 702 € ; Fin de commande :
   43 lignes · 534 €) et « Plats suggérés les plus vendus » (Tiramisù ×31 · 248 € ; Spritz Aperol ×29 · 232 € ;
   Burrata di Parma ×22 · 308 €).
10. Repli « Données détaillées (tableau) », fermé.

## Règles non négociables

- Chiffres en figures tabulaires, alignés à droite dans les tableaux ; « — » pour une donnée absente, jamais un faux zéro.
- Chaque chiffre-titre a **un seul** repère (période précédente ou cible). Les écarts : vert si mieux, couleur chaude si pire ; jamais rouge/vert seuls — toujours un signe ou un mot.
- La couleur suit l'entité : une teinte pour l'argent, une pour les commandes/personnes ; la couleur chaude est réservée aux problèmes (fermeture, rupture).
- Contraste texte ≥ 4,5:1, focus visible, `prefers-reduced-motion` respecté, pas de texte gris sur fond coloré.
- Responsive : 1440 px (barre latérale), 1024 px, 375 px (navigation repliée, tuiles en une colonne, graphiques lisibles).
- Pas de sentence hors infobulles et états vides : étiquettes courtes, le regard se pose sur les données.
- Icônes : SVG inline simples (trait 1,75), pas de bibliothèque.
- Sortie : **un seul fichier HTML** dans `design/gestion-v2/`, ≤ 120 Ko, sans dépendance réseau autre que Google Fonts.
