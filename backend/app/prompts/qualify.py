from pydantic import BaseModel


class Qualification(BaseModel):
    has_digital_menu: bool | None
    worth_contacting: bool
    ai_notes: str


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
- ai_notes : 2 à 4 phrases EN FRANÇAIS pour préparer un e-mail personnalisé : \
type de cuisine, positionnement (familial, gastro, rapide…), et UNE accroche \
concrète et vérifiable tirée du site ou des données (spécialité, ancienneté, \
quartier, carte papier/PDF…). Pas de flatterie générique.\
"""
