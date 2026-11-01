"""Tuto Stripe pour les commerciaux : génère index.html, que construit ensuite le kit (.claude/skills/ominin-pdf/scripts/build.sh . Tuto-Stripe), puis alleger.py."""
import re
from pathlib import Path

HERE = Path(__file__).parent
STRIPE_STEPS = 9
# Le chevron s'efface avant le bas de page : aucun bout ne dépasse sous les captures ni autour des encadrés (mm).
CHEVRON_END = 218

MARK = '<svg class="mark" viewBox="116 107 280 300" aria-hidden="true"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0b35b"/><stop offset=".55" stop-color="#e2764b"/><stop offset="1" stop-color="#c94f5e"/></linearGradient></defs><path d="M256 107 L396 247 V281 L256 141 L116 281 V247 Z" fill="url(#g)"/><path d="M256 170 L396 310 V344 L256 204 L116 344 V310 Z" fill="url(#g)"/><path d="M256 233 L396 373 V407 L256 267 L116 407 V373 Z" fill="url(#g)"/></svg>'
BRAND = f'<span class="brand">{MARK}Ominin</span>'


def key(label):
    return f'<span class="key">{label}</span>'


def header():
    return f'<header class="hd">{BRAND}<span class="sec">Tuto Stripe</span><span class="num">@@</span></header>'


def progress(step):
    return '<div class="progress">' + "".join(f'<i class="{"on" if i < step else ""}"></i>' for i in range(STRIPE_STEPS)) + "</div>"


def shots(*items):
    figures = "".join(f'<figure class="shot" style="width:{width}mm"><img src="img/ecrans/{name}.png" alt=""></figure>' for name, width in items)
    return f'<div class="shots">{figures}</div>'


def bullets(*items):
    return '<ul class="glass todo">' + "".join(f"<li>{item}</li>" for item in items) + "</ul>"


def callout(lead, text, theme):
    solid = " solid" if theme == "dark" else ""
    return f'<aside class="glass callout{solid}"><b>{lead}</b> {text}</aside>'


def page(theme, chevron, body, cls=""):
    x, y, width, top = chevron
    return f'<section class="page {cls}" data-theme="{theme}" data-chevron="{x + 3},{y + 3},{width}" data-clear="{top + 3},{CHEVRON_END}"><div class="inner">{header()}{body}</div></section>'


def step(theme, chevron, n, title, screen, items, figures, note=None, suite=False):
    kicker = f"Stripe, étape {n} sur {STRIPE_STEPS}" + (", suite" if suite else "")
    return page(
        theme,
        chevron,
        f'{progress(n)}<div class="title"><span class="kicker">{kicker}</span><h2>{title}</h2><p class="screen">{screen}</p></div>'
        + bullets(*items)
        + shots(*figures)
        + (callout(*note, theme) if note else ""),
    )


PAGES = [
    page(
        "dark",
        (92, 185, 190, 120),
        '<span class="kicker">Tuto commercial</span>'
        "<h1>Ouvrir le compte Stripe du restaurant <span>Stripe × Ominin</span></h1>"
        '<p class="lead">L’étape 6 de l’inscription : le compte qui reçoit l’argent des commandes payées en ligne. Captures du vrai parcours Stripe.</p>'
        '<div class="cover-tiles"><div class="glass"><b>15 minutes</b></div><div class="glass"><b>Avec le gérant</b><span>Sur son téléphone</span></div></div>',
        "cover",
    ),
    page(
        "paper",
        (90, 125, 190, 34),
        '<div class="title"><span class="kicker">Ce que tu réponds au gérant</span><h2>« Combien ça me coûte ? »</h2></div>'
        '<div class="prices">'
        '<div class="glass"><b>0 €</b><span>Ni installation, ni abonnement.</span></div>'
        '<div class="glass"><b>3 %</b><span>Uniquement sur les commandes payées en ligne.</span></div>'
        '<div class="glass"><b>Inclus</b><span>Ominin prend en charge les frais Stripe et HubRise.</span></div>'
        '<div class="glass"><h3>Ses clients paient seuls</h3><span>Carte, Apple Pay ou Google Pay, directement depuis le menu.</span></div>'
        '<div class="glass"><h3>L’argent va chez lui</h3><span>Le compte Stripe est à son nom : Stripe verse sur son compte bancaire.</span></div>'
        '<div class="glass"><h3>Son menu sous 48 h</h3><span>L’adresse de son menu s’affiche dans son espace de gestion une fois créé, sous 48 h au plus.</span></div>'
        "</div>",
    ),
    page(
        "dark",
        (45, 128, 190, 38),
        '<div class="title"><span class="kicker">La veille du rendez-vous</span><h2>À demander au gérant d’avoir sur lui</h2></div>'
        '<ul class="check">'
        '<li class="glass"><h3>Son Kbis</h3><span>Pour la dénomination sociale exacte, le numéro SIREN et la forme (SAS, SARL…).</span></li>'
        '<li class="glass"><h3>L’IBAN du compte professionnel</h3><span>Au nom de l’entreprise : c’est là qu’arrive l’argent.</span></li>'
        '<li class="glass"><h3>Sa pièce d’identité, et son téléphone</h3><span>Stripe demande une photo de la pièce et un selfie, plus un code par SMS.</span></li>'
        '<li class="glass"><h3>Les associés à plus de 25 %</h3><span>Nom, date de naissance et adresse de chacun (les « bénéficiaires effectifs »).</span></li>'
        '<li class="glass"><h3>Sa date de naissance et son adresse personnelle</h3><span>Celles du représentant légal, telles que sur ses papiers.</span></li>'
        '<li class="glass"><h3>Une adresse e-mail qu’il consulte</h3><span>Pour son compte Ominin et les messages de Stripe.</span></li>'
        "</ul>"
        + callout("Il manque un papier ?", f"Touche {key('Faire plus tard')} : le reste de l’inscription continue, et le gérant reliera Stripe depuis son espace de gestion.", "dark"),
    ),
    page(
        "paper",
        (90, 150, 190, 92),
        '<div class="title"><span class="kicker">Avant Stripe</span><h2>Lancer l’inscription</h2><p class="screen">Espace commercial, fiche du restaurant</p></div>'
        '<ol class="glass todo numbered">'
        f"<li>Ouvre la fiche du restaurant et touche {key('Lancer l’inscription')}.</li>"
        "<li><b>Sur mon téléphone</b> : tu remplis avec le gérant. <b>Montrer le QR</b> : il remplit sur son téléphone, tu suis l’avancement.</li>"
        "<li>Le questionnaire crée le compte (étapes 1 à 5 : compte, restaurant, responsable, service, offre et CGV).</li>"
        f'<li class="after">À l’étape 6, touche {key("Créer mon compte Stripe")} : la page de Stripe s’ouvre, en français.</li>'
        "</ol>"
        + shots(("inscription", 66))
        + callout("Sur la page Stripe,", "le nom affiché en haut est « Ominin AI » : c’est normal, c’est notre plateforme.", "paper"),
    ),
    step(
        "dark", (90, 140, 190, 62), 1, "Téléphone et code SMS", "Écran « Démarrer »",
        [
            f"Le gérant saisit <b>son</b> numéro de portable, puis {key('Envoyer')}.",
            "Il recopie le code reçu par SMS.",
            "Ce numéro lui sert ensuite à se reconnecter à Stripe : jamais le tien.",
        ],
        [("demarrer", 56), ("sms", 56)],
        ("Un captcha « sélectionnez les images… » ?", "Stripe vérifie qu’un humain est là : le gérant le résout et continue."),
    ),
    step(
        "paper", (45, 150, 190, 62), 2, "Le type d’entreprise", "Écran « Parlez-nous de votre entreprise »",
        [
            "<b>Pays</b> : France.",
            "<b>Type d’entreprise</b> : <b>Société</b> pour une SAS, SARL, EURL… ; <b>Particulier / Entrepreneur individuel</b> pour un auto-entrepreneur.",
            "<b>Structure</b> : celle écrite sur son Kbis.",
        ],
        [("type", 92)],
    ),
    step(
        "dark", (92, 132, 190, 62), 3, "Les informations de l’entreprise", "Même écran, plus bas",
        [
            "<b>Dénomination sociale</b> : le nom exact du Kbis (ex. « Le Comptoir SAS »).",
            "<b>Nom commercial</b> : déjà rempli avec le nom du restaurant. Laisse-le : c’est ce que le client lit sur son relevé.",
            "<b>SIREN</b> (9 chiffres), adresse, téléphone de l’entreprise.",
        ],
        [("entreprise", 56)],
    ),
    step(
        "dark", (45, 135, 190, 70), 3, "Secteur et site web", "Même écran, encore plus bas",
        [
            "<b>Secteur</b> : « Restaurants et discothèques ».",
            "<b>Site web</b> : le menu n’existe pas encore. Touche « Vous n’avez pas de site Web ? Ajoutez une description » et écris par exemple « Restaurant : commande et paiement à table ».",
        ],
        [("secteur", 110)],
        suite=True,
    ),
    step(
        "paper", (90, 150, 190, 62), 4, "Le représentant du compte", "Écran « Complétez vos informations personnelles »",
        [
            "Nom et prénom <b>tels que sur sa pièce d’identité</b>.",
            "E-mail, intitulé de poste (gérant, président…).",
            "<b>Date de naissance</b> et <b>adresse personnelle</b>.",
            "Téléphone.",
        ],
        [("representant", 62)],
        ("Doit être fait par une personne qui peut signer pour l’entreprise :", "le gérant ou le président, pas un employé."),
    ),
    step(
        "dark", (45, 150, 190, 62), 5, "Les propriétaires", "Écran « Ajouter ou supprimer des propriétaires »",
        [
            "Stripe demande chaque personne qui détient <b>plus de 25 %</b> de l’entreprise.",
            f"Touche {key('Ajouter un propriétaire')} : le gérant se sélectionne lui-même s’il est associé, puis ajoute les autres.",
            f"Quand la liste est juste, {key('Continuer')}.",
        ],
        [("proprietaires", 56), ("informations", 56)],
        ("Ne laisse pas la liste vide", "si le gérant détient des parts : Stripe bloque alors avec « Fournir des informations supplémentaires »."),
    ),
    step(
        "paper", (90, 148, 190, 62), 6, "Attester et signer", "Écrans « Vérifier les personnes propriétaires » puis « Vérifier et signer »",
        [
            "Choisis <b>Attestation électronique</b> (recommandé) : quelques minutes, pas de document à envoyer.",
            "Le gérant signe à l’écran pour confirmer la liste des propriétaires.",
        ],
        [("attester", 54), ("signer", 54)],
        ("La signature est celle du représentant", "saisi à l’étape 4. Si ce n’est pas le gérant présent, il faudra la lui demander."),
    ),
    step(
        "dark", (45, 142, 190, 62), 7, "Le compte pour les virements", "Écran « Ajouter un compte pour les virements »",
        [
            "Pays du compte : France.",
            "L’<b>IBAN du compte professionnel</b>, deux fois.",
            f"{key('Continuer')} : il accepte le mandat SEPA en même temps.",
        ],
        [("virements", 66)],
        ("Piège :", "un IBAN de compte personnel pour une société est souvent refusé à la vérification."),
    ),
    step(
        "paper", (90, 150, 190, 62), 8, "Vérifier son identité", "Écran « Vérifiez l’identité du représentant »",
        [
            "Choisis <b>Selfie et photo d’identité</b> (recommandé).",
            "Le gérant choisit sa pièce (carte d’identité, passeport, titre de séjour…) et la photographie, puis prend un selfie.",
            "Stripe vérifie quelques secondes : « Vérification des informations personnelles ».",
        ],
        [("identite", 52), ("piece", 52)],
        ("Rassure-le :", "ces données vont à Stripe, qui y est obligé par la loi. Ominin ne les voit pas."),
    ),
    step(
        "dark", (45, 132, 190, 62), 9, "Relire et envoyer", "Écran « Récapitulatif »",
        [
            "Relisez ensemble : dénomination, adresse, propriétaires, IBAN.",
            f"Une ligne marquée <b>« Non valide »</b> : touche {key('Modifier')} ou {key('Vérifier')} et corrige.",
            f"Touche {key('Accepter et envoyer')}. Stripe renvoie au questionnaire, qui passe à l’étape 7 : HubRise.",
        ],
        [("recapitulatif", 50)],
        ("« Vérifiez vos informations fiscales » ?", "L’adresse ne correspond pas au SIREN : reprends celle du Kbis."),
    ),
    page(
        "paper",
        (90, 118, 190, 34),
        '<div class="title"><span class="kicker">Si ça coince</span><h2>Les cas qu’on rencontre</h2></div>'
        '<div class="cases">'
        f'<div class="glass"><h3>« Le lien Stripe a expiré. »</h3><p>La page est restée ouverte trop longtemps. Retouche {key("Créer mon compte Stripe")} : Stripe reprend où il en était.</p></div>'
        '<div class="glass"><h3>« Fournir des informations supplémentaires. »</h3><p>Il manque un propriétaire à plus de 25 % : ajoute-le à l’étape 5, puis continue.</p></div>'
        f'<div class="glass"><h3>« Il manque l’IBAN ou un associé. »</h3><p>{key("Faire plus tard")}, puis le gérant finit depuis son espace de gestion : un bandeau « Reliez votre compte Stripe » l’y attend.</p></div>'
        '<div class="glass"><h3>« Il hésite à donner ses papiers. »</h3><p>Obligation légale pour tout commerçant qui encaisse par carte ; les données vont à Stripe, pas à Ominin.</p></div>'
        "</div>"
        + callout("Support Ominin :", '<span class="mail">omininsupport@gmail.com</span>, avec une capture de l’écran.', "paper")
        + '<p class="note">Captures réalisées sur un compte Stripe de test : chez le gérant, le bandeau gris « compte de test » n’apparaît pas.</p>',
    ),
]


def typo(html):
    """Espaces insécables du français, dans le texte seulement (pas dans les balises)."""
    parts = re.split(r"(<[^>]+>)", html)
    for i, part in enumerate(parts):
        if not part.startswith("<"):
            part = re.sub(r" ([%€:;?!»])", "\u00a0\\1", part)
            part = re.sub(r"(\d) (h\b)", "\\1\u00a0\\2", part)
            parts[i] = part.replace("« ", "«\u00a0")
    return "".join(parts)


body = "".join(p.replace("@@", f"{i + 1} / {len(PAGES)}") for i, p in enumerate(PAGES))
HTML = f"""<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><title>Tuto Stripe × Ominin</title>
<link rel="stylesheet" href="fonts/instrument.css"><link rel="stylesheet" href="ominin-glass.css"><link rel="stylesheet" href="tuto.css"><link rel="stylesheet" href="bg.css"></head>
<body>{typo(body)}</body></html>"""

(HERE / "index.html").write_text(HTML)
