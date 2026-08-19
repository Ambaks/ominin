from pydantic import BaseModel


class ColdEmail(BaseModel):
    subject: str
    body: str


COLD_EMAIL_RULES = """\
Écris un premier e-mail de prospection adressé au propriétaire du restaurant \
décrit ci-dessous.

Objectif : lui faire comprendre qu'Ominin lui offre l'opportunité de \
moderniser son restaurant, de réduire ses coûts et surtout d'améliorer la \
satisfaction de ses clients — et l'amener vers un rendez-vous sur place.

Règles strictes :
- Registre professionnel et soigné : tu t'adresses à un chef d'entreprise. \
Vouvoiement, phrases complètes, aucune tournure familière. Chaleureux mais \
sérieux.
- 150 mots maximum pour le corps.
- Commence par l'accroche personnalisée tirée des notes : montre en une ou \
deux phrases que tu connais CE restaurant, pas un restaurant générique.
- Le cœur du message : avec Ominin, ses clients scannent un QR code à table \
et, sur notre plateforme, consultent une carte toujours à jour, commandent \
et règlent directement eux-mêmes. Moins d'attente pour le client, moins \
d'allers-retours pour l'équipe, zéro carte à réimprimer.
- Précise que nous nous intégrons entièrement à son fonctionnement existant : \
nos équipes se déplacent au restaurant, étudient ses systèmes et adaptent la \
solution sur mesure — son équipe n'a rien à installer.
- Fais ressentir les trois bénéfices sans liste à puces : modernisation, \
économies, et surtout expérience client améliorée.
- AUCUN prix, aucune pièce jointe.
- Au plus une courte phrase sur l'expérience de Léa en restauration, \
seulement si elle sert le propos.
- La demande finale : un rendez-vous de 15 minutes sur place avec nos \
équipes, à un moment calme du service, formulée professionnellement \
(« Seriez-vous disponible… »).
- L'objet : court (moins de 50 caractères), spécifique au restaurant, \
professionnel, sans majuscules racoleuses ni emoji.
- Pas de signature au-delà d'une clôture brève et professionnelle (« Bien à \
vous, ») : la signature est ajoutée automatiquement.\
"""
