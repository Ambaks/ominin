from pydantic import BaseModel

from app.config import settings


class ColdEmail(BaseModel):
    subject: str
    body: str


COLD_EMAIL_RULES = f"""\
Écris le premier e-mail de prospection adressé au propriétaire de \
l'établissement décrit ci-dessous, en reprenant MOT POUR MOT l'e-mail de \
référence. Seules ces modifications sont permises :

1. Le nom de l'établissement, à sa place dans l'avant-dernier paragraphe \
avant la démonstration, avec la bonne préposition (« du Café Alba », « de \
la Brasserie Pompette », « des Munitionnettes », « de Fanfare »). Écris son \
nom d'usage, avec des majuscules normales, sans ce qui suit un tiret ni le \
nom de la ville (« Fanfare - Restaurant français Toulouse » devient \
« Fanfare », « LA SANTA LUCCIA » devient « La Santa Luccia »).
2. Pour un établissement sans service à table (catégorie fast_food ou \
bakery), remplace « votre personnel » par « votre équipe », et la phrase \
« grâce au QR code, le nombre de commandes ne dépend plus de la \
disponibilité de vos serveurs. » par « grâce au QR code, ils commandent et \
paient depuis leur téléphone, sans attendre leur tour au comptoir, et sont \
prévenus quand leur commande est prête. »
3. Si la rencontre au restaurant n'est pas possible, remplace « Nous venons \
tout installer » par « Nous installons tout pour vous », et « en personne \
ou par téléphone » par « par téléphone ou en visioconférence ».

Rien d'autre : n'ajoute ni accroche, ni fonction, ni prix, ni chiffre, et \
n'utilise pas les notes de personnalisation. L'objet est « <nom d'usage> et \
Ominin ». Le corps commence à « Bonjour, » et s'arrête à « Cordialement, » : \
la signature est ajoutée automatiquement.

E-mail de référence :

Bonjour,

Je suis Léa Moreau, commerciale chez Ominin, une startup française. Nous \
avons conçu un système de commande par QR code qui vous permettra de \
fidéliser vos clients, de réduire vos charges et de fluidifier votre \
service.

L'idée n'est pas de remplacer votre personnel, mais d'offrir à vos clients \
une expérience unique : grâce au QR code, le nombre de commandes ne dépend \
plus de la disponibilité de vos serveurs. C'est une option que chaque \
client est libre d'utiliser, s'il le souhaite.

De votre côté, vous n'avez rien à faire. Nous venons tout installer, puis \
nous restons à vos côtés pour personnaliser le logiciel selon vos goûts et \
répondre à toutes vos questions. Il se connecte directement à votre \
caisse : vous continuez à fonctionner normalement, sans rien changer.

La cerise sur le gâteau, c'est ce que nous pouvons ensuite faire de vos \
données avec vous, si vous le souhaitez. Nos analystes construisent votre \
projet avec vous, à partir des analyses rapides et très poussées que \
permettent nos modèles d'intelligence artificielle.

Nous sommes convaincus de la qualité, de la sécurité et du retour sur \
investissement de nos produits. Ce que nous voulons vous démontrer, c'est \
l'importance que nous accordons à nos clients : nous serons à vos côtés \
tout au long du processus, à l'écoute de vos remarques et suggestions, et \
déterminés à faire progresser la rentabilité et l'expérience client du \
Concorde Atlantique.

Vous trouverez une démonstration ici : {settings.outreach_demo_url}

Nous l'avons réalisée pour un restaurant avec lequel nous travaillons \
aujourd'hui. Il a personnalisé le produit selon ses goûts et son \
fonctionnement, d'où le retrait des commandes en cuisine et au bar.

Je vous propose de fixer un premier rendez-vous à votre convenance, en \
personne ou par téléphone.

Cordialement,\
"""
