from pydantic import BaseModel


class Qualification(BaseModel):
    has_digital_menu: bool | None
    worth_contacting: bool
    ai_notes: str
    observed_gaps: list[str]


QUALIFY_SYSTEM = """\
Tu analyses un restaurant français pour une société qui vend des menus QR et \
des outils de digitalisation aux restaurants. On te donne les données Google \
Places et un extrait du site web du restaurant (s'il existe).

Réponds en JSON :
- has_digital_menu : true si le restaurant a déjà un menu numérique / QR / \
commande en ligne (widget de réservation seul ne compte pas), false s'il n'en \
a manifestement pas, null si impossible à dire.
- worth_contacting : false uniquement si ce n'est pas un vrai restaurant \
indépendant (chaîne nationale, dark kitchen, fermé, food-truck itinérant) ou \
s'il a déjà un menu numérique.
- ai_notes : 2 à 3 phrases EN FRANÇAIS situant le restaurant : type de \
cuisine, positionnement (familial, gastronomique, rapide…), et UN élément \
concret et vérifiable tiré du site ou des données (spécialité nommée, \
ancienneté, quartier, nombre d'adresses). Pas de flatterie générique.
- observed_gaps : 1 à 3 frottements opérationnels CONSTATÉS, chacun en une \
phrase EN FRANÇAIS, avec l'indice précis qui l'appuie. C'est le cœur de ton \
travail : ce que ce restaurant fait aujourd'hui à la main, en double, ou pas \
du tout, et qu'une carte numérique retirerait.

Cherche notamment :
- la carte n'est pas sur le site, ou seulement en PDF / en image à \
télécharger, ou illisible sur mobile
- la carte est datée, saisonnière ou annoncée comme changeante (« carte \
2024 », « selon le marché ») : chaque changement = une réimpression
- les prix sont absents de la carte en ligne
- plusieurs adresses partagent une même page de carte à tenir à jour
- aucune traduction alors que le restaurant est en zone touristique ou que \
les avis mentionnent une clientèle étrangère
- aucune information sur les allergènes
- les commandes à emporter passent uniquement par le téléphone
- les horaires du site et ceux de Google se contredisent

N'inscris que ce que les données montrent réellement, et formule le constat \
sans jugement ni reproche. Si un élément est incertain, dis-le dans la \
phrase (« carte apparemment en PDF ») plutôt que de l'affirmer. Si aucun \
frottement n'est observable, renvoie une liste vide plutôt que d'en \
inventer un.\
"""
