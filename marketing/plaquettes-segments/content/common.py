"""Ce que les trois plaquettes partagent : les chiffres du relevé, les études, les lignes de prix."""
from charts import R, fr

T, L = R["totals"], R["loyalty"]
RELEVE = f"Relevé Ominin : un bar-restaurant toulousain équipé d’Ominin, {T['nights']} soirs, {fr(T['paid'])} commandes payées, du 18 septembre au 29 octobre 2026."
ONLINE = f"{fr(T['lw_online_rev_share'], 1)} %"
MULTI = f"{fr(R['tables']['multi'])} %"
CARD = f"{fr(L['share'], 1)} %"
MEMBERS, RETURNING = L["members"], L["returning"]

TAN = ("+11 %", "de ventes par minute de table, et des repas environ 10 % plus courts, avec des tablettes de commande et de paiement à table.", "Tan & Netessine, Management Science, 2020. 66 restaurants d’une chaîne américaine, pas des bars.")
DEVRIES = ("+15 %", "de chiffre d’affaires possible sans attente, d’après 12 mois d’observation de 94 404 clients d’un restaurant.", "De Vries, Roy & De Koster, Journal of Operations Management, 2018.")
HBR = ("5 à 25 ×", "Gagner un client coûte 5 à 25 fois plus cher qu’en garder un, tous secteurs confondus. C’est tout l’intérêt de la fidélité.", "Harvard Business Review, 2014, d’après Reichheld (Bain & Company).")
LU = ("La file", "Devant une file, les clients regardent sa longueur plus que sa vitesse. Chaque commande passée au téléphone la raccourcit.", "Lu, Musalem, Olivares & Schilkrut, Management Science, 2013. Rayon traiteur d’un hypermarché ; la seconde phrase est notre lecture.")

ANALYSE = ("Une analyse poussée de vos données", "Ce qui se vend, quand, et ce que rapporte chaque heure travaillée. Chaque mois, on vous présente le rapport.")
FOOT = "0 € d’abonnement · 3 % sur les commandes payées en ligne · Frais de carte PSP en sus"
ALCOOL = "L’abus d’alcool est dangereux pour la santé, à consommer avec modération."
PRICE = "<b>1,50 €</b> par QR + 20 € de livraison, une fois."
SMALL = "Boîtier Omilink pour vos imprimantes de tickets : 89 €, une fois, si besoin. Photo : les cartes d’un de nos clients."
