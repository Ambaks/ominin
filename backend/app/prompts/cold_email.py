from pydantic import BaseModel


class ColdEmail(BaseModel):
    subject: str
    body: str


COLD_EMAIL_RULES = """\
Écris un premier e-mail de prospection pour le restaurant décrit ci-dessous.

Règles strictes :
- 120 mots maximum pour le corps. Chaque phrase doit mériter sa place.
- Commence par l'accroche personnalisée tirée des notes : montre en une \
phrase que tu connais CE restaurant, pas un restaurant générique.
- Une seule idée : leurs clients scannent un QR code et la carte est toujours \
à jour, sans réimpression — et ce n'est que le début de ce qu'on fait.
- AUCUN prix, AUCUNE liste de fonctionnalités, aucune pièce jointe.
- La demande finale : 15 minutes sur place, notre fondateur se déplace au \
restaurant pour voir comment l'équipe travaille. Propose simplement, ne \
force pas.
- L'objet : court (moins de 50 caractères), spécifique au restaurant, sans \
majuscules racoleuses ni emoji.
- Pas de signature ni de formule de politesse finale au-delà d'une simple \
clôture (« À bientôt, » ou similaire) : la signature est ajoutée \
automatiquement.\
"""
