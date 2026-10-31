# UX Simplicité — rendre chaque page de la gestion évidente dès le premier jour

Proposition de recherche, 31 octobre 2026. Aucune ligne de code modifiée : ce document se discute avec Ambaka et la session « Dashboard design research » avant toute action. Il complète la direction visuelle « ember glass » (`ember-glass.html`, `OMININ-SYSTEM.md`) en posant une question différente : **comment un gérant, un serveur ou un cuisinier qui n'a jamais vu Ominin s'en sert-il dans la minute, sur son téléphone entre deux services ou sur la tablette de la salle ?**

## 0. En une page

**Le constat.** La gestion est déjà très soignée dans le détail : les confirmations nomment l'objet et la conséquence, les cartes du comptoir se lisent de loin, les états vides disent quoi faire, les toasts racontent ce qui vient de se passer. Ce qui manque n'est pas la finition, c'est la **lisibilité d'ensemble** : trop de portes (jusqu'à 13 onglets, 7 icônes d'en-tête), des mots qui ne sont pas ceux du métier (« Terminaux », « Produits », « Bulles »), une page Établissement qui empile une douzaine de panneaux et dix boutons Enregistrer, et des visites guidées qui **expliquent** l'écran au lieu de le rendre évident.

**Les dix recommandations qui comptent, par impact décroissant :**

| # | Recommandation | Impact | Effort | Pages |
|---|---|---|---|---|
| 1 | **Une barre de navigation par rôle, 4 onglets + « Plus »** au lieu de 7 à 13 onglets | Fort | Moyen | shell, toutes |
| 2 | **Renommer avec les mots du métier** : Terminaux → Imprimantes, Produits → Abonnement, Bulles → Réservations, Établissement → Réglages, Badgeage(s) unifié | Fort | Faible | shell, 6 pages, visites |
| 3 | **Remplacer la visite d'accueil par une liste de mise en route** sur l'Aperçu (« 5 étapes avant le premier service »), chaque étape étant un lien direct, cochée d'elle-même | Fort | Moyen | Aperçu, visites |
| 4 | **Découper Établissement en 4 sections courtes** (Ma fiche · Mon service · Encaissement · Appareils & sécurité), réglages avancés repliés sous « Plus de réglages » | Fort | Moyen | Établissement, Caisse, Notifications |
| 5 | **Un geste « épuisé » à portée de main pour la cuisine** (liste des plats avec un interrupteur, sans passer par Menu) et un accueil cuisine qui est cet écran | Fort | Faible | Aperçu cuisinier, Menu |
| 6 | **Une fiche article en deux temps** : 4 champs pour créer (nom, prix, catégorie, photo), le reste sous « Détails » | Moyen | Faible | Menu |
| 7 | **Des catégories proposées à la première carte** (Entrées · Plats · Desserts · Boissons, modifiables) au lieu d'un écran vide | Moyen | Faible | Menu |
| 8 | **Un accueil de serveur qui montre le geste** : première commande fictive « Table 0 » ou bandeau « Voici comment une commande arrive », et le bouton + nommé « Nouvelle commande » | Moyen | Faible | Commandes |
| 9 | **Des erreurs qui disent quoi faire** : remplacer les 89 « Une erreur est survenue. » par trois messages typés (réseau, droit, données) avec un geste de reprise | Moyen | Faible | toutes |
| 10 | **Retirer la cloche** (décidé par Ambaka le 31 octobre) : les alertes se règlent dans « Plus » et Réglages › Appareils, le bandeau de Commandes reste le point d'entrée | Moyen | Faible | shell, Notifications |
| 11 | **Refaire le constructeur de formules en trois questions** (quelle formule ? le client choisit parmi quoi ? quand ?) avec aperçu client ; l'affiche devient une photo — § 6 | Fort | Moyen | Menu › Formules |

**Ce qui est déjà bon et ne doit pas bouger :** les cartes du comptoir fast food (numéro géant, état en toutes lettres, attente qui change de couleur), la carte d'addition cochable unité par unité, la badgeuse à deux boutons, la bande des jours de Retraits, les confirmations destructives (titre = action + objet, corps = conséquence, bouton = verbe + objet), l'accueil du serveur directement sur le service, les états vides de Tables, Terminaux et Fidélité, le mode « pas de table = numéro du jour » qui retire les écrans inutiles, les visites à action (« Relier Stripe », « Créer une catégorie ») qui sont le bon modèle.

## 1. Méthode et périmètre

- Lecture intégrale des 20 pages sous `frontend/app/menu/gestion/`, du shell (`components/gestion/shell.tsx`), des visites (`lib/gestion/visites.ts`, `visite-guidee.tsx`), des droits (`permissions.ts`, `constants.ts`) et des composants de service (cartes de commande, fiche article, réglages, badgeuse, retraits, soirées, bulles).
- Grille de lecture : `better-interface` (rangement par impact, gravité « HIGH » pour tout ce qui bloque ou trompe), `better-writing` (une voix, un vocabulaire, erreurs qui disent comment réparer, états vides qui pointent vers l'avant), `impeccable` en mode **Operate** (la familiarité est une qualité ; l'outil doit disparaître derrière la tâche), ses playbooks `onboard` (amener au premier résultat, pas enseigner), `clarify` (un fait, un geste, un contexte par état) et `shape`, `dashboard-design` pour l'Aperçu et Paiements (une question par écran, zéro phrase hors infobulle, couleur chaude réservée au problème), et les 119 règles de `ui-ux-pro-max` (visites passables, états vides actifs, erreurs avec reprise, clavier adapté).
- Benchmarks extérieurs : voir § 3.0 et l'annexe B.
- Deux personas tenus à chaque page : **le gérant entre deux services, téléphone à la main, 20 secondes d'attention** ; **le serveur sur la tablette partagée, en plein coup de feu, qui n'a lu aucune doc**. Un troisième pour la cuisine, un quatrième pour le comptoir d'une boutique à emporter, un cinquième pour la porte d'un club.
- Honnêteté : chaque fiche dit ce qui marche déjà. Ce qui relève du goût (densité, rayon, ton) n'est pas un constat.

## 2. Diagnostic page par page

Chaque fiche suit le même plan : **à quoi sert la page**, **le geste qu'un nouveau doit réussir en moins d'une minute**, **ce qui gêne aujourd'hui**, **ce qui est déjà bon**.

### 2.1 Le shell (navigation, en-tête, rôles)

**À quoi il sert.** Donner accès aux pages selon le rôle et l'offre, signaler ce qui attend (pastilles), porter les gestes transverses (voir mon menu, réglages, alertes, déconnexion, visite, verrou Admin, scanner).

**Le geste d'une minute.** Trouver la page de *mon* travail et y revenir sans réfléchir.

**Ce qui gêne.**
- **Jusqu'à 13 entrées** (Aperçu, Commandes, Soirées, Bulles, Retraits, Paiements, Tables, Badgeage, Menu, Équipe, Terminaux, Fidélité, Produits) ; la barre du bas mobile en montre jusqu'à 7 sur 320 px avec des libellés à 9 px. Le code le sait (« Sept onglets sur 320 px : le libellé se resserre »). Un Connect complet gérant voit Aperçu · Commandes · Retraits · Paiements · Tables · Menu · Équipe · Terminaux en bas, soit 8.
- **Trois pages n'ont pas de porte visible** : Produits se rejoint en touchant le surtitre « Ominin Connect · Gérant » (un texte qui ne ressemble pas à un lien), Fidélité n'existe sur mobile que par un lien au milieu d'Établissement, Notifications se cache derrière une cloche.
- **L'en-tête porte 7 icônes** (?, Admin, thème, Voir mon menu, cloche, roue, déconnexion), quatre sans libellé sur mobile. La **déconnexion est un bouton nu à un tap**, sur une tablette partagée.
- **La cloche ment** : elle ouvre des réglages, pas un fil d'alertes. Un gérant qui vient de rater une commande y cherche « ce qui s'est passé » et trouve des cases à cocher.
- **Les noms ne sont pas ceux du métier** : *Terminaux* veut dire TPE (terminal de paiement) pour un restaurateur ; la page gère des imprimantes de cuisine. *Produits* se lit « mes produits = mes plats » ; la page est l'abonnement. *Bulles* est le mot du BOHO, pas celui du marché (`VIEWS` l'appelle d'ailleurs « Réservations »). *Badgeage* (barre employé) et *Badgeages* (onglet d'Équipe) coexistent. *Établissement* contient surtout des réglages de service et de paiement.
- **Le même onglet change de sens selon le mode** : « À servir » est la file du comptoir en fast food et « En cours » en boutique ; Commandes en boutique ne porte pas de pastille car Retraits compte déjà. C'est juste, mais ce n'est écrit nulle part à l'écran : seule la visite l'explique.

**Déjà bon.** Le filtrage par rôle et par capacité (un serveur ne voit ni Paiements ni Équipe) ; les pastilles qui comptent « ce qui attend un geste, là où il se fait » ; l'accueil du serveur directement sur Commandes ; l'accueil de la boutique directement sur Retraits ; le bouton Scanner traité comme une action pleine et non comme un onglet ; les cibles de 44 px au doigt ; le retrait des écrans de tables en fast food.

### 2.2 Aperçu (gérant)

**À quoi il sert.** Dire si la journée va bien et où agir : commandes en cours, CA du jour, fermetures, top ventes, plats à remettre en vente, puis l'analytique 7/30 jours.

**Le geste d'une minute.** Lire deux chiffres et rouvrir la cuisine ou remettre un plat en vente.

**Ce qui gêne.**
- **Le premier jour, la page est vide et muette.** Sans commande : deux tuiles à 0, quatre KPI à 0 €, pas de graphique (`hasAnalyticsData` les cache), rien ne dit « voici les 5 choses à faire avant le premier service ». C'est pourtant l'écran que voit chaque nouveau gérant après le paiement.
- **La visite d'accueil fait 8 étapes dont 5 expliquent l'interface** (« Vos onglets », « Besoin d'un rappel ? », « Vos réglages ») ; seule « Relier Stripe » fait faire quelque chose.
- **Deux idées de « jour »** : les tuiles du jour renvoient toutes deux vers Commandes (CA du jour devrait mener à Paiements) ; l'analytique redit « CA encaissé » avec une autre fenêtre. `dashboard-design` : un chiffre dit une fois, un repère par chiffre ; aujourd'hui aucun chiffre n'a de repère (la maquette v2 en ajoute, bien).
- **« Le combo parfait »**, « Lignes suggérées », « Part du CA » : un bloc entier de vocabulaire interne, sans infobulle.
- **Phrases sous les titres** (« Vos ventes sur la période, mises à jour en direct ») là où le regard devrait se poser sur les chiffres.

**Déjà bon.** Tuiles cliquables ; « À l'arrêt » avec Rouvrir sous la main ; « À remettre en vente » avec un lien Gérer ; la date du jour de service (pas la date civile) ; le tableau replié pour les données brutes ; les toasts de fermeture qui préviennent qu'un autre arrêt coupe encore un plat.

### 2.3 Commandes

**À quoi il sert.** Le poste de travail du service : encaisser, servir, suivre les commandes à emporter, fermer la cuisine d'un geste, saisir une commande pour un client qui ne scanne pas.

**Le geste d'une minute (serveur).** Voir qu'une commande arrive, l'encaisser ou la servir.

**Ce qui gêne.**
- **Le modèle « on encaisse, puis ça part en cuisine » n'est pas celui que connaissent les serveurs** (ils servent puis encaissent). La carte le dit en petit (« Part en cuisine une fois encaissée »), mais rien ne le dit en tête d'onglet. Un serveur qui attend un ticket cuisine ne comprend pas pourquoi il ne sort pas.
- **Le bouton + est une icône seule** (aria-label « Nouvelle commande », mais rien à l'écran) ; la visite « Saisir une commande » existe uniquement pour l'expliquer. Sur Retraits, le même geste est un bouton texte « Nouvelle commande » : incohérent.
- **Quatre bandeaux peuvent s'empiler avant la première commande** : fermetures, boîtier hors ligne, invitation push, onglets. Sur téléphone, la première commande est sous la ligne de flottaison.
- **L'historique** ne se cherche que par numéro de table (champ + bouton Rechercher) ; pas par heure ni par montant ; en fast food, pas du tout.
- **La cuisine voit les cartes « À servir » en lecture seule** sans qu'on lui dise pourquoi ses boutons manquent.
- **Les employés n'ont aucune visite ni aucun premier pas** : les visites ne s'ouvrent que pour un gérant inscrit.

**Déjà bon.** Onglets avec compteurs ; l'onglet « À servir » qui se rajoute seul si un plat attend ou si le boîtier tombe (« la salle ne doit jamais perdre de vue une assiette ») ; l'alerte boîtier avec la conduite à tenir ; le point « En direct / Reconnexion… » ; les états vides par onglet ; les cartes du comptoir (numéro géant, « Nouvelle commande / En préparation / En retard / Prête · à remettre » en toutes lettres, attente en pastille) ; « Pas encore prête » pour se reprendre ; l'addition cochable unité par unité avec « Tout encaisser / Encaisser la sélection » ; les confirmations d'annulation.

### 2.4 Tables

**À quoi il sert.** La salle vue par ses tables en service : reste à encaisser, plats à servir, réunir des tables.

**Le geste d'une minute.** Toucher une table, encaisser ou marquer servi.

**Ce qui gêne.** Peu de choses. La fiche d'une table empile Serveur, Séparer, Renvoyer le ticket, Addition, Service dans une modale ; « Renvoyer le ticket » est un geste rare qui prend la première place. L'annulation d'une commande est un lien texte rouge à côté de « Commande de 12:43 », facile à confondre avec le contenu.

**Déjà bon.** Tout. L'état vide (« Appuyez sur + pour ouvrir une table… Les commandes du menu QR ouvrent leur table d'elles-mêmes ») est le modèle à suivre partout ; le sous-titre change quand on réunit ; une table réunie ne se réunit pas deux fois.

### 2.5 Menu

**À quoi il sert.** La carte : catégories, articles, formules, affiches, disponibilité, stock, tarifs planifiés, imprimante par plat.

**Le geste d'une minute (gérant).** Ajouter un plat ou le marquer indisponible.

**Ce qui gêne.**
- **La fiche article pose 13 champs d'un coup** (Nom, Prix, Catégorie, Stock, TVA, Délai de commande, Nom sur le ticket, Description, Allergènes ×15 puces, Détail, Accord suggéré, Photo, Badges, Options) alors que **deux sont obligatoires**. Le gérant qui veut saisir 40 plats un dimanche soir fait défiler 40 fois.
- **La carte vide** propose « Créer une catégorie » puis, une fois la catégorie faite, « Catégorie vide » sans bouton : le « + Ajouter un article » est en haut à droite, hors de l'état vide. Aucune catégorie n'est proposée (Entrées, Plats…), alors que `FORMULE_MODELES` prouve que le projet sait proposer des modèles.
- **Des champs sans affordance** : la note de catégorie est un champ qui ressemble à du texte en italique ; le renommage d'une catégorie se fait en tapant dans un texte qui ne ressemble pas à un champ (enregistré au blur).
- **La disponibilité est le geste de cuisine le plus fréquent et il est le plus enfoui** : il faut aller dans Menu, trouver la catégorie, la carte, puis l'interrupteur « En vente » ; depuis l'Aperçu cuisine, « Gérer » envoie vers toute la page Menu.
- **Le vocabulaire** : « Affiche », « Formule », « Badges », « Détail », « Accord suggéré », « tarifs planifiés » ; « Formules sans affiche · en tuiles sur le menu ».
- **La visite « menu rempli »** explique les flèches et le crayon au lieu que la carte se suffise (un menu ⋯ ou un glisser-déposer).

**Déjà bon.** Menu/Formules bien séparés avec une phrase utile sur ce que fait une formule ; compteurs par catégorie ; « Vide = illimité » sur le stock ; les allergènes avec l'état en clair (« Rien de coché : la fiche affichera “Allergènes non renseignés” ») ; l'avertissement « Aucun des 14… seulement si vous en êtes sûr » ; la suppression d'une catégorie qui compte ses articles ; le nom sur le ticket avec un exemple.

### 2.6 Paiements (gérant)

**À quoi il sert.** Le journal des encaissements : aujourd'hui par mode, pourboires, liste par jour, correction d'une erreur de comptoir, accès à Stripe.

**Le geste d'une minute.** Lire « encaissé aujourd'hui » et retrouver un règlement.

**Ce qui gêne.** La page est juste, mais c'est un relevé : quatre tuiles sans repère (hier, même jour de la semaine dernière), des puces « Caisse », « Emporter », « Remboursée », « À rembourser » que seul un lecteur de code comprend toutes ; « dont 12 € à la caisse » renvoie à la caisse HubRise sans le dire. Le serveur qui y arrive par erreur voit « Réservé au gérant » avec un bouton Retour, c'est bien.

**Déjà bon.** Espèces/Carte/En ligne en tuiles ; jours en sections avec compte et total ; crayon et corbeille seulement sur ce qui se corrige ; la confirmation d'annulation qui dit que la commande passe en annulée et propose « Garder l'encaissement » ; « Voir plus » paginé.

### 2.7 Retraits (click & collect)

**À quoi il sert.** Les commandes à emporter jour par jour : qui passe, à quelle heure, payé ou non, ce qu'il reste à produire ; nouvelle commande prise au téléphone.

**Le geste d'une minute (comptoir).** Prendre en charge une commande du site, la remettre et l'encaisser.

**Ce qui gêne.** C'est l'une des pages les mieux pensées ; les frictions sont de densité : bandeau « N nouvelles commandes du site », bande des jours, champ « Autre jour », titre du jour, onglets Retraits/À produire, quatre tuiles gérant, puis seulement les cartes. Sur téléphone, la première carte à traiter est au troisième écran. Les quatre tuiles répètent une phrase (« Ce que valent les retraits de ce jour… ») là où une infobulle suffirait. « Pas encore retirées » en rouge est juste mais le mot « retard » manque.

**Déjà bon.** La bande des jours avec compte et « fermé » ; le point rouge des nouvelles ; le bouton qui saute à la première commande à prendre en charge ; « Encaisser et remettre » en un geste ; « Remettre en avance ? » avec la conséquence sur la caisse d'aujourd'hui ; la feuille « À produire » pour le laboratoire ; l'ETA proposée en 4 choix ; « Tout est remis pour ce jour-là. »

### 2.8 Fidélité (gérant)

**À quoi il sert.** Allumer le programme, régler le taux, créer des paliers, suivre les clients, offrir des points, effacer un client.

**Le geste d'une minute.** Allumer le programme et créer un premier palier.

**Ce qui gêne.** « Palier » n'est pas un mot de restaurateur (« récompense » l'est) ; la section Résultats précède les réglages alors qu'un nouveau n'a aucun résultat ; le taux par euro demande un nombre décimal sans exemple (« 1 point par euro » comme défaut visible suffirait) ; l'effacement RGPD d'un client est une corbeille à côté du crayon, au même rang qu'un ajustement de points.

**Déjà bon.** Les toasts qui disent l'effet (« Programme allumé : vos clients cumulent des points depuis le menu ») ; « Aucun article : le palier n'apparaît pas sur le menu » ; l'état vide clients ; la confirmation d'effacement qui dit exactement ce qui part et ce qui reste.

### 2.9 Équipe (gérant) et Badgeage (employé)

**À quoi ils servent.** Inviter et gérer les membres, poser le planning, lire les badgeages ; côté employé, pointer arrivée et départ.

**Le geste d'une minute.** Inviter un serveur ; pointer.

**Ce qui gêne.**
- Le formulaire d'invitation vient **avant** la liste des membres ; le choix du rôle est un menu déroulant sans dire ce que chaque rôle verra (les descriptions existent dans `ROLE_TAGLINES` mais ne sont affichées que sur Produits).
- « Badgeages » (onglet gérant) vs « Badgeage » (onglet employé) ; « Membres · Planning · Badgeages » mélange des comptes (accès) et du temps de travail.
- Le mode « Équipe sans comptes » change toute la page (prénoms, fiches) sans qu'on sache à l'écran dans quel mode on est.
- Côté badgeuse : « Aucun serveur dans l'équipe. Le gérant les ajoute depuis Équipe, onglet Planning » décrit un chemin au lieu d'être un lien (et le chemin varie selon le mode).

**Déjà bon.** La badgeuse : deux gros boutons, « qui êtes-vous ? », code puis signature, et une liste de qui est en service. Les toasts d'invitation qui disent quand l'email n'est pas parti et quoi faire.

### 2.10 Établissement (gérant)

**À quoi il sert.** Tout ce qui n'est pas la carte ni le service du jour : fiche publique, horaires, type de service, présentation des catégories, fermetures programmées, paiement en ligne, caisse (HubRise, Popina), fidélité (lien mobile), code de tablette, code d'encaissement, licence de données, click & collect.

**Le geste d'une minute.** Changer l'horaire du soir, ou allumer le paiement en ligne.

**Ce qui gêne.** C'est la page la plus coûteuse pour un nouveau : **douze panneaux empilés sur un seul défilement**, chacun avec son propre Enregistrer ou son enregistrement instantané (le gérant ne sait jamais s'il doit valider), des renvois croisés en texte (« réglée dans “Paiement à table” », « activez “Paiement en ligne” »), des réglages de sécurité (codes) entre des réglages d'affichage, des intégrations (HubRise, Popina) que 95 % des clients n'ont pas, et une « Licence de données » juridique au milieu. Le sous-titre « Les informations affichées sur votre menu en ligne » ne décrit qu'un panneau sur douze. *(Compte exact des contrôles : § 2.10 bis, d'après l'inventaire des composants.)*

**Déjà bon.** Chaque panneau pris seul est bien écrit : le type de service en deux cartes illustrées avec sa conséquence, « Le menu suit votre choix en une minute », les horaires structurés avec un texte libre en repli, l'état « code posé / aucun code » dit en clair, le paiement en ligne qui s'allume seul au retour de Stripe.

### 2.11 Terminaux (gérant)

**À quoi il sert.** Rattacher le boîtier Omilink, trouver et tester les imprimantes.

**Le geste d'une minute.** Ajouter le boîtier et voir sa première imprimante en ligne.

**Ce qui gêne.** Le nom de la page (voir 2.1) ; « Omilink », « boîtier », « n° 4F2A » et « 192.168.1.40:9100 » sont des mots d'installateur, pas de gérant ; l'ordre d'écran (boîtier puis imprimantes) est le bon, mais rien ne dit « étape 1 / étape 2 ». La page tourne toutes les 5 s : parfait.

**Déjà bon.** Les états vides disent exactement quoi faire (« Branchez-le au réseau du restaurant, puis ajoutez-le ici : il apparaît en quelques secondes ») ; les pastilles Connecté / Hors ligne / En attente ; « Rechercher des imprimantes » puis « Ajouter » sur ce qui est détecté ; « Tester » avec l'heure du test imprimé ; les confirmations de retrait disent ce qui se passe des tickets en attente.

### 2.12 Notifications

**À quoi il sert.** Abonner cet appareil, choisir les alertes, régler le carillon, lister ses appareils.

**Le geste d'une minute.** Activer les alertes sur ce téléphone.

**Ce qui gêne.** L'accès (une cloche qui promet un fil) ; sur iPhone, trois étapes d'installation à faire avant de pouvoir activer, sans possibilité d'y revenir d'un tap ; la page vit à part de Réglages alors que c'est un réglage « pour moi ».

**Déjà bon.** Tout le reste : « Envoyer un essai », les étapes iOS numérotées, les défauts par rôle (`ROLE_DEFAULT_PREFS`), « Vos choix valent pour tous vos appareils », le bandeau « Touchez l'écran pour activer le carillon » quand le navigateur bloque le son.

### 2.13 Produits (compte)

**À quoi il sert.** Voir son offre, son rôle et ses droits, activer le click & collect, demander un changement d'offre.

**Le geste d'une minute.** Savoir ce que j'ai le droit de faire.

**Ce qui gêne.** Le nom (un restaurateur lit « mes produits ») ; l'accès caché (surtitre) ; pour un serveur, la page est surtout une liste de puces de droits (« Marquer servie », « Encaisser ») utile mais isolée ; l'activation du click & collect passe par une case de CGV et un paragraphe de commission, correct juridiquement mais dense.

**Déjà bon.** « Ce que vous pouvez faire » en puces est la seule explication des rôles dans toute l'app : à réutiliser dans Équipe.

### 2.14 Soirées (Ominin Club)

**À quoi il sert.** Préparer et publier une soirée, régler les zones et prix, tenir la porte en direct, encaisser et faire entrer, la liste d'invités.

**Le geste d'une minute (gérant).** Créer une soirée (titre, jour, heures) et la publier. **(équipe)** Trouver un nom à la porte et faire entrer.

**Ce qui gêne.**
- L'éditeur a 5 onglets (Infos · Affiche & billets · Zones & prix · Tables gardées · Liste d'invités) et « Publier » n'apparaît qu'après un premier enregistrement ; « Brouillon », « Adresse de la page » (un slug), « Étiquette », « Billetterie », « Tables gardées » sont des mots d'organisateur, pas de patron de bar.
- La porte : le geste principal est un **glissé** vers la droite (avec vibration) et un menu « ⋯ » sans texte ; après une entrée avec encaissement, pas d'annulation sans rouvrir la fiche.
- La fiche d'une table enchaîne jusqu'à trois modales pour déplacer ou rembourser ; les actions secondaires sont sous le pli.
- « Soirées non activées… Écrivez-nous » sans lien.

**Déjà bon.** L'éditeur repart des heures de la dernière soirée, met toutes les zones en vente, génère l'adresse ; les erreurs sautent vers l'onglet fautif ; brouillon d'abord ; le bouton de la porte porte le montant exact (« Encaisser 120 € et faire entrer ») ; le tri « à encaisser d'abord » et le repère « Suivant » ; la liste d'invités en un tap ; les confirmations de remboursement disent « C'est définitif ».

### 2.15 Bulles (réservations)

**À quoi il sert.** Le tableau du soir des bulles réservées, créneau par créneau ; prise de réservation au téléphone ; réglages (prix, créneaux, bulles).

**Le geste d'une minute (accueil).** Voir qui arrive et cocher l'arrivée. **(gérant, premier jour)** Régler prix, créneaux, bulles.

**Ce qui gêne.** C'est le pire premier quart d'heure de toute la gestion : les réglages demandent **5 champs obligatoires vides** (prix, durée, min, max, jours à l'avance), puis des créneaux jour par jour, puis des bulles à nommer et à « mettre en service » une à une, avant que le tableau montre quoi que ce soit ; le bouton Enregistrer reste simplement désactivé sans message quand une valeur est hors bornes ; certains réglages s'enregistrent instantanément, d'autres avec OK, d'autres avec Enregistrer. « Bulle » n'est jamais défini ; la règle « confirmée dès que le minimum de places est payé » est en 12 px pâle.

**Déjà bon.** Le tableau coloré avec « Libre · réserver » ; les boutons qui portent montant et places ; le formulaire court avec « Tout se règle sur place » dit d'avance ; les états vides qui envoient vers les réglages.

### 2.16 Caisse (HubRise), Remise, Soirée live

Pages d'expert ou de geste unique, correctes pour leur rôle. **Caisse** est technique par nature (associer chaque article à un code de caisse) ; son seul besoin est d'être rangée sous « Plus de réglages › Caisse connectée » et d'ouvrir sur « N articles sans code » avec le filtre déjà posé. **Remise** (scan d'un code) est un écran plein, une action : bon. **Soirée live** : voir 2.14.

### 2.10 bis — Établissement, compté

Inventaire des composants (`etablissement/page.tsx` et les `*-settings.tsx`) pour un compte neuf en mode restaurant, rien de relié, 5 jours ouverts × 2 services :

| Panneau | Contrôles | Modèle d'enregistrement |
|---|---|---|
| Fiche (nom, slogan, adresse, téléphone, horaires structurés, horaires affichés, avis Google) | ≈ 44 dont 30 à 37 pour les seules heures | 1 bouton Enregistrer pour tout |
| Type de service | 2 cartes (+ 2 interrupteurs en fast food) | instantané |
| Catégories du menu | 3 cartes | instantané |
| Fermeture de la cuisine | 1 bouton, puis une modale de ≈ 15 contrôles | modale |
| Paiement à table | 4 à 6 | interrupteur instantané + 1 Enregistrer (minimum) |
| Caisse (HubRise) | 1, puis 4, puis 8 dépliés | liens texte + Enregistrer replié |
| Ventes de la caisse (Popina) | 2 | bouton |
| Tablette de salle | 2 | bouton |
| Code d'encaissement | 2 à 3 | bouton |
| Données et modèles | 1 case + 1 lien | instantané |
| Click & Collect | 2 | bouton |
| **Total** | **≈ 65 contrôles ; 90 à 100 une fois tout relié** | **8 modèles d'enregistrement différents sur une page** |

Un gérant ne peut pas savoir, panneau par panneau, s'il doit valider. C'est le symptôme d'une page qui a grandi par accrétion : chaque panneau est bon, l'ensemble ne l'est pas.

## 3. Recommandations transversales, classées

Classement par **impact sur un nouveau** (fort / moyen) puis **effort** (faible / moyen / fort). Chaque fiche donne les pages touchées et un « avant / après » en mots. Les numéros reprennent le tableau du § 0.

### 3.0 Ce que disent les voisins (benchmark, détail en annexe B)

- **Toast Now** (l'app téléphone du patron) : 3 à 4 onglets en bas, un accueil fait de quelques tuiles + des interrupteurs d'exploitation (couper la vente à emporter), et des cartes qui n'apparaissent que si le rôle y a droit. Le rôle, c'est la visibilité des cartes, pas une autre app.
- **Lightspeed K-Series** (refonte d'octobre 2025) : 13 sections, une recherche ⌘K, et surtout un **« Setup guide » en en-tête qui suit l'avancement et disparaît à la mise en service** ; l'assistant commence par un profil d'établissement (fast casual, café, bar, gastronomique) qui pré-règle les fonctions.
- **Square for Restaurants** : trois niveaux de droits nommés (Standard / Enhanced / Full) avant toute case à cocher ; un code partagé vs personnel expliqué par sa conséquence.
- **Zenchef** : l'accueil salle est un fil horodaté de ce qui vient d'arriver, pas un tableau de chiffres.
- **SumUp / Tiller, Popina, Zelty, L'Addition** : onboarding humain, pas de premier parcours publié ; SumUp nomme ses réglages par la tâche (« Comment ajouter une imprimante ? ») et documente l'installation du back-office sur l'écran d'accueil de l'iPhone.
- **NN/g** : les tutoriels de lancement « interrompent, n'améliorent pas la tâche et s'oublient vite » ; un benchmark Userpilot 2024 (non vérifié à la source) donne ~19 % d'achèvement moyen des listes de mise en route et ~15 % pour les visites : **le produit doit marcher pour ceux qui ignorent les deux**. Personnalisation : « options courantes d'abord, avancées ensuite, le reste jamais ». Cibles tactiles ≥ 1 cm, ≈ 2 cm pour un geste fait en marchant.

Ominin est déjà plus proche de Toast que des incumbents français sur un point : l'accueil par rôle existe. Ce qui manque, c'est le « setup guide », le « Plus » et des noms de tâches.

### 3.1 Navigation par rôle : 4 onglets + « Plus » — impact fort, effort moyen

**Pages.** `shell.tsx` (NAV_ITEMS, PRODUITS_ITEM, sidebarOnly), toutes les pages par ricochet, `visites.ts` (étape « nav »).

**Avant.** Jusqu'à 8 onglets en bas sur téléphone, 13 à gauche sur ordinateur ; Produits via le surtitre ; Fidélité via Établissement ; Notifications via la cloche ; déconnexion dans l'en-tête.

**Après.** Une barre de **quatre places fixes + « Plus »**, composée par rôle et par mode :

| Rôle · mode | 1 | 2 | 3 | 4 | Plus (feuille) |
|---|---|---|---|---|---|
| Gérant · restaurant | Aperçu | Commandes | Tables | Carte | Paiements · Équipe · Réservations · Fidélité · Réglages · Alertes · Abonnement · Se déconnecter |
| Gérant · fast food | Aperçu | Commandes | Carte | Paiements | Équipe · Fidélité · Réglages · Alertes · Abonnement · Scanner |
| Gérant · boutique à emporter | Aperçu | Retraits | Carte | Paiements | Équipe · Réglages · Alertes · Abonnement |
| Gérant · club | Soirées | (plan du soir de ce soir, s'il y en a un) | Paiements | Équipe | Réglages · Alertes · Abonnement |
| Serveur | Commandes | Tables | Pointage | Carte | Alertes · Mon compte · Se déconnecter |
| Cuisinier | Cuisine (= épuisés + fermetures) | Commandes | Pointage | — | Alertes · Mon compte |
| Comptoir (boutique) | Retraits | Commandes | Pointage | Carte | Alertes |

La feuille « Plus » est un **bottom sheet** (le langage de feuilles qu'Ominin a déjà) avec les entrées en deux groupes : *Pendant le service* et *Régler*. Sur ordinateur, la barre latérale garde tout, mais **groupée** sous deux surtitres (Service / Gérer), ce qui remplace l'étape de visite « Vos onglets ». La pastille de Retraits remonte sur « Plus » quand Retraits y est.

**Pourquoi c'est le premier levier.** Un nouveau cherche *sa* page ; à 4 choix il la trouve sans lire. Toast Now tient en 3 ou 4 onglets. Et c'est ce qui permet de supprimer trois accès cachés d'un coup.

### 3.2 Les mots du métier — impact fort, effort faible

**Pages.** Shell, titres de page, `constants.ts` (VIEWS, labels), `visites.ts`, les sous-titres.

| Aujourd'hui | Proposé | Pourquoi |
|---|---|---|
| Aperçu | **Aperçu** (gardé, décision d'Ambaka) | Le sous-titre devient la date + « votre journée ». |
| Menu | **Carte** | « Menu » est aussi le mot des formules (« menu du midi ») et de la navigation. Les restaurateurs disent « la carte ». (La visite dit déjà « votre carte ».) |
| Terminaux | **Imprimantes** | Un « terminal », pour un restaurateur, c'est le TPE. La page gère des imprimantes de cuisine et leur boîtier. |
| Produits | **Abonnement** (ou « Mon offre ») | « Produits » se lit « mes plats ». |
| Bulles | **Réservations** | C'est déjà le libellé dans `VIEWS`. « Bulles » reste le mot du BOHO sur *sa* page client, pas dans la navigation. |
| Établissement | **Réglages** | Le mot que tout le monde cherche ; « Établissement » devient la première section à l'intérieur. |
| Badgeage / Badgeages | **Pointage** partout | Un seul mot, le plus courant en restauration. (« Badgeuse » peut rester sur l'écran lui-même.) |
| Notifications (la cloche) | **Alertes** | Et ce sont des réglages : voir 3.10. |
| Paliers (Fidélité) | **Récompenses** | « Palier » est le mot du code, « récompense » celui du client. |
| Affiche (Formules) | **Visuel des formules** ou **Bannière** | « Affiche » évoque le poster de concert. |
| Détail (fiche article) | **Format** (ex. 33 cl, 6 parts) | Le hint le dit déjà. |
| Accord suggéré | **Suggestion** (« Idéal avec… ») | « Accord » est un mot de sommelier. |
| Le combo parfait (Aperçu) | **Suggestions vendues** | Et une infobulle « ce que les suggestions du menu ont fait commander ». |
| Encaisseur (Paiement) | **Compte de paiement** | « Encaisseur » n'existe pas dans le vocabulaire courant. |
| Plage (horaires, fermetures) | **Créneau** ou **horaire** | « Plage » revient partout ; « de … à … » suffit souvent. |
| Boîtier Omilink | **Boîtier d'impression (Omilink)** la première fois, puis « boîtier » | Nommer la fonction avant la marque. |
| Marquer prête / Remettre | garder | Ce sont déjà les bons mots. |

Règle à inscrire dans `OMININ-SYSTEM.md` (section « Voix ») : **nommer par le résultat pour le restaurateur, jamais par le mécanisme** ; niveau de français B1 ; un seul mot par concept dans toute l'app (un glossaire : annexe A).

### 3.3 Une liste de mise en route à la place de la visite d'accueil — impact fort, effort moyen

**Pages.** Aperçu (gérant), `visites.ts` (« bienvenue »), `stripe-prompt.tsx`.

**Avant.** Après le paiement, le gérant arrive sur un Aperçu à zéro, et une visite de 8 cartes lui explique où sont les onglets. Le Stripe prompt est un bandeau à part. Rien ne reste à l'écran après la visite.

**Après.** En tête de l'Aperçu, tant que tout n'est pas fait, une carte **« Avant votre premier service »** avec 4 à 6 étapes, chacune **un lien direct** et **cochée d'elle-même** quand la donnée existe (comme le fait déjà `visiteFor` pour sauter une étape sans cible) :

1. Créer ma carte (≥ 1 catégorie et ≥ 1 article) → Carte
2. Vérifier mon menu côté client → ouvre le lien client (et marque fait au premier clic)
3. Relier mon compte de paiement → Réglages › Encaissement (ou Stripe directement)
4. Inviter mon équipe → Équipe (coché si ≥ 1 membre ou fiche)
5. Recevoir les commandes sur ce téléphone → Alertes (coché si l'appareil est abonné)
6. (fast food / boutique) Vérifier mes horaires → Réglages (coché si des horaires existent)

Une barre « 2 sur 6 », un lien « Masquer » qui la replie dans « Plus » sous « Mise en route », et elle disparaît seule une fois tout fait. Le modèle est le *Setup guide* de Lightspeed et les cartes de Toast Now. Les étapes à action de la visite actuelle (« Relier Stripe », « Créer une catégorie ») y trouvent leur place naturelle ; les étapes qui expliquaient disparaissent. La première carte de bienvenue peut rester, **une seule**, avec le nom du restaurant et le bouton « Commencer par ma carte ».

**Et les visites par page ?** Les garder uniquement là où le geste n'est pas devinable (le scan au bar, la fermeture d'un geste), en 1 à 3 étapes à action, relançables par le « ? ». Pour le reste, l'écran se suffit (3.6 à 3.9). Et ouvrir le « ? » aussi aux employés : aujourd'hui un serveur n'a droit à rien.

### 3.4 Réglages en quatre sections courtes + « Plus de réglages » — impact fort, effort moyen

**Pages.** Établissement, Caisse, Notifications, Fidélité (lien mobile), Terminaux (rattaché).

**Avant.** 11 panneaux, 65 à 100 contrôles, 8 façons d'enregistrer, un sous-titre faux.

**Après.** `Réglages` devient un **sommaire** (une liste de sections, comme les Réglages d'iOS), chaque section une page courte avec **un seul modèle d'enregistrement** (enregistrement instantané avec toast partout, sauf la fiche qui garde un bouton) :

| Section | Contenu | Visible dès le premier jour |
|---|---|---|
| **Mon établissement** | nom, slogan, adresse, téléphone, horaires, avis Google | oui |
| **Mon service** | type de service, fermetures programmées, présentation des catégories, click & collect (capacité, minimum) | oui |
| **Encaissement** | paiement en ligne (compte, interrupteur, minimum), code d'encaissement | oui |
| **Appareils** | imprimantes et boîtier (ex-Terminaux), tablette de salle (code), alertes de *cet* appareil | oui |
| **Plus de réglages** (replié) | caisse connectée (HubRise), ventes de la caisse (Popina), carte ↔ caisse, données et modèles, abonnement | repliés, un bandeau d'alerte remonte seul si une connexion est bloquée ou si des commandes ne sont pas transmises |

Trois décisions de détail :
- **Les horaires** sont 40 à 60 % des contrôles : proposer « Mêmes horaires du lundi au vendredi » + exceptions, avec « Copier sur tous les jours ». Supprimer le champ « Horaires affichés sur la carte » du premier niveau (il va dans « Plus »).
- **Fermeture de la cuisine** garde sa modale, mais son état vide propose directement « Cuisine, Entrées et Plats, chaque soir à 22 h » en un bouton « Créer cette fermeture » (l'exemple existe déjà en texte).
- **Les renvois croisés en prose** (« réglée dans “Paiement à table” ») deviennent des liens vers la section.

### 3.5 L'écran de la cuisine est le geste « épuisé » — impact fort, effort faible

**Pages.** `cuisinier-apercu.tsx`, Menu (`menu-item-card.tsx`), Commandes (cartes en lecture seule).

**Avant.** L'accueil cuisine montre une horloge et « À remettre en vente » ; pour marquer un plat épuisé, il faut aller dans Menu, trouver la catégorie, la carte, l'interrupteur.

**Après.** L'accueil cuisinier s'appelle **Cuisine** et contient, dans l'ordre : la barre de fermetures (Fermer / Rouvrir, déjà existante), puis **la carte en liste compacte avec un interrupteur « En vente » par plat**, groupée par catégorie, recherche en haut, les épuisés remontés en tête. Un plat épuisé peut annoncer « de retour demain » (remise en vente automatique à l'heure de bascule de la journée) : c'est le « 86 » des cuisines. Le même composant sert au serveur depuis Commandes (il a déjà le droit `menu.availability` dans certains réglages) et au gérant depuis Aujourd'hui (« À remettre en vente » devient ce composant filtré).

Pourquoi fort : c'est le geste de cuisine le plus fréquent et il a aujourd'hui la pire distance.

### 3.6 La fiche article en deux temps — impact moyen, effort faible

**Pages.** `item-form-modal.tsx`, Menu.

**Avant.** 13 champs, 2 obligatoires, une modale à faire défiler ; « Allergènes » et ses 15 puces au milieu.

**Après.** **Créer** = Nom, Prix, Catégorie (pré-remplie), Photo. Enregistrer ferme. En dessous, un bouton texte **« Ajouter des détails »** qui déplie, en groupes nommés : *Sur le menu* (description, format, badges, suggestion), *Allergènes*, *Options et variantes*, *En cuisine* (nom sur le ticket, imprimante, stock, TVA), *À emporter* (délai). À la modification, les groupes qui ont une valeur sont dépliés. Le champ « Nom sur le ticket » et « TVA » gardent leurs défauts (nom, 10 %) : rien à toucher le premier jour.

Et un geste de saisie rapide pour la première carte : **« Ajouter plusieurs articles »** = une ligne par plat « Nom — prix », qui crée les articles d'un coup (le gérant qui recopie une carte papier de 40 lignes). C'est le vrai « aha » de la carte : la voir apparaître sur son téléphone en cinq minutes.

### 3.7 Des catégories proposées à la première carte — impact moyen, effort faible

**Abandonné le 31 octobre (décision 6, § 7) : les restaurants définissent leurs catégories.** Conservé ci-dessous pour mémoire ; seule la mise du bouton « + Ajouter un article » dans l'état vide « Catégorie vide » et l'apparence de champ de la note de catégorie restent à faire.

**Pages.** Menu (état vide), `category-manager.tsx`, visite « menu-vide ».

**Avant.** « Aucune catégorie — Créez une première catégorie », puis « Catégorie vide » sans bouton.

**Après.** L'état vide propose **« Commencer avec : Entrées · Plats · Desserts · Boissons »** (bouton « Créer ces 4 catégories ») et, en dessous, « ou créer ma propre catégorie ». En fast food : Burgers · Accompagnements · Desserts · Boissons. En boutique : Pâtisseries · Pains · Boissons. L'état « Catégorie vide » porte le bouton « + Ajouter un article » dans l'état vide lui-même, et la note de catégorie prend l'apparence d'un champ (bordure, libellé « Note de catégorie, affichée sous son nom »).

### 3.8 L'accueil du serveur montre le geste — impact moyen, effort faible

**Pages.** Commandes (`page.tsx`, `create-order-fab.tsx`), Retraits.

**Avant.** Un serveur invité arrive sur « Aucune commande » ; un + rond sans texte en bas à droite ; aucune visite pour lui ; le modèle « encaisser fait partir en cuisine » n'est écrit que sur la carte.

**Après.**
- L'état vide de « À encaisser » dit la règle de ce restaurant : « Les commandes arrivent ici dès qu'un client commande depuis sa table. **Encaissez-la : elle part en cuisine.** » (ou, pour un restaurant qui sert avant d'encaisser, la phrase inverse, dérivée de `orderTabs`). Il porte le bouton **« Nouvelle commande »**.
- Le bouton flottant garde son + mais **avec son libellé** (« Nouvelle commande ») tant qu'aucune commande n'a été saisie sur cet appareil, puis se replie en rond. Même mot que sur Retraits.
- Un sous-titre d'onglet explique chaque étape en une ligne au premier passage (le texte existe : `ORDER_TAB_HINTS`), à la place de la visite « commandes-etapes ».
- Première commande d'un nouveau restaurant : un bouton « Voir une commande d'exemple » qui affiche une carte factice « Table 0 » non enregistrée, pour toucher Encaisser, Servi, Annuler sans risque (la démo de salle `salle-demo.tsx` existe déjà et peut servir).

### 3.9 Des erreurs qui disent quoi faire — impact moyen, effort faible

**Pages.** Toutes (89 occurrences de « Une erreur est survenue. »), `toast.tsx`, `store.ts`.

**Avant.** La quasi-totalité des échecs réseau ou de droits affichent « Une erreur est survenue. » sans suite ; les boutons Enregistrer désactivés ne disent pas pourquoi (bulles, fermetures, tarifs, fiche employé).

**Après.** Un seul point de conversion des erreurs (`describeError` dans `lib/gestion`) qui rend **trois familles** : *réseau* (« Hors connexion : vérifiez le réseau, puis réessayez » + bouton Réessayer), *droit* (« Réservé au gérant : demandez-lui de… »), *donnée* (le message métier de la RPC quand il existe, sinon « Impossible d'enregistrer. Rechargez la page et réessayez »). Les toasts d'erreur restent affichés jusqu'au tap (pas 3 s). Un bouton désactivé a toujours une phrase d'aide à côté (« Indiquez un prix pour enregistrer »). Les validations de formulaire se font **au champ**, pas au toast (les horaires d'ouverture ne se plaignent qu'au Enregistrer global).

### 3.10 Sortir les réglages d'alertes de la cloche — impact moyen, effort faible

**Pages.** Shell, Notifications.

**Avant.** La cloche ouvre une page de réglages.

**Après.** **Décision d'Ambaka (31 octobre) : la cloche est retirée** (option a). « Alertes » vit dans « Plus » et dans Réglages › Appareils ; le bandeau « Soyez prévenu des nouvelles commandes » sur Commandes et l'étape de la liste de mise en route restent les vrais points d'entrée. L'option (b), un fil des 20 derniers événements (commande reçue, appel serveur, boîtier tombé, paiement en ligne) sur le modèle Zenchef, reste notée pour plus tard si un gérant la réclame.

### 3.11 En-tête allégé — impact moyen, effort faible

**Pages.** Shell.

**Avant.** 7 icônes dont 4 muettes ; déconnexion à un tap.

**Après.** Sur téléphone : nom du restaurant, **« Voir mon menu »** (le seul geste fréquent de l'en-tête, avec son texte), le bouton Admin quand il existe, et le **« ? »**. Thème, Réglages, Alertes, Se déconnecter vont dans « Plus » (la déconnexion avec confirmation sur une tablette verrouillée). Sur ordinateur, l'en-tête peut garder la roue et le thème. Le bouton Admin verrouillé et déverrouillé a un cadenas ouvert / fermé et un libellé.

### 3.12 Les rôles expliqués là où on les choisit — impact moyen, effort faible

**Pages.** Équipe (invitation, fiche), email d'invitation (`invite-notify.ts`), Produits.

**Avant.** Un menu déroulant « Serveur / Cuisinier / Gérant » ; les descriptions existent (`ROLE_TAGLINES`, « Ce que vous pouvez faire ») mais sur une autre page. L'email d'invitation ne nomme pas le rôle.

**Après.** Le choix du rôle devient **trois cartes** (comme le type de service) avec la phrase de chaque rôle et ses 3 gestes principaux ; la liste des membres passe **avant** le formulaire, qui devient un bouton « Inviter » ouvrant une feuille ; l'email dit « {Restaurant} vous invite comme **serveur** : vous y encaisserez et servirez les tables depuis la tablette de la salle ». Le mode « sans comptes » s'annonce en tête de l'onglet (« Votre équipe pointe avec un code, sans compte ») au lieu d'être implicite.

### 3.13 Soirées et Réservations : des défauts et un premier pas — impact moyen (clubs et BOHO seulement), effort moyen

**Pages.** `event-editor.tsx`, `door-list.tsx`, `bulles/settings.tsx`, `bulles/board.tsx`, `club-states.tsx`.

- **Soirées.** « Publier » visible dès la création (grisé avec « Enregistrez d'abord » si besoin) ; les onglets 2 à 5 regroupés sous « Options de la soirée » après Infos ; « Adresse de la page » cachée derrière « Modifier l'adresse » puisqu'elle est générée ; à la porte, le glissé reste mais **un bouton « Faire entrer »** existe toujours à côté (le glissé est un raccourci, pas le geste), et une entrée encaissée a un « Annuler » dans le toast comme l'entrée gratuite. « Soirées non activées » porte un lien mailto.
- **Réservations (bulles).** Les réglages proposent des **valeurs par défaut** (prix, 90 min, 2 à 6 personnes, 30 jours) et un bouton « Créneaux du BOHO : jeudi à samedi, 20 h – 2 h » ; les bulles sont créées **en service** avec un nom proposé (« Bulle 1 ») ; un seul modèle d'enregistrement ; le bouton désactivé dit pourquoi ; la règle « confirmée dès que le minimum est payé » passe dans la fiche en texte normal.

### 3.14 Petites choses à faible effort, à glisser dans la refonte

- Les icônes seules (crayon, corbeille, flèches, ⋯, ×) gardent leur aria-label mais prennent un **menu ⋯ avec libellés** sur mobile (Modifier · Déplacer · Supprimer) ; NN/g : les cibles se touchent en marchant.
- Les champs « enregistrés au blur » (note de catégorie, renommage, stock) montrent un état « Enregistré ✓ » 1 s.
- « Réservé au gérant » (7 écrans) devient un seul composant avec le **nom du gérant** et un bouton « Lui écrire » quand l'email est connu.
- Les tuiles d'Aujourd'hui gagnent leur repère (la maquette v2 le fait) et **« CA du jour » mène à Paiements**, pas à Commandes.
- « Voir plus » (historique, paiements) devient un chargement à l'approche du bas.
- Les toasts de succès qui portent une conséquence (« Addition réglée, la commande part en cuisine ») sont le bon modèle : l'étendre aux gestes de Retraits et de Soirées.
- Le bandeau « Touchez l'écran pour activer le carillon » est excellent : le garder tel quel.

## 4. Cinq scénarios « dix premières minutes »

Chaque scénario est joué deux fois : **aujourd'hui** (d'après le code) et **demain** (avec les recommandations 3.1 à 3.13). Les temps sont des estimations de lecture, pas des mesures.

### 4.1 Nouveau gérant, restaurant Connect, samedi 11 h, téléphone

**Aujourd'hui.**
1. Composer (5 à 11 questions) → « Créer mon compte et commander » → inscription (email, mot de passe) → onboarding (nom, adresse du menu, offre, tables, CGV) → Stripe Checkout (Cachets, livraison) → retour « Paiement reçu · Activation en cours… » (dépend du webhook, sans délai ni secours).
2. Aperçu à zéro ; visite de 8 cartes : « Bienvenue », « Relier Stripe » (action), « Votre journée en direct », « Vos onglets », « Votre menu côté client », « Vos réglages », « Besoin d'un rappel ? » → « Créer mon menu ».
3. Menu : « Aucune catégorie » → Créer une catégorie → modale Catégories → tape « Entrées » → Ajouter → ferme → « Catégorie vide » → cherche le bouton en haut → « + Ajouter un article » → 13 champs → Enregistrer. Répète 30 fois. Abandonne à la 8e pour revenir au service.
4. Ne relie pas Stripe (le bandeau a été fermé d'une croix). Ne sait pas qu'il doit activer les notifications. N'a pas vu Établissement.
**Temps : 10 min pour 8 plats ; paiement et alertes non faits.**

**Demain.**
1. Même tunnel jusqu'au retour Stripe ; l'écran d'activation a un délai (« Si rien ne se passe après 2 minutes, écrivez-nous ») et un bouton « Actualiser ».
2. Aujourd'hui : une carte « Avant votre premier service · 0 sur 5 » ; première étape « Créer ma carte » → Carte.
3. Carte : « Commencer avec Entrées · Plats · Desserts · Boissons » → un tap → « Ajouter plusieurs articles » → il tape « Burrata — 12 / Pizza Diavola — 14 / … » 20 lignes → Enregistrer → 20 plats dans Plats → il déplace 4 lignes vers Entrées par le menu ⋯ → étape cochée.
4. Retour Aujourd'hui : « 1 sur 5 », étape « Vérifier mon menu côté client » → il ouvre le menu sur son téléphone, voit sa carte → coché. Étape « Relier mon compte de paiement » → il lance Stripe (à finir plus tard, l'étape reste ouverte). Étape « Recevoir les commandes sur ce téléphone » → Alertes → Activer → coché.
**Temps : 10 min pour 20 plats, menu vérifié, alertes actives, Stripe lancé.**

### 4.2 Nouveau serveur, invité par email, mardi 18 h 45, tablette de la salle

**Aujourd'hui.**
1. Email « {Restaurant} vous invite à rejoindre son équipe » (sans dire le rôle) → lien → « Choisissez votre mot de passe » (nom, mot de passe ×2) → /gestion.
2. Arrive sur Commandes (bon), « Aucune commande », un + rond en bas à droite, des onglets « À encaisser · À servir · Historique ». Aucune visite (réservée au gérant). Une commande QR arrive : carte « Table 4 · 12:43 · Part en cuisine une fois encaissée · 38 € » avec des cases par article et « Tout encaisser ». Il hésite : le client n'a pas fini de manger. Il laisse. Le ticket ne sort pas en cuisine. Le cuisinier demande.
3. Il cherche Paiements dans la barre (absent, c'est normal) ; touche « Ominin Connect · Serveur » par curiosité, atterrit sur Produits, lit « Ce que vous pouvez faire » (utile, mais trouvé par hasard).
**Temps : 10 min, une commande bloquée faute de comprendre la règle d'encaissement.**

**Demain.**
1. Email : « vous invite comme **serveur** : vous encaisserez et servirez les tables depuis la tablette ». Même acceptation.
2. Commandes : l'état vide dit « Les commandes arrivent ici dès qu'un client commande depuis sa table. **Encaissez-la : elle part en cuisine.** » et le bouton « Nouvelle commande » est écrit. Un lien « Voir une commande d'exemple » lui montre une carte Table 0 : il touche « Tout encaisser », voit la feuille Espèces / Carte, comprend.
3. La vraie commande arrive avec son carillon ; il encaisse en carte ; le toast dit « Addition réglée, la commande part en cuisine ». Barre : Commandes · Tables · Pointage · Carte · Plus.
**Temps : 3 min pour être opérationnel.**

### 4.3 Cuisinier, premier service, écran de la cuisine

**Aujourd'hui.** Arrive sur « La cuisine · Service en direct · les commandes sortent sur l'imprimante », une horloge, « Toute la carte est en vente », et la note « Un article épuisé se retire depuis l'onglet Menu ». Plus de saumon : il va dans Menu, onglets de catégories, trouve Poissons, la carte, l'interrupteur « En vente » → « Retiré ». Trois écrans et 6 taps, pendant le coup de feu. La barre de fermeture, elle, est sur Commandes.

**Demain.** L'onglet s'appelle **Cuisine** : en haut « Cuisine · en service · Fermer », en dessous la carte en liste avec recherche et un interrupteur par plat. « Saumon » → interrupteur → « Épuisé jusqu'à demain ». 2 taps, un écran. L'onglet Commandes lui montre la file « À servir » en lecture seule avec une ligne « Vous voyez ce que la salle doit apporter ; vos tickets sortent sur l'imprimante ».

### 4.4 Boutique à emporter (Collect seul), gérant puis comptoir

**Aujourd'hui.** Le gérant arrive sur Aperçu ; l'équipe, sur Retraits. Retraits : bandeau « 3 nouvelles commandes du site à prendre en charge », bande des jours, « Autre jour », titre, onglets Retraits / À produire, 4 tuiles gérant, puis les cartes. Le comptoir touche « Prendre en charge » → choisit un délai → « Prête » → « Encaisser et remettre » → Espèces / Carte. C'est déjà fluide. Les frictions : la première carte est au 3e écran sur téléphone ; les rôles s'appellent « Comptoir » et « Préparation » sur Produits mais l'onglet dit « Badgeage » ; « Commandes » existe encore à côté de Retraits sans qu'on sache ce qui s'y trouve (« En cours » = les commandes du jour payées en ligne).

**Demain.** Barre : Retraits · Commandes · Pointage · Carte · Plus. Sur Retraits, les 4 tuiles du gérant deviennent une ligne « 12 retraits · 486 € · 3 à remettre » avec une infobulle, et le bandeau des nouvelles commandes est la première carte elle-même (bord accentué, déjà le cas) : la première commande à traiter est au premier écran. L'onglet Commandes s'appelle « Du jour » avec un sous-titre « Les commandes payées en ligne pour aujourd'hui ».

### 4.5 Club (Ominin Club), gérant le mercredi, porte le samedi

**Aujourd'hui.** Le gérant arrive sur Soirées (bon), « Aucune soirée à venir · Nouvelle soirée » → éditeur à 5 onglets : Infos (7 champs), Affiche & billets, Zones & prix, Tables gardées, Liste d'invités → « Créer la soirée » → puis seulement « Publier ». Il ne voit pas « Publier » avant d'avoir enregistré et croit avoir fini : la soirée reste en brouillon. Samedi, le physio sur son téléphone : plan, Porte, Invités ; à la Porte, il doit deviner le glissé (un indice une fois) ; après avoir encaissé et fait entrer la mauvaise table, pas d'annulation sans rouvrir la fiche.

**Demain.** L'éditeur ouvre sur Infos avec 4 champs (titre, jour, ouverture, fermeture), un bouton **« Créer et publier »** et « Créer en brouillon » ; les zones sont déjà toutes en vente au prix par défaut (déjà le cas) ; « Options » regroupe affiche, billetterie, tables gardées, liste d'invités. À la porte, chaque ligne a « Faire entrer » écrit, le glissé reste un raccourci, et chaque entrée a « Annuler » dans son toast.

## 5. Questions ouvertes pour Ambaka

Les décisions que ce document ne peut pas prendre seul :

1. **Les noms.** Valider ou refuser chaque renommage du § 3.2 : *Aujourd'hui*, *Carte*, *Imprimantes*, *Abonnement*, *Réservations*, *Réglages*, *Pointage*, *Alertes*, *Récompenses*. Le renommage de « Menu » en « Carte » touche aussi le vocabulaire marketing (« Menu QR », « menu.ominin.com ») : à trancher globalement ou pas du tout.
2. **« Plus » sur mobile, 4 places fixes.** Accepter de retirer Paiements et Équipe de la barre du gérant restaurant au profit de Tables et Carte ? (Alternative : Paiements en 4e place et Carte dans Plus.) Et quelles 4 places par mode (tableau 3.1) ?
3. **La visite d'accueil.** La remplacer par la liste de mise en route, ou garder les deux (visite d'une carte + liste) ? Et ouvrir le « ? » aux employés ?
4. **Le modèle d'encaissement par défaut.** « Encaisser fait partir en cuisine » est la règle de Connect (le serveur l'ignore). Doit-elle rester le défaut pour un nouveau restaurant, ou le type de service doit-il demander « Vos clients paient : à la commande / après le repas » et régler `orderTabs` en conséquence ?
5. **Réglages en sections.** Valider le découpage en 4 sections + « Plus de réglages », et la liste de ce qui va dans « Plus » (HubRise, Popina, carte ↔ caisse, données et modèles, abonnement). Les codes (tablette, encaissement) restent-ils dans « Appareils » et « Encaissement », ou dans une section « Sécurité » ?
6. ~~**La cloche.**~~ Tranché le 31 octobre : retirée (3.10).
7. **Les catégories proposées.** Entrées · Plats · Desserts · Boissons par défaut, en un tap ? Et la saisie « plusieurs articles » (nom — prix par ligne) ?
8. **La cuisine.** Donner au cuisinier (et au serveur ?) la liste des plats avec interrupteur comme écran d'accueil, avec « de retour demain » ?
9. **Déconnexion.** La garder dans l'en-tête (comme aujourd'hui) ou la mettre dans « Plus » avec confirmation sur une tablette verrouillée ?
10. **Les employés sans visite.** Faut-il un premier pas pour eux (email qui nomme le rôle, état vide qui montre la règle, commande d'exemple), ou le gérant reste-t-il seul guide, comme chez Popina et Zelty ?
11. **Les soirées.** « Créer et publier » en un geste, et un bouton « Faire entrer » toujours visible à la porte ?
12. **Les formules.** Cinq questions propres au constructeur en § 6.7.
13. **Hors périmètre, mais vus en lisant** (à transmettre au bon chantier, pas à ce document) : il n'existe **aucune réinitialisation de mot de passe** dans l'app (`resetPasswordForEmail` absent ; un invité au lien expiré est bloqué) ; l'écran « Activation en cours… » n'a ni délai ni secours si le webhook Stripe n'arrive pas ; l'onboarding sans devis pose `offre = "digital"` par défaut (`onboarding-form.tsx:45`) alors que la liste n'affiche que Connect, ce qui peut créer un établissement sans offre nommée ; un membre d'équipe qui s'inscrit avec Google atterrit sur le formulaire propriétaire.

## 6. Zoom : le constructeur de formules

Ajouté le 31 octobre à la demande d'Ambaka : « c'est très compliqué, il faut simplifier beaucoup ». Fichiers lus : `formules/formule-form-modal.tsx`, `formules/etape-editor.tsx` (467 lignes), `formules/formule-card.tsx`, `formules/affiche-card.tsx`, `formules/affiche-form-modal.tsx`, `lib/gestion/formules.ts`, le modèle `Formule / Etape / Article` dans `types.ts`, et le côté client `components/menu/formules.tsx` (941 lignes) et `formules-pill.tsx`.

### 6.1 Ce que le gérant doit faire aujourd'hui

Objectif type : « Formule midi, 16 €, entrée + plat + dessert, du lundi au vendredi le midi ».

1. Menu › onglet Formules › « + Nouvelle formule ».
2. Modale : Nom, Prix. Sous « Étapes », trois puces « Partir d'un modèle : Entrée + Plat · Plat + Dessert · Entrée + Plat + Dessert » (visibles seulement tant que rien n'a été touché). Un tap sur la troisième crée trois **boîtes d'étape** ; chaque boîte a : un champ « Nom de l'étape », un interrupteur **Obligatoire**, deux flèches, une croix ; puis, si la catégorie a été reconnue par son nom, un encart « Toute la catégorie “Entrées” · 8 articles » avec sa propre croix, une note (« Un article ajouté plus tard à cette catégorie entre aussi dans la formule ») et un repli « Retirer un article ou ajouter un supplément » qui déplie **une case + un champ prix par article** ; puis un `<select>` « + Ajouter depuis la carte… » qui mélange « Toute la catégorie (N) » et chaque article, par optgroup.
3. Si la catégorie ne s'appelle pas « Entrées » (par exemple « Pour commencer »), l'étape reste vide : il faut ouvrir le select, trouver l'optgroup, choisir « Toute la catégorie ».
4. Pour un choix qui n'est pas sur la carte (« Café gourmand » seulement en formule), « + Ajouter depuis la carte » ne sert pas : on crée un **article hors carte** avec Nom du choix, champ +0,00, flèches, croix, et un repli « Détail ».
5. Description, interrupteur « Disponible sur le menu client », puis un repli « Proposée tous les jours, toute la journée » qui ouvre 7 cases de jours et le bloc Heures (Toute la journée / de … à …).
6. Enregistrer. Rien n'est désactivé : les erreurs sont des bordures rouges sans phrase.

**Compte.** Pour une formule à trois étapes sur catégories : 3 × (champ + interrupteur + 2 flèches + croix + encart avec croix + select) = **24 contrôles visibles**, 6 replis, et jusqu'à **3 × 2 × N** contrôles de plus (case + prix par article) dès qu'on ouvre « Retirer un article ou ajouter un supplément ». Une formule à 3 étapes de 8 articles chacune expose donc jusqu'à 72 contrôles dans une modale qui défile. Le tout sur un téléphone, dans une modale qui n'a pas de « Suivant ».

**Et le second objet.** L'onglet Formules porte aussi **l'affiche** : une image qui « présente vos offres côte à côte », avec un « Nombre d'offres sur l'affiche » ; chaque emplacement (« Offre 1 », « Offre 2 ») reçoit ensuite une formule créée depuis lui ou « placée » par un select. Une formule est donc **soit** sur une affiche **soit** « sans affiche · en tuiles ». Deux objets, trois chemins de création, un vocabulaire (affiche, emplacement, offre, tuile) que seul le BOHO connaît.

### 6.2 Pourquoi c'est compliqué (le diagnostic, pas la liste)

1. **Deux modèles de données dans une seule boîte.** Une étape est *ou bien* « toute une catégorie, moins des exclusions, plus des suppléments », *ou bien* une liste d'articles choisis un par un (de la carte ou hors carte). L'éditeur montre les deux à la fois, dans la même boîte, avec deux sortes de croix. Le gérant ne sait jamais dans quel mode il est.
2. **L'ordre des décisions est inversé.** On demande d'abord de nommer et paramétrer l'étape (nom, obligatoire, position) avant de dire ce qu'elle contient. Un restaurateur pense « entrée au choix parmi mes entrées », pas « étape 1, obligatoire, nom, puis contenu ».
3. **Tout est au même niveau.** Le supplément par article (rare), l'exclusion d'un article (rare), le choix hors carte (rare), « Obligatoire » (presque toujours vrai), le « Détail » d'un choix (quasi jamais) ont la même place que « quelles entrées ? » (toujours).
4. **Les modèles dépendent du nom des catégories.** `modeleEtapes` cherche « entrée », « plat », « dessert » par regex ; une carte qui dit « Pour commencer / Nos assiettes / Douceurs » a des étapes vides et le gérant ne comprend pas pourquoi le modèle « n'a rien fait ».
5. **Aucun aperçu.** Le gérant ne voit pas ce que le client verra (une feuille avec « Entrée · 8 choix », « Plat · 12 choix »…), alors que `formules.tsx` sait le rendre.
6. **Le `<select>` comme bouton d'ajout** cache le geste principal derrière un menu natif, lent au doigt (NN/g sur les listes déroulantes), et mélange deux natures d'entrée.
7. **L'affiche** double le concept : la plupart des restaurants ont zéro affiche et une ou deux formules ; pour eux, l'onglet commence par une explication de l'affiche et deux boutons de création.
8. **Les validations sont muettes** (bordure rouge) et le modal n'a pas d'étapes : sur téléphone, l'erreur est hors écran.

### 6.3 Ce qu'on garde

Le **modèle de données** est bon et doit rester : une étape = une catégorie vivante (un plat ajouté plus tard entre dans la formule), avec exclusions et suppléments ; ou une liste fermée ; les options du plat suivent la carte ; l'étape facultative existe ; jours et heures sur la formule ; `openFormule` retire les plats fermés. Le côté client est bon aussi (une étape, un choix, les options du plat ensuite, une ligne au panier). Ce qui change est **l'ordre et la surface** de l'éditeur, pas ce qu'il produit.

### 6.4 La proposition : trois écrans, trois questions

Le constructeur devient une **feuille en trois pas** (bottom sheet pleine hauteur sur téléphone, modale à trois volets sur ordinateur), avec un bouton « Suivant » et un aperçu client permanent en bas.

**Pas 1 — « Quelle formule ? »**
- Nom (ex. « Formule midi »), Prix.
- Trois modèles en grandes cartes : **Entrée + Plat**, **Plat + Dessert**, **Entrée + Plat + Dessert**, plus **« Je compose »**. Chaque modèle affiche sous lui ce qu'il a trouvé : « Entrées (8) · Plats (12) · Desserts (6) ». Si une catégorie manque, la carte reste cliquable et le pas 2 demandera de la choisir.
- Rien d'autre sur cet écran. (Description, disponibilité, affiche : plus tard ou jamais.)

**Pas 2 — « Le client choisit parmi quoi ? »**
- Une **liste d'étapes en lignes**, pas en boîtes : « 1 · Entrée → *Entrées, 8 choix* », « 2 · Plat → *Plats, 12 choix* ». Chaque ligne est un bouton qui ouvre la **feuille de l'étape**. Un bouton « + Ajouter un choix au client » en bas. L'ordre se règle par glisser-déposer (ou par le menu ⋯ › Monter / Descendre). Pas de champ nom, pas d'interrupteur, pas de croix sur la ligne.
- **Feuille de l'étape** (ouverte depuis une ligne) : en haut, **« Parmi : »** suivi de la liste des catégories en grandes puces (une seule sélectionnée) et d'une puce « Des plats précis… » ; en dessous, la liste des plats de la catégorie choisie, **tous cochés**, avec à droite de chacun un petit « + € » grisé. Décocher retire le plat ; toucher « + € » ouvre un clavier pour le supplément. Sous la liste, deux lignes repliées : « Nom de l'étape pour le client » (pré-rempli du nom de la catégorie, modifiable) et « Le client peut passer cette étape » (l'ancien « Obligatoire », inversé pour être lu dans le sens ON). Tout en bas, « Ajouter un choix qui n'est pas sur la carte » (l'article hors carte, avec nom et supplément). Bouton « OK ».
- « Des plats précis… » bascule la même feuille en mode liste fermée : la liste de toute la carte, rien de coché, le gérant coche.
- Le gérant ne voit plus jamais « toute la catégorie » vs « article par article » : il voit des plats cochés, et la feuille sait si c'est une catégorie vivante (tous cochés, un plat retiré = exclusion) ou une liste fermée (choix dans toute la carte).

**Pas 3 — « Quand ? »**
- Trois cartes : **Toujours** (défaut), **Le midi en semaine** (lun–ven, heures de midi déduites des horaires d'ouverture, sinon 11 h 30 – 14 h 30), **Je choisis** (les 7 jours et de … à …, comme aujourd'hui). Une ligne « Formule disponible » (interrupteur, ON) et « Description » (repliée).
- « Enregistrer ». Le toast dit : « Formule midi ajoutée : vos clients la voient en tête du menu. »

**Aperçu permanent.** Sous les trois pas, une carte « Ce que voit le client » rendue par le même composant que le menu QR (`FormuleTile` + les étapes résumées « Entrée · 8 choix »), mise à jour en direct. C'est la meilleure explication possible de ce qu'est une étape : on la voit.

**Compte, après.** Pas 1 : 2 champs + 4 cartes. Pas 2 : 3 lignes + 1 bouton. Pas 3 : 3 cartes + 1 interrupteur. **Au plus 14 contrôles visibles pour la formule type, aucun repli nécessaire**, contre 24 à 72. Une formule « Entrée + Plat + Dessert » sur une carte bien nommée se fait en **4 taps + nom + prix**.

### 6.5 L'affiche devient une photo

- Une formule a une **photo facultative** (comme un article), montrée en tuile et dans la pastille « Formules ». C'est le cas courant (une photo du plateau du midi).
- Le cas BOHO (**une image qui présente plusieurs formules côte à côte**) reste possible, mais comme une option de l'onglet, pas comme un objet de première classe : « Afficher vos formules sur une seule image » → téléverser l'image → cocher les formules qu'elle présente, dans l'ordre → fini. Plus d'« emplacements », plus de « placer une formule existante », plus de « Formules sans affiche · en tuiles ». Le modèle de données actuel (`affiche: { id, rang }`) tient tel quel.
- L'onglet Formules ouvre sur **la liste des formules** (nom, prix, « Entrée · Plat · Dessert », badge « Lun–ven midi », interrupteur En vente) et un seul bouton « + Nouvelle formule ». L'affiche multi-formules est en bas, repliée, sous « Présentation ».

### 6.6 Ce que font les voisins

Recherche web du 31 octobre (17 recherches, pages officielles lues sauf mention) ; sources en annexe B.

| Produit | Objet | Une étape, c'est… | Prix | Quand ? | Ce qui simplifie / complique |
|---|---|---|---|---|---|
| **Square for Restaurants** (« Formule ») | un article de type Combo | « des articles **ou des catégories** » cochés, avec par article un supplément (+1 €) ou une remise, un nom d'affichage, un « nombre de sélections requises » et une **sélection par défaut** | prix fixe + suppléments | hors du constructeur (menus, canaux) | ≈ 8 étapes ; « cocher une catégorie » remplit une étape en un tap ; une sélection par défaut = formule ajoutée au panier sans rien choisir |
| **Toast** (prix fixe) | **aucun objet** : un article + un groupe de modificateurs par étape | des modificateurs, pas des plats (sauf à « créer des modificateurs depuis des articles ») | trois recettes concurrentes (prix sur l'article, prix sur chaque choix, remise combo) | ailleurs | le plus souple, le plus compliqué ; il faut nommer les groupes « Step 3 : Dessert choice » pour simuler des étapes, et régler le routage cuisine à part |
| **Lightspeed K-Series** (Combo) | un article Combo | des articles choisis un par un (pas de catégorie) dans un groupe avec « sélection obligatoire / facultative, minimum, maximum » | prix de base + suppléments par article | non (stock seulement) | un formulaire de 9 à 10 sections ; la grammaire obligatoire / facultatif + min / max est propre |
| **SumUp POS Pro** (ex-Tiller, « Formules ») | une formule | des « suites » (Entrée, Plat…) remplies de produits existants, **minimum 2 par suite** | prix fixe | non | le nom reste **barré tant qu'une suite est vide** : on peut enregistrer à moitié et revenir ; mais chaque ligne demande « direct » ou « suite 1 » (le timing cuisine) à la création |
| **Zelty** (« Menus », vu par le pont HubRise) | un deal | **une catégorie par étape** ; les produits « seulement en menu » vont dans une catégorie cachée | prix total | non | le modèle le plus proche d'Ominin (catégorie vivante par étape) ; écran non publié |
| **Innovorder** (« Étapes », extraits) | un produit + des étapes réutilisables | une étape créée une fois (type, min, max, choix) puis attachée à N produits avec un « Ordre » | prix du produit | non | une étape « Boisson » partagée entre toutes les formules ; mais deux endroits à éditer |
| **Uber Eats** (Menu Maker) | pas de combo : un article + des « personnalisations » | des articles existants réutilisés (`modifier_options` de type ITEM), min / max / quantité par défaut ; `bundled_items` pour ce qui est toujours inclus (les frites) | prix de l'article + surcharges | sur le **menu** (jours, heures), pas sur l'article | 4 étapes pour une personnalisation ; les heures vivent ailleurs, il faut créer un menu « Midi » pour une seule formule |
| **HubRise** (le modèle cible d'Ominin) | `deals[]` : nom, prix, `lines[]` | une ligne = un libellé + des SKU éligibles, chacun avec `extra_charge` ; `pricing_effect: fixed_price` | fixe par ligne, supplément par SKU | **sur le deal** : `restrictions {dow, start_time, end_time, start_date, end_date}` | une formule « Entrée + Plat + Dessert 19 €, lun–ven midi » se décrit entièrement ; le modèle Ominin s'y projette déjà 1:1 |
| L'Addition, Popina, Clover | non vérifiés (écrans non publiés) | — | — | — | — |

**Ce qu'il faut en retenir.**
1. **Un objet, un prix, N lignes** : tous les produits qui ont un vrai objet « formule » (Square, Lightspeed, SumUp, HubRise, Zelty) le modélisent ainsi ; Toast, qui n'en a pas, a besoin de trois recettes concurrentes. Le modèle d'Ominin est le bon.
2. **Une étape = une catégorie par défaut, des plats précis en dérogation** (Square, Zelty). C'est exactement la feuille d'étape proposée en 6.4.
3. **Le supplément est un « + 2 € » posé sur le plat, dans la ligne** (Square, Lightspeed, HubRise `extra_charge`) ; jamais une tarification par choix (anti-modèle Toast). Ominin le fait déjà.
4. **La grammaire de sélection tient en « obligatoire / facultatif, min, max »** (Lightspeed, Toast, Uber, HubRise). Défaut : obligatoire, 1 parmi N ; « facultatif » et « choisir 2 » n'apparaissent qu'au tap.
5. **Une sélection par défaut par ligne** (Square, HubRise `default: true`) permet d'ajouter un « menu du jour » au panier en un geste. Ominin ne l'a pas : c'est un ajout utile au pas 2 (« proposé d'office : Tiramisù »).
6. **Le quand appartient à la formule** (HubRise `restrictions`) : Uber et Square qui le mettent sur le menu forcent à créer un menu « Midi » pour une formule à 12 €. Garder les jours / heures sur la formule, comme aujourd'hui.
7. **Montrer l'inachevé sans bloquer** (SumUp barre le nom tant qu'une suite est vide, NN/g « quitter et reprendre »). La feuille en trois pas doit pouvoir s'enregistrer incomplète, avec un badge « À compléter » sur la liste.
8. **Ne jamais poser de question de cuisine dans le constructeur** (le « direct / suite 1 » de SumUp, le « Modifier Routing » de Toast) : l'ordre des lignes donne l'ordre de service, l'imprimante suit chaque plat.
9. **Deux niveaux de dévoilement au plus** (NN/g) : écran = nom, prix, lignes ; niveau 2 = la feuille d'étape ; rien en dessous.
10. **Une ligne à un seul plat sans alternative n'est pas un choix** (Uber `bundled_items`) : la rendre en texte (« + frites ») côté client plutôt qu'en sélecteur à une option.
11. **Des étapes réutilisables** (Innovorder) : « la Boisson de toutes mes formules » évite de recocher 12 boissons ; à peser contre le coût d'un second lieu d'édition (question 6.7.6).

### 6.6 bis Ce que le benchmark change à la proposition

- Au pas 2, la feuille d'étape gagne **« Proposé d'office »** (un plat coché comme choix par défaut, facultatif) et **« Le client choisit : 1 · 2 · 3 »** (le max, replié, défaut 1).
- La feuille en trois pas **s'enregistre incomplète** : la liste des formules montre « Formule midi · À compléter » barrée, non proposée au client tant qu'une étape obligatoire est vide (le `openFormule` actuel sait déjà retirer une formule dont une étape obligatoire est vide).
- Le pas 2 reconnaît une étape à un seul plat et l'affiche « Toujours inclus : frites » ; le client la lit, ne la choisit pas.
- Rien d'autre à changer : jours et heures restent sur la formule, le supplément reste sur le plat, le modèle de données reste.

### 6.7 Questions pour Ambaka sur les formules

1. Garder le cas « affiche multi-formules » (BOHO) comme option repliée, ou le retirer de l'interface et le réserver à Ominin (réglé en base pour les clients qui l'ont) ?
2. Le modèle « Le midi en semaine » peut-il déduire ses heures des horaires d'ouverture, ou préférer trois défauts fixes ?
3. « Le client peut passer cette étape » (facultatif) : l'exposer dans la feuille de l'étape, ou le réserver à « Je compose » ?
4. Le choix hors carte (« Café gourmand » seulement en formule) : le garder, ou pousser le gérant à créer l'article sur la carte (invisible seul) pour que tout vive au même endroit ? Le second simplifie l'éditeur et le ticket cuisine.
5. L'aperçu client en direct dans l'éditeur : à construire pour la refonte, ou dans un second temps ?
6. Des étapes réutilisables entre formules (modèle Innovorder : une « Boisson » partagée) : utile pour les fast foods à six formules, un second lieu d'édition pour les autres. Oui, non, ou plus tard ?
7. « Proposé d'office » (sélection par défaut, modèle Square) : à ajouter dès la refonte ?

## 7. Décisions d'Ambaka (31 octobre 2026)

Réponses aux 18 questions des § 5 et § 6.7, dans l'ordre où elles lui ont été posées. Elles font foi sur le reste du document.

| # | Question | Décision |
|---|---|---|
| 1 | Renommages (§ 3.2) | **Tous acceptés sauf Aperçu, qui reste Aperçu.** Carte, Imprimantes, Abonnement, Réservations, Réglages, Pointage, Alertes, Récompenses. |
| 2 | Quatre onglets fixes, Tables et Carte dans la barre du gérant restaurant, Paiements et Équipe dans « Plus » | **Oui.** |
| 3 | Visite d'accueil | **Une carte de bienvenue + la liste de mise en route** ; le « ? » ouvert aux employés. |
| 4 | Règle d'encaissement par défaut | **Garder** « encaisser fait partir en cuisine » ; pas de question à l'inscription. |
| 5 | Réglages en 4 sections + « Plus de réglages », codes dans Appareils et Encaissement | **Oui.** |
| 6 | Catégories proposées en un tap et saisie « plusieurs articles » | **Non : ce sont les restaurants qui définissent leurs catégories.** L'état vide garde « Créer une catégorie » ; pas de modèle. (La saisie « plusieurs articles » tombe avec.) |
| 7 | Écran Cuisine avec interrupteur « En vente » | **Oui pour le cuisinier** ; pour le serveur seulement là où le restaurant lui a ouvert ce droit. |
| 8 | Déconnexion | **Dans « Plus »**, avec confirmation sur une tablette verrouillée. |
| 9 | Premiers pas des employés (email qui nomme le rôle, état vide avec la règle, commande d'exemple Table 0) | **Les trois.** |
| 10 | Club : « Créer et publier » en un geste, « Faire entrer » toujours visible à la porte | **Oui aux deux.** |
| 11 | Les trois bugs hors périmètre (pas de réinitialisation de mot de passe, « Activation en cours… » sans délai, offre « digital » par défaut) | **Routés vers une session de correction à part**, hors de la refonte. |
| 12 | Affiche multi-formules (BOHO) | **Option repliée « Présentation »** dans l'onglet Formules. |
| 13 | Préréglage « Le midi en semaine » | **Déduit des horaires d'ouverture**, repli 11 h 30 – 14 h 30. |
| 14 | Étape facultative | **Dans chaque feuille d'étape, repliée.** |
| 15 | Choix hors carte | **Supprimés : le plat se crée sur la carte, masqué seul** (il vit avec les autres, le ticket cuisine suit). |
| 16 | Aperçu client en direct dans l'éditeur | **Dès la première passe.** |
| 17 | Étapes réutilisables entre formules | **Plus tard.** |
| 18 | « Proposé d'office » (sélection par défaut par étape) | **Oui.** |

Conséquences à répercuter : § 3.7 est abandonné ; § 3.6 garde la fiche article en deux temps mais sans la saisie groupée ; § 3.1 et l'annexe A disent « Aperçu » ; § 6.4 retire « Ajouter un choix qui n'est pas sur la carte » de la feuille d'étape et § 6.3 note qu'un article peut être « masqué seul » (visible seulement en formule), ce qui est un petit ajout au modèle d'article.

## Annexe A — Glossaire proposé (un mot par concept)

| Concept | Mot retenu | À ne plus employer |
|---|---|---|
| La page du jour du gérant | Aperçu | tableau de bord, accueil |
| La liste des plats | la carte | le menu (réservé au produit « menu QR » et aux formules) |
| Un plat ou une boisson | article | produit, item |
| Entrée + plat + dessert à prix fixe | formule | menu, deal |
| Faire payer | encaisser | régler (côté client), payer |
| Porter à table / donner au comptoir | servir / remettre | livrer, bumper |
| Plat qu'on ne peut plus vendre ce service | épuisé | indisponible, retiré, 86 |
| Couper une partie de la carte à heure fixe | fermeture (la cuisine, le bar) | plage, arrêt |
| Heures d'ouverture | horaires, de … à … | plages |
| Compte Stripe / Square | compte de paiement | encaisseur, fournisseur |
| Boîtier Raspberry | boîtier d'impression (Omilink) | terminal, device |
| Pointer l'arrivée | pointage, pointer | badgeage, badger (sauf sur l'écran « Badgeuse ») |
| Notifications push | alertes | notifications |
| Niveau de points | récompense | palier |
| Réservation d'une bulle BOHO | réservation | bulle (sauf sur la page client du BOHO) |
| L'offre souscrite | abonnement | produits |
| Les réglages | Réglages | Établissement (devient une section) |

## Annexe B — Sources extérieures

- Toast Now (accueil propriétaire, cartes par droit) : support.toasttab.com/en/article/Get-Started-with-the-Toast-Now-App
- Lightspeed K-Series, nouvelle navigation (2025) et assistant de mise en route : k-series-support.lightspeedhq.com/hc/en-us/articles/36985562334363 et …/articles/360054950934
- Square for Restaurants, niveaux de droits : squareup.com/help/us/en/article/6430-setting-up-your-employees-with-square-for-restaurants
- Zenchef (fil d'activité) : zenchef.com/fr-fr ; SumUp POS back-office (réglages nommés par la tâche, installation sur l'écran d'accueil) : help.sumup.com/en-GB/pos/sections/75000007525-back-office-general
- NN/g : tutoriels d'onboarding (nngroup.com/articles/onboarding-tutorials), personnalisation et options avancées (…/customization), dialogues de confirmation (…/confirmation-dialog), cibles tactiles (…/touch-target-size), listes déroulantes (…/dropdown-list), bottom sheets (…/bottom-sheet), charge cognitive (…/4-principles-reduce-cognitive-load)
- Copy d'erreur en français : systeme-design.canada.ca/fr/composants/message-derreur/design ; langage clair B1 : accessibilite-produits-services.public.lu (guide 08/2025)
- Benchmark Userpilot 2024 (achèvement des listes et visites) : chiffres relayés par des extraits, page source non atteinte, à prendre comme ordre de grandeur.
- Formules et combos : Square (squareup.com/help/fr/fr/article/8558-create-and-sell-combos), Toast (support.toasttab.com/en/article/Setting-Up-a-Prix-Fixe-Menu ; intercom.help/toast-central/en/articles/14726324-build-a-customizable-meal-combo), Lightspeed K-Series (k-series-support.lightspeedhq.com/hc/articles/1260804656569), SumUp POS Pro (help.sumup.com/fr-FR/pos/articles/75000029438-formules-comment-cr-er-une-formule-), Zelty via le pont HubRise (hubrise.com/fr/apps/zelty-bridge/recuperer-catalogue), Innovorder (help.innovorder.fr, articles 10596403994396 et 9581853903132, lus par extraits), Uber Eats Menu Maker (merchants.ubereats.com/gb/en/resources/learning-center/menu-maker ; developer.uber.com/docs/eats/references/api/v2/put-eats-stores-storeid-menu), HubRise catalogue et commandes (hubrise.com/developers/api/catalog-management, …/order-management), NN/g assistants pas à pas (nngroup.com/articles/wizards) et dévoilement progressif (…/progressive-disclosure). Non vérifiés : écrans de L'Addition, Popina, Clover, Deliveroo Hub.
- Non trouvé : étude d'usage publiée du personnel de salle sur tablette pendant le service ; les règles KDS (ticket entier = cible, couleur par âge, annulation d'un « bump ») viennent de guides praticiens.

## Annexe C — Ce qui ne bouge pas

Pour que la refonte ne « simplifie » pas ce qui marche : les cartes du comptoir fast food ; l'addition cochable ; la badgeuse ; la bande des jours de Retraits et « Encaisser et remettre » ; les confirmations destructives ; l'onglet « À servir » qui se rajoute seul ; l'alerte boîtier hors ligne ; les états vides de Tables, Imprimantes, Fidélité, Équipe sans comptes ; la feuille « À produire » ; le scanner et ses messages par type de code ; les toasts qui disent la conséquence ; le bouton « Pas encore prête » ; le type de service en deux cartes ; le paiement qui s'allume seul au retour de Stripe ; le mode brouillon des soirées et le bouton de porte qui porte le montant ; le bandeau carillon.
