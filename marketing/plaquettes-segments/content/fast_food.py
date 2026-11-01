from content.common import *

SOURCE_AKTO = "AKTO, Les nouvelles attentes des clients de la restauration rapide, Toluna-Harris Interactive, France, 2024, 1 084 clients, fast-food et burger, p. 23 et 32"

CONTENT = {
    "cover": {
        "lead": "Le système tout-en-un pour les fast-foods : des clients plus satisfaits, moins de coûts et plus de ventes.",
        "pillars": [
            ("Des clients plus satisfaits", "Ils commandent et paient sur leur téléphone, puis suivent leur numéro en direct jusqu’à « C’est prêt »."),
            ("Des coûts d’exploitation réduits", "La commande payée part toute seule en cuisine. Moins de prise de commande et moins d’encaissement au comptoir."),
            ("Plus de ventes", "Commander ne dépend plus de la file devant la caisse. Vos menus et options à chaque commande, et une fidélité qui fait revenir."),
            ANALYSE,
        ],
        "tablet": "g-aujourdhui",
        "phone": "menu",
    },
    "p2": {
        "section": "Satisfaction et coûts",
        "title": "Votre comptoir, sur chaque téléphone.",
        "lead": "Les écrans de ces pages viennent d’une carte de démonstration. Votre version reprend votre logo, vos couleurs, vos menus et vos photos.",
        "rows": [
            dict(image_first=True, screens=["prete", "compose"], kicker="Clients plus satisfaits : le ticket en direct", title="Un numéro, et plus besoin d’attendre debout.", text="Sans appli et sans compte. Le client scanne un QR, compose son menu et paie. Il reçoit un numéro du jour, et son téléphone suit la commande jusqu’à « C’est prêt ».", points=["Commandée, en cuisine, prête : le ticket change tout seul, en direct.", "Il choisit : payer en ligne, ou payer au comptoir avant le départ en cuisine.", "Un produit épuisé disparaît d’un geste de la carte."]),
            dict(image_first=False, screens=["g-comptoir"], kicker="Réduisez vos dépenses : le comptoir", title="Prête ? Un appui. Remise ? Un appui.", text="Sur une tablette, l’équipe voit les numéros à préparer et à remettre. Le ticket sort en cuisine avec le numéro en grand, sur vos imprimantes.", points=["Marquer prête prévient le client sur son téléphone.", "Une numérotation qui repart chaque jour, à l’heure que vous réglez.", "Une vue pour le gérant, le comptoir et la cuisine."]),
        ],
        "note": "Écrans réels du produit. Dans l’espace de gestion, les chiffres sont fictifs.",
    },
    "p3": {
        "section": "Boostez vos ventes",
        "rows": [
            dict(image_first=True, screens=["compose", "panier"], kicker="Boostez vos ventes : la commande", title="Le menu complet, sans oublier les options.", text="Accompagnement, sauce, boisson : le client compose son menu lui-même, à son rythme, et les choix arrivent justes en cuisine. Rien à répéter au comptoir, rien à mal entendre.", points=["Vos formules et vos suppléments, sur chaque commande.", "Des prix, des photos et des allergènes toujours à jour.", "Commander reste possible quand il y a du monde devant la caisse."]),
            dict(image_first=False, screens=["panier", "menu"], kicker="Boostez vos ventes : la fidélité", title="Une raison de revenir.", text="Le client laisse son numéro une fois : ses points se cumulent tout seuls, sans carte à tamponner ni appli à télécharger. Vous choisissez les récompenses.", points=["Les points affichés dans le panier, à chaque commande.", "Une boisson, un dessert ou un menu offert, aux paliers que vous fixez.", "Vos clients fidèles deviennent une base que vous voyez enfin."]),
        ],
    },
    "p4": {
        "section": "Réduisez vos dépenses",
        "cards": dict(kicker="Vos QR", title="À votre image, là où vos clients attendent.", text=["On dessine vos QR dans votre charte : à l’entrée, sur le comptoir, sur les tables. On vous les livre prêts à poser."], price=PRICE, small=SMALL),
        "kicker": "Réduisez vos dépenses : l’espace de gestion",
        "title": "Votre coup de feu, en direct.",
        "lead": "C’est l’interface que vous utilisez au quotidien si vous travaillez avec nous. Elle se branche sur votre caisse, et sur vos imprimantes si besoin.",
        "tablets": ["g-comptoir", "g-carte", "g-fidelite", "g-planning"],
        "features": [
            ("Commandes", "À encaisser, à préparer, à remettre, chacune avec son numéro."),
            ("Carte", "Prix, photos, ruptures et formules, modifiés depuis votre téléphone."),
            ("Fidélité", "Vos clients, leurs points et les résultats du programme en graphiques."),
            ("Équipe", "Rôles, pointage, et un planning proposé d’après les commandes prévues."),
        ],
        "note": "Écrans de gestion : chiffres fictifs.",
    },
    "p5": {
        "section": "Vos données",
        "title": "Ce que vos clients disent de l’attente.",
        "lead": "Nous prenons 3 % sur les commandes payées en ligne, et rien sur le reste. Voici ce qu’on sait de l’attente en fast-food en France.",
        "stats": [
            ("40 %", "seulement des clients à emporter sont très satisfaits du temps d’attente (45 % sur place)"),
            ("34 %", "seulement sont très satisfaits de la gestion des heures de pointe, à emporter (36 % sur place)"),
            ("70 %", "des clients jugent important un bipeur qui prévient quand la commande est prête"),
            ("0 €", "de bipeur à acheter : le ticket en direct est sur le téléphone du client"),
        ],
        "research_title": "Ce que disent les études",
        "research": [LU, DEVRIES, HBR],
        "tablet": "g-analyses",
        "aside": dict(kicker="Le prix", text="0 € d’abonnement. 3 % sur les commandes payées en ligne, rien sur le reste.", strong="Sans commande en ligne, vous ne nous devez rien.", small="Espèces et paiement au comptoir : 0 %. Frais de carte PSP en sus."),
        "note": f"{SOURCE_AKTO}. Écran de gestion : chiffres fictifs.",
    },
    "p6": {
        "section": "Vos données",
        "title": "Moins d’intuition, de meilleures décisions.",
        "lead": "Chaque commande devient une donnée : sur vos heures, vos équipes et votre carte. Exemple ci-dessous : ces graphiques viennent d’un bar-restaurant équipé d’Ominin, pas d’un fast-food. Chez vous, ce seront vos heures et vos numéros.",
        "panels": [
            dict(chart="heat", title="Calez l’équipe sur vos vraies heures de pointe", sub="Commandes payées par heure, en moyenne, dans ce bar-restaurant", read="Vous verrez la même chose pour vos midis et vos soirs, jour par jour."),
            dict(chart="load", title="Voyez où le service décroche", sub="Attente médiane au comptoir (min:s), selon les commandes des 15 dernières minutes, dans ce bar-restaurant", read="Au-delà d’un certain rythme, l’attente décolle. Vous saurez à partir de quand chez vous."),
            dict(chart="mix", title="Voyez comment vos clients paient", sub="Part du chiffre d’affaires par moyen de paiement, dans ce bar-restaurant", read="Sans aucune obligation : chacun garde le choix de payer au comptoir."),
        ],
        "lever_title": "Ce que vous pilotez",
        "lever": [
            ("Équipe", "Heures de pointe, CA par heure, planning de la semaine proposé."),
            ("Service", "Temps de préparation, attente, commandes annulées."),
            ("Carte", "Produits vedettes, marge par article, et ceux à retravailler."),
            ("Marge", "Coût matière et coût d’équipe face à vos objectifs."),
            ("Clients", "Fidèles, retours, récompenses utilisées."),
        ],
        "strip": "g-analytique",
        "note": f"Graphiques : {RELEVE[0].lower() + RELEVE[1:]} Ce n’est pas un fast-food, et ces chiffres ne garantissent pas les vôtres. Écran de gestion : chiffres fictifs.",
    },
    "p7": {
        "section": "Le comparatif",
        "title": "0 € par mois. Pas de borne à acheter.",
        "lead": "Une borne a ses atouts, et certains prix sont plus bas que les nôtres sur le paiement. Mais le téléphone de vos clients, lui, est déjà là.",
        "yearly": [("Vos frais fixes par an avec Ominin", "0 €"), ("Une borne Tabesto par an, abonnement seul", "2 148 €")],
        "them": "Une borne",
        "rows": [
            ("Le matériel", "<b>1,50 €</b> le QR, une fois", "De 2 000 à 15 000 € la borne, ou 190 à 210 € par mois pour une borne à 6 000 € sur 36 mois (Innovorder)"),
            ("Abonnement", "<b>0 €</b> par mois", "Tabesto : 179 € HT la première borne, 40 € HT les suivantes. Square : 30 € HT par appareil"),
            ("Mise en place", "<b>Comprise</b>", "Tabesto : environ 780 € par établissement"),
            ("Sur le paiement", "<b>3 %</b> des commandes payées en ligne, frais de carte en sus", "Tabesto : à partir de 0,70 %"),
            ("Où on commande", "<b>Partout</b>, sur son téléphone", "Devant la borne"),
            ("Le suivi du client", "<b>Son numéro en direct</b> sur son téléphone", "Écran d’appel hors de la liste du pack 6XPOS"),
            ("L’écran cuisine", "Pas d’écran dédié : <b>tickets imprimés</b> et tablette", "Compris dans le pack 6XPOS, dès 155 € par mois"),
        ],
        "claim": dict(title="Commandez comme un client.", text="Ne nous croyez pas sur parole. Scannez, composez un menu, et suivez votre numéro. Rien n’est encaissé.", url="menu.ominin.com/demo/o-crousti-poulet", qr="qr-demo"),
        "note": "Relevés le 01/11/2026 : tabesto.com/en/tarifs ; innovorder.com/en/blog/price-self-ordering-kiosk ; 6xpos.fr ; squareup.com/fr/fr/point-of-sale/restaurants/pricing. 2 148 € = 12 × 179 € HT, hors mise en place et paiement. Ominin : frais de carte PSP en sus.",
    },
    "p8": {
        "section": "Et maintenant",
        "title": "On commence quand vous voulez.",
        "steps": [
            "<b>Envoyez-nous une photo de votre carte.</b> C’est votre seul travail.",
            "<b>On monte votre carte et vos QR</b>, à vos couleurs.",
            "<b>On est là au premier service</b>, et on forme votre équipe sur place.",
        ],
        "phone": "menu",
        "scan": "Scannez : la carte de démonstration s’ouvre.",
        "foot": FOOT,
    },
}
