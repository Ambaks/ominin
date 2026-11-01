"""Tuto Stripe pour les commerciaux : génère index.html, que construit ensuite le kit (.claude/skills/ominin-pdf/scripts/build.sh . Tuto-Stripe), puis alleger.py.
Chaque action du texte porte un numéro, repris par une pastille à l'endroit exact de la capture."""
import re
from itertools import cycle
from pathlib import Path

HERE = Path(__file__).parent
STRIPE_STEPS = 9
# Le chevron s'efface avant le bas de page : aucun bout ne dépasse sous les captures ni autour des encadrés (mm).
CHEVRON_END = 218
CHEVRONS = cycle([(90, 150, 190, 66), (45, 145, 190, 66)])
FULL = (10, 93)

MARK = '<svg class="mark" viewBox="116 107 280 300" aria-hidden="true"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0b35b"/><stop offset=".55" stop-color="#e2764b"/><stop offset="1" stop-color="#c94f5e"/></linearGradient></defs><path d="M256 107 L396 247 V281 L256 141 L116 281 V247 Z" fill="url(#g)"/><path d="M256 170 L396 310 V344 L256 204 L116 344 V310 Z" fill="url(#g)"/><path d="M256 233 L396 373 V407 L256 267 L116 407 V373 Z" fill="url(#g)"/></svg>'
BRAND = f'<span class="brand">{MARK}Ominin</span>'


def key(label):
    return f'<span class="key">{label}</span>'


def goto(anchor, label):
    return f'<a class="goto" href="#{anchor}">{label}</a>'


def header():
    return f'<header class="hd">{BRAND}<a class="sec" href="#sommaire">Sommaire</a><span class="num">@@</span></header>'


def progress(step):
    return '<div class="progress">' + "".join(f'<i class="{"on" if i < step else ""}"></i>' for i in range(STRIPE_STEPS)) + "</div>"


def mark(label, top, bottom, span=FULL):
    """Une zone de la capture, en % : un cadre, et la pastille du numéro sur son bord gauche."""
    left, right = span
    middle = (top + bottom) / 2
    pin = f'<i class="pin{" warn" if label == "!" else ""}" style="left:{left}%;top:{middle}%">{label}</i>' if label else ""
    return f'<i class="ring" style="left:{left}%;top:{top}%;width:{right - left}%;height:{bottom - top}%"></i>{pin}'


def shot(name, width, *marks):
    return f'<figure class="shot" style="width:{width}mm"><div class="screen-box"><img src="img/ecrans/{name}.png" alt="">{"".join(marks)}</div></figure>'


def shots(*figures):
    return f'<div class="shots">{"".join(figures)}</div>'


def act(number, text):
    return f'<li class="act"><i class="badge">{number}</i>{text}</li>'


def actions(*items):
    return f'<ul class="glass todo">{"".join(item if item.startswith("<li") else f"<li>{item}</li>" for item in items)}</ul>'


def callout(lead, text, theme):
    solid = " solid" if theme == "dark" else ""
    return f'<aside class="glass callout{solid}"><b>{lead}</b> {text}</aside>'


def page(theme, body, cls="", anchor=None, chevron=None):
    x, y, width, top = chevron or next(CHEVRONS)
    identity = f' id="{anchor}"' if anchor else ""
    return f'<section{identity} class="page {cls}" data-theme="{theme}" data-chevron="{x + 3},{y + 3},{width}" data-clear="{top + 3},{CHEVRON_END}"><div class="inner">{header()}{body}</div></section>'


def step(theme, n, title, screen, need, items, figures, note=None, suite=False):
    kicker = f"Stripe, étape {n} sur {STRIPE_STEPS}" + (", suite" if suite else "")
    prepare = f'<p class="need"><b>À sortir :</b> {need}</p>' if need else ""
    return page(
        theme,
        f'{progress(n)}<div class="title"><span class="kicker">{kicker}</span><h2>{title}</h2><p class="screen">{screen}</p>{prepare}</div>'
        + actions(*items)
        + shots(*figures)
        + (callout(*note, theme) if note else ""),
        anchor=None if suite else f"stripe-{n}",
    )


def entry(anchor, number, title, need=""):
    return f'<a class="entry" href="#{anchor}"><i class="badge">{number}</i><span>{title}</span><small>{need}</small></a>'


COVER = page(
    "dark",
    '<span class="kicker">Tuto commercial</span>'
    "<h1>Ouvrir le compte Stripe du restaurant <span>Stripe × Ominin</span></h1>"
    '<p class="lead">L’étape 6 de l’inscription : le compte qui reçoit l’argent des commandes payées en ligne. Captures du vrai parcours Stripe.</p>'
    '<div class="cover-tiles"><div class="glass"><b>15 minutes</b></div><div class="glass"><b>Avec le gérant</b><span>Sur son téléphone</span></div></div>',
    "cover",
    chevron=(92, 185, 190, 120),
)

CONTENTS = page(
    "dark",
    '<div class="title"><span class="kicker">Sommaire</span><h2>Le parcours en un coup d’œil</h2><p class="screen">Touche une ligne pour y aller. À droite, ce que le gérant doit sortir.</p></div>'
    '<nav class="glass contents">'
    + entry("cout", "€", "« Combien ça me coûte ? »")
    + entry("veille", "✓", "La veille du rendez-vous")
    + entry("lancer", "→", "Lancer l’inscription")
    + entry("stripe-1", 1, "Téléphone et code SMS", "Téléphone")
    + entry("stripe-2", 2, "Le type d’entreprise", "Kbis")
    + entry("stripe-3", 3, "Les informations de l’entreprise", "Kbis")
    + entry("stripe-4", 4, "Le représentant du compte", "Pièce d’identité")
    + entry("stripe-5", 5, "Les propriétaires", "Associés à plus de 25 %")
    + entry("stripe-6", 6, "Attester et signer")
    + entry("stripe-7", 7, "Le compte pour les virements", "IBAN")
    + entry("stripe-8", 8, "Vérifier son identité", "Pièce, téléphone")
    + entry("stripe-9", 9, "Relire et envoyer")
    + entry("coince", "?", "Si ça coince")
    + "</nav>",
    anchor="sommaire",
)

PAGES = [
    COVER,
    CONTENTS,
    page(
        "paper",
        '<div class="title"><span class="kicker">Ce que tu réponds au gérant</span><h2>« Combien ça me coûte ? »</h2></div>'
        '<div class="prices">'
        '<div class="glass"><b>0 €</b><span>Ni installation, ni abonnement.</span></div>'
        '<div class="glass"><b>3 %</b><span>Uniquement sur les commandes payées en ligne.</span></div>'
        '<div class="glass"><b>Inclus</b><span>Ominin prend en charge les frais Stripe et HubRise.</span></div>'
        '<div class="glass"><h3>Ses clients paient seuls</h3><span>Carte, Apple Pay ou Google Pay, directement depuis le menu.</span></div>'
        '<div class="glass"><h3>L’argent va chez lui</h3><span>Le compte Stripe est à son nom : Stripe verse sur son compte bancaire.</span></div>'
        '<div class="glass"><h3>Son menu sous 48 h</h3><span>L’adresse de son menu s’affiche dans son espace de gestion une fois créé, sous 48 h au plus.</span></div>'
        "</div>",
        anchor="cout",
    ),
    page(
        "dark",
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
        anchor="veille",
    ),
    page(
        "paper",
        '<div class="title"><span class="kicker">Avant Stripe</span><h2>Lancer l’inscription</h2><p class="screen">Espace commercial, fiche du restaurant</p></div>'
        + actions(
            act(1, f"Ouvre la fiche du restaurant et touche {key('Lancer l’inscription')}."),
            act(2, "<b>Sur mon téléphone</b> : tu remplis avec le gérant. <b>Montrer le QR</b> : il remplit sur son téléphone, tu suis l’avancement."),
            act(3, "Le questionnaire crée le compte (étapes 1\u00a0à\u00a05 : compte, restaurant, responsable, service, offre et CGV)."),
            act(4, f"À l’étape 6, touche {key('Créer mon compte Stripe')} : la page de Stripe s’ouvre, en français."),
        )
        + shots(shot("inscription", 66, mark(4, 61.5, 73, (4, 96))))
        + callout("Sur la page Stripe,", "le nom affiché en haut est « Ominin AI » : c’est normal, c’est notre plateforme.", "paper"),
        anchor="lancer",
    ),
    step(
        "dark", 1, "Téléphone et code SMS", "Écran « Démarrer »", "son téléphone",
        [
            act(1, "Le gérant saisit <b>son</b> numéro de portable."),
            act(2, f"Il touche {key('Envoyer')}."),
            act(3, "Il recopie le code reçu par SMS."),
            "Ce numéro lui sert ensuite à se reconnecter à Stripe : jamais le tien.",
        ],
        [
            shot("demarrer", 56, mark(1, 70.5, 75.6, (12.6, 90.7)), mark(2, 81, 86.6, (12.6, 90.7))),
            shot("sms", 56, mark(3, 22, 38, (12, 92))),
        ],
        ("Un captcha « sélectionnez les images… » ?", "Stripe vérifie qu’un humain est là : le gérant le résout et continue."),
    ),
    step(
        "paper", 2, "Le type d’entreprise", "Écran « Parlez-nous de votre entreprise »", "son Kbis",
        [
            act(1, "<b>Pays</b> : France."),
            act(2, "<b>Type d’entreprise</b> : <b>Société</b> pour une SAS, SARL, EURL… ; <b>Particulier / Entrepreneur individuel</b> pour un auto-entrepreneur."),
            act(3, "<b>Structure</b> : celle écrite sur son Kbis."),
        ],
        [shot("type", 86, mark(1, 30.9, 35.3, (10.5, 92.8)), mark(2, 52, 56.4, (10.5, 92.8)), mark(3, 65.5, 70, (10.5, 92.8)))],
    ),
    step(
        "dark", 3, "Les informations de l’entreprise", "Même écran, plus bas", "son Kbis",
        [
            act(1, "<b>Dénomination sociale</b> : le nom exact du Kbis (ex. « Le Comptoir SAS »)."),
            act(2, "<b>Nom commercial</b> : déjà rempli avec le nom du restaurant. Laisse-le : c’est ce que le client lit sur son relevé."),
            act(3, "<b>SIREN</b> (9 chiffres), adresse, téléphone de l’entreprise."),
        ],
        [shot("entreprise", 53, mark(1, 29.6, 32.8, (10.5, 92.8)), mark(2, 49.2, 52.4, (10.5, 92.8)), mark(3, 66.7, 70, (10.5, 92.8)), mark(3, 76.6, 96, (10.5, 92.8)))],
    ),
    step(
        "dark", 3, "Secteur et site web", "Même écran, encore plus bas", None,
        [
            act(4, "<b>Secteur</b> : « Restaurants et discothèques »."),
            act(5, "<b>Site web</b> : le menu n’existe pas encore. Touche « Vous n’avez pas de site Web ? Ajoutez une description » et écris par exemple « Restaurant : commande et paiement à table »."),
        ],
        [shot("secteur", 108, mark(4, 22.7, 28.2, (10.4, 92.8)), mark(5, 58.7, 66, (10.4, 92.8)))],
        suite=True,
    ),
    step(
        "paper", 4, "Le représentant du compte", "Écran « Complétez vos informations personnelles »", "sa pièce d’identité",
        [
            act(1, "Nom et prénom <b>tels que sur sa pièce d’identité</b>."),
            act(2, "E-mail, intitulé de poste (gérant, président…)."),
            act(3, "<b>Date de naissance</b> et <b>adresse personnelle</b>."),
            act(4, "Téléphone."),
        ],
        [shot("representant", 52, mark(1, 8.9, 16.9, (10.4, 92.8)), mark(2, 24.7, 28, (10.4, 92.8)), mark(2, 35.7, 39, (10.4, 92.8)), mark(3, 46.6, 50, (10.4, 37)), mark(3, 57.8, 79, (10.4, 92.8)), mark(4, 86.7, 90.3, (10.4, 92.8)))],
        ("Doit être fait par une personne qui peut signer pour l’entreprise :", "le gérant ou le président, pas un employé."),
    ),
    step(
        "dark", 5, "Les propriétaires", "Écran « Ajouter ou supprimer des propriétaires »", "nom, naissance et adresse des associés",
        [
            "Stripe demande chaque personne qui détient <b>plus de 25 %</b> de l’entreprise.",
            act(1, f"Touche {key('Ajouter un propriétaire')}."),
            act(2, "Le gérant se sélectionne lui-même s’il est associé, puis ajoute les autres."),
        ],
        [shot("proprietaires", 57, mark(1, 52.6, 56.3, (14.5, 88.7)), mark(2, 66.6, 70.4, (14.5, 88.7)), mark("!", 90, 93.8, (10, 93)))],
        ("Ne laisse pas la liste vide", "si le gérant détient des parts : Stripe bloque alors avec « Fournir des informations supplémentaires »."),
    ),
    step(
        "dark", 5, "Vérifier la liste", "Écran « Fournir des informations supplémentaires » : chaque personne ajoutée y est marquée « Terminé »", None,
        [act(3, f"Quand la liste est juste, {key('Continuer')}.")],
        [shot("informations", 110, mark(None, 48.9, 59.2, (14.8, 88.5)), mark(3, 69.4, 75))],
        suite=True,
    ),
    step(
        "paper", 6, "Attester", "Écran « Vérifier les personnes propriétaires »", None,
        [
            act(1, "Choisis <b>Attestation électronique</b> (recommandé) : quelques minutes, pas de document à envoyer."),
            act(2, f"Touche {key('Continuer')}."),
        ],
        [shot("attester", 72, mark(1, 48, 63.6), mark(2, 81.5, 84.7))],
    ),
    step(
        "paper", 6, "Signer", "Écran « Vérifier et signer »", None,
        [act(3, "Le gérant signe à l’écran pour confirmer la liste des propriétaires.")],
        [shot("signer", 68, mark(3, 66.5, 86.5))],
        ("La signature est celle du représentant", f"saisi à {goto('stripe-4', 'l’étape 4')}. Si ce n’est pas le gérant présent, il faudra la lui demander."),
        suite=True,
    ),
    step(
        "dark", 7, "Le compte pour les virements", "Écran « Ajouter un compte pour les virements »", "l’IBAN professionnel",
        [
            act(1, "Pays du compte : France."),
            act(2, "L’<b>IBAN du compte professionnel</b>, deux fois."),
            act(3, f"{key('Continuer')} : il accepte le mandat SEPA en même temps."),
        ],
        [shot("virements", 61, mark(1, 35, 38.7), mark(2, 44.4, 48), mark(2, 54, 57.7), mark(3, 80, 83.9))],
        ("Piège :", "un IBAN de compte personnel pour une société est souvent refusé à la vérification."),
    ),
    step(
        "paper", 8, "Vérifier son identité", "Écran « Vérifiez l’identité du représentant »", "sa pièce d’identité, son téléphone",
        [act(1, "Choisis <b>Selfie et photo d’identité</b> (recommandé).")],
        [shot("identite", 76, mark(1, 43, 65))],
        ("Rassure-le :", "ces données vont à Stripe, qui y est obligé par la loi. Ominin ne les voit pas."),
    ),
    step(
        "paper", 8, "La pièce et le selfie", "Écran « Téléchargez une pièce d’identité avec photo »", None,
        [
            act(2, "Le gérant choisit sa pièce (carte d’identité, passeport, titre de séjour…) et la photographie, puis prend un selfie."),
            act(3, "Stripe vérifie quelques secondes : « Vérification des informations personnelles »."),
        ],
        [shot("piece", 66, mark(2, 57.5, 84.3))],
        suite=True,
    ),
    step(
        "dark", 9, "Relire et envoyer", "Écran « Récapitulatif »", None,
        [
            act(1, "Relisez ensemble : dénomination, adresse, propriétaires, IBAN."),
            act(2, f"Une ligne marquée <b>« Non valide »</b> : touche {key('Modifier')} ou {key('Vérifier')} et corrige."),
            act(3, f"Touche {key('Accepter et envoyer')}. Stripe renvoie au questionnaire, qui passe à l’étape\u00a07 : HubRise."),
        ],
        [shot("recapitulatif", 50, mark(1, 1.6, 25), mark(None, 31.4, 65), mark(None, 72, 82), mark(2, 3, 5.8, (75, 91)), mark(3, 96.6, 99.6))],
        ("« Vérifiez vos informations fiscales » ?", "L’adresse ne correspond pas au SIREN : reprends celle du Kbis."),
    ),
    page(
        "paper",
        '<div class="title"><span class="kicker">Si ça coince</span><h2>Les cas qu’on rencontre</h2></div>'
        '<div class="cases">'
        f'<div class="glass"><h3>« Le lien Stripe a expiré. »</h3><p>La page est restée ouverte trop longtemps. Retouche {key("Créer mon compte Stripe")} : Stripe reprend où il en était.</p></div>'
        f'<div class="glass"><h3>« Fournir des informations supplémentaires. »</h3><p>Il manque un propriétaire à plus de 25 % : ajoute-le à {goto("stripe-5", "l’étape 5")}, puis continue.</p></div>'
        f'<div class="glass"><h3>« Il manque l’IBAN ou un associé. »</h3><p>{key("Faire plus tard")}, puis le gérant finit depuis son espace de gestion : un bandeau « Reliez votre compte Stripe » l’y attend.</p></div>'
        '<div class="glass"><h3>« Il hésite à donner ses papiers. »</h3><p>Obligation légale pour tout commerçant qui encaisse par carte ; les données vont à Stripe, pas à Ominin.</p></div>'
        "</div>"
        + callout("Support Ominin :", '<span class="mail">omininsupport@gmail.com</span>, avec une capture de l’écran.', "paper")
        + '<p class="note">Captures réalisées sur un compte Stripe de test : chez le gérant, le bandeau gris « compte de test » n’apparaît pas.</p>',
        anchor="coince",
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
