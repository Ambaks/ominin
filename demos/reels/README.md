# Reels Instagram / Facebook

Premiers Reels des comptes Ominin, Ominin Menu et Ominin Collect : 1080×1920,
30 i/s, sans son, texte incrusté lisible sans le son. **Rien n'est publié** :
fichiers à valider par Marwan.

## Fabrication

Projet Remotion qui réutilise les scènes du film Ominin
(`marketing/linkedin-film` : téléphone 3D, écrans client, ticket cuisine,
scène « deux métiers ») sans les copier : `webpack.mjs` résout leurs imports
dans `node_modules` d'ici, et `AtFilm` (`src/kit.tsx`) rejoue un passage du
film sur le temps du Reel (accéléré, figé ou sauté). Rien d'O'Crousti : c'est
un prospect, pas un client.

Style des landings (`components/landing-kit`) : Geist 800 serré, fond
`#0c0a08`, mot surligné sur le dégradé braise de chaque offre (les paires des
carrousels, `frontend/lib/social/brands.ts`), étiquette à pastille. Zones
sûres des Reels : rien d'important dans les 250 px du haut ni les 350 px du
bas.

Seuls chiffres : le rapport public ominin.com/r7k2 (18 s contre 4 min 39) et
les tarifs de `frontend/lib/landing-data.ts`. Aucun client, témoignage ni
visage. Pas de musique : celle du film (Pixabay) n'est pas dans le dépôt ni
dans le checkout principal.

```
npm install
npm run studio                       # aperçu
npm run render                       # tous les Reels → out/
node scripts/render.mjs menu-tarif   # un seul
node scripts/render.mjs --sheets     # planches seules, depuis les MP4
```

`out/<id>.mp4`, `out/<id>-planche.png` (6 images clés) et
`out/review/<id>-chaque-seconde.png` (une image par seconde, pour la
relecture). `out/` est ignoré ; les MP4 et planches finaux (moins de 15 Mo
chacun) sont ajoutés de force.

## Les Reels

| Fichier | Compte | Accroche (0–2,4 s) | Durée | Note |
|---|---|---|---|---|
| menu-table-A | Menu | « Vos tables prennent les **commandes.** » | 17 s | relecture en cours |
| menu-table-B | Menu | « Plus personne n'attend **l'addition.** » | 17 s | relecture en cours |
| menu-tarif | Menu | « Le menu QR qui encaisse : **0 € par mois.** » | 16,5 s | relecture en cours |
| collect-fastfood-A | Collect | « « C'est prêt quand ? » **Fini.** » | 20 s | relecture en cours |
| collect-fastfood-B | Collect | « N° 42, **c'est prêt !** » (téléphone qui vibre) | 20 s | relecture en cours |
| collect-emporter | Collect | « À emporter. **Payé** avant d'arriver. » | 18 s | relecture en cours |
| ominin-18s-A | Ominin | « **4 min 39** pour qu'une commande payée au comptoir arrive en cuisine. » | 17 s | relecture en cours |
| ominin-18s-B | Ominin | « **18 s** pour qu'une commande payée depuis la table arrive en cuisine. » | 17 s | relecture en cours |
| ominin-borne | Ominin | « Chaque téléphone devient une **borne.** » | 18,4 s | relecture en cours |

A/B : trois paires d'accroches (menu-table, collect-fastfood, ominin-18s), le
reste du Reel identique.

## Légendes proposées

**menu-table** — Vos clients scannent le QR de leur table, commandent et paient depuis leur téléphone. La commande part aussitôt en cuisine, sans application à installer. menu.ominin.com
#restaurant #restaurateur #menuQR #paiementatable #commandeatable #gerantderestaurant #CHR

**menu-tarif** — 0 € d'abonnement : Ominin Menu se rémunère à 3 % des commandes payées en ligne (+ frais de carte). Les Cachets QR à votre logo : 1,50 € par table, une fois. Le détail sur menu.ominin.com
#restaurateur #menuQR #paiementatable #restaurant #gestionrestaurant #CHR

**collect-fastfood** — Votre client commande et paie depuis la file, reçoit son numéro du jour et l'heure où c'est prêt. Quand « C'est prêt ! » s'affiche, il vient chercher sa commande. collect.ominin.com
#fastfood #snack #restaurationrapide #clickandcollect #commandeenligne #gerantfastfood #burger

**collect-emporter** — Votre page de commande à votre nom : vos clients choisissent l'heure de retrait et paient avant d'arriver. 0 € par mois, 5 % des commandes à emporter payées en ligne (+ frais de carte). collect.ominin.com
#clickandcollect #venteaemporter #pizzeria #boulangerie #snack #restaurateur #commandeenligne

**ominin-18s** — Dans un bar-restaurant toulousain équipé d'Ominin, une commande payée en ligne arrive en cuisine en 18 s (médiane), contre 4 min 39 payée au comptoir. Toutes les données : ominin.com/r7k2
#restaurant #barrestaurant #toulouse #paiementatable #restauration #CHR

**ominin-borne** — Avec Ominin, le téléphone de vos clients devient une borne : ils commandent et paient eux-mêmes, la commande part en cuisine. Pour les restaurants comme pour les fast-foods. ominin.com
#restaurant #fastfood #bornedecommande #commandeenligne #restaurateur #CHR

## Limites

- Le numéro du jour (N° 42) et l'heure annoncée viennent du mode fast food,
  inclus dans Connect (menu.ominin.com) ; le Reel fast food finit sur
  collect.ominin.com comme demandé : à arbitrer.
- Écrans du film en 393 px de large : petits textes de l'interface lisibles
  seulement en plein écran.
