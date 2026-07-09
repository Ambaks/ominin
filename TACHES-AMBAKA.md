# Tâches de configuration manuelle — pour Ambaka

Ces étapes **ne peuvent pas être faites par l'agent de code** : elles demandent
un accès aux tableaux de bord (Supabase, Vercel, Stripe) qui n'est pas
disponible depuis Claude Code sur nos machines. C'est donc à toi, Ambaka, de les faire une fois, à la main. Coche-les au fur et à mesure.

---

## 0. Appliquer la migration « commande client »  ⬅️ à faire (bloque le déploiement)

### À quoi ça sert

La **commande à table par le client** est construite : sur le menu QR, le client
ajoute des plats à un panier (avec choix d'options) et envoie la commande, qui
arrive **en direct** dans `/gestion/commandes`. Tout le code front est prêt et
vérifié dans le navigateur.

Il manque une chose côté base : une fonction Postgres `place_order` (fichier
`supabase/migrations/20260709000001_guest_orders.sql`) qui valide et fige la
commande côté serveur — les prix et suppléments sont relus en base, **jamais
fournis par le client**, donc impossible de trafiquer un montant. Aucune
insertion anonyme directe sur `orders` : tout passe par cette fonction.

### Pourquoi ce n'est pas déjà en ligne

Créer une fonction Postgres (DDL) demande un accès direct à la base — la CLI
Supabase authentifiée, ou l'éditeur SQL du dashboard — que l'agent n'a pas
depuis nos machines. Tant que la migration n'est pas appliquée, l'envoi d'une
commande échoue avec « Could not find the function public.place_order ». **C'est
pour ça que la commande client n'est pas encore déployée en prod** (elle reste
sur la branche `feature/database-workflow` pour ne pas donner un bouton qui
plante aux visiteurs de la démo).

### Étapes

1. Applique la migration, au choix :
   - **CLI** (si le projet est lié) : depuis la racine du repo, `supabase db push`.
   - **Dashboard** : Supabase → **SQL Editor** → colle le contenu de
     `supabase/migrations/20260709000001_guest_orders.sql` → **Run**.
2. Régénère les types pour que `place_order` soit typé côté front :
   `supabase gen types typescript --linked > frontend/lib/supabase/database.types.ts`
   (ou depuis le dashboard → API → TypeScript).
3. Préviens Marwan : il pourra alors tester une vraie commande de bout en bout
   (menu → panier → envoi → apparition live dans `/gestion/commandes`) puis
   merger `feature/database-workflow` dans `main` pour déployer.

> Les prochaines fonctionnalités qui touchent la base suivront le même
> chemin : nouvelle migration dans `supabase/migrations/`, à appliquer ici.

---

## 0 bis. Paiement à table — migration + variable Vercel  ⬅️ à faire

### À quoi ça sert

Le **paiement de l'addition par carte, depuis le téléphone du client**, est
construit (offre Connect). Chaque restaurant relie son propre compte Stripe
(onboarding Express depuis Gestion → Établissement → « Paiement à table ») :
l'argent des additions va **directement au restaurateur**, pas à Ominin.
Côté client : au moment d'envoyer la commande, choix « Payer au comptoir » /
« Payer par carte maintenant » → page Stripe → retour au menu.

### Étapes

1. **Appliquer la migration** `supabase/migrations/20260709000002_payments.sql`
   (mêmes méthodes que la section 0 : `supabase db push` ou SQL Editor).
   Elle ajoute `etablissements.online_payment`, la table `payment_accounts`
   (id de compte Stripe par resto, lecture membre uniquement) et
   `orders.paid_online`.
2. **Ajouter la variable dans Vercel** (Production) : `STRIPE_CONNECT_WEBHOOK_SECRET`
   — valeur dans `frontend/.env.local` sur la machine de Marwan (transmission
   sécurisée, pas d'email en clair). Le webhook Stripe des comptes connectés
   (`we_1Tr6fTJVLrNv9QpHU6EQjd6g` → `/api/stripe/webhook-connect`) est déjà
   créé côté Stripe.
3. Régénérer les types (comme section 0, étape 2) — plusieurs accès sont
   volontairement non typés dans le code en attendant.

> Stripe Connect est déjà activé sur le compte plateforme (vérifié par sonde).
> Après ces étapes, le parcours complet se teste : relier un compte Express de
> test depuis les réglages, activer le toggle, commander depuis le menu QR et
> payer par carte.

---

## 1. Brancher le nouvel email de confirmation d'inscription  ⬅️ à faire

### À quoi ça sert

Quand un restaurateur s'inscrit sur Ominin, Supabase lui envoie un email pour
qu'il confirme son adresse (le fameux « cliquez ici pour valider votre compte »).
Par défaut, Supabase envoie un email **moche, en anglais, générique** — mauvaise
première impression pour un produit qu'on vend comme premium.

Marwan a créé un email **dans la marque Ominin** : fond crème « carte papier »,
titre serif, accent ember, en français, avec la voix de la marque
(« Mise en place / Votre table est prête »). Le fichier est dans le repo :
[`supabase/templates/confirmation.html`](supabase/templates/confirmation.html).

### Pourquoi ce n'est pas déjà en ligne

Le fichier dans le repo n'est lu que par le **Supabase local** (le CLI, en
développement). Le **Supabase de production** — celui qui héberge la vraie base
et envoie les vrais emails — ne lit pas les fichiers du repo : ses modèles
d'email vivent **dans son tableau de bord en ligne**, séparément. Il faut donc
copier-coller le HTML une seule fois dans le dashboard.

### Étapes

1. Ouvre le projet Supabase → **Authentication** → **Emails** (ou « Email Templates »).
2. Sélectionne le modèle **« Confirm signup »**.
3. Dans **Subject**, mets :

   ```
   Confirmez votre adresse — votre table est prête
   ```

4. Dans **Message body**, colle tout le HTML ci-dessous (identique au fichier
   `supabase/templates/confirmation.html`, sans les commentaires).
5. Enregistre.
6. Vérifie : inscris-toi avec une vraie adresse à toi et regarde le rendu dans ta
   boîte (Gmail/Outlook affichent parfois autrement que l'aperçu du dashboard).

> ⚠️ **Ne touche pas aux deux `{{ .ConfirmationURL }}`** dans le HTML : c'est la
> variable que Supabase remplace par le vrai lien de confirmation. Si tu la
> supprimes, le bouton ne mène plus nulle part.

### HTML à coller

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>Confirmez votre adresse</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f6efe2;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6efe2;">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
            <tr>
              <td align="center" style="padding-bottom:24px;">
                <span style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:bold;color:#b5502a;letter-spacing:0.02em;">Ominin</span>
              </td>
            </tr>
            <tr>
              <td style="background-color:#fdf8ec;border:1px solid #e5dcc9;border-radius:16px;overflow:hidden;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td height="4" style="background-color:#b5502a;font-size:0;line-height:0;">&nbsp;</td>
                  </tr>
                  <tr>
                    <td style="padding:40px 40px 36px 40px;">
                      <p style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:0.24em;text-transform:uppercase;color:#b07a10;">
                        Mise en place
                      </p>
                      <h1 style="margin:0 0 16px 0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.2;font-weight:normal;color:#261e13;">
                        Votre table est prête.
                      </h1>
                      <p style="margin:0 0 28px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#6f5f4b;">
                        Bienvenue chez Ominin. Il ne reste qu&rsquo;un geste avant de passer en salle&nbsp;: confirmez que cette adresse est bien la v&ocirc;tre.
                      </p>
                      <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="border-radius:999px;background-color:#b5502a;">
                            <a href="{{ .ConfirmationURL }}"
                               style="display:inline-block;padding:13px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#fdf8ec;text-decoration:none;border-radius:999px;">
                              Confirmer mon adresse
                            </a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:28px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#a3927a;">
                        Le bouton ne fonctionne pas&nbsp;? Copiez ce lien dans votre navigateur&nbsp;:<br />
                        <a href="{{ .ConfirmationURL }}" style="color:#b5502a;word-break:break-all;">{{ .ConfirmationURL }}</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:24px 24px 0 24px;">
                <p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#a3927a;">
                  Vous n&rsquo;&ecirc;tes pas &agrave; l&rsquo;origine de cette inscription&nbsp;? Ignorez simplement cet email — rien ne sera cr&eacute;&eacute;.
                </p>
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#a3927a;">
                  Ominin — menus, commande et paiement &agrave; table.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## 2. Autres réglages dashboard en attente

Ces points aussi demandent tes accès (Vercel / Supabase) et bloquent la mise en
service complète du tunnel de vente. Détaillés pour mémoire :

### 2a. Variables Stripe dans Vercel

Le code de paiement Stripe est en place et poussé, mais deux variables manquent
dans Vercel (le webhook répond encore « STRIPE_WEBHOOK_SECRET manquante »).

- Vercel → projet Ominin → **Settings → Environment Variables → Production** :
  ajoute `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` (leurs valeurs sont dans
  `frontend/.env.local` sur la machine de Marwan — à transmettre de façon
  sécurisée, jamais par email/chat en clair).
- Puis **Redeploy** (les variables ne s'appliquent qu'au build suivant).
- Les 3 offres Stripe (Digital/Smart/Connect) et le webhook vers
  `https://www.ominin.com/api/stripe/webhook` sont déjà créés côté Stripe.

### 2b. URLs d'authentification Supabase

Pour que les liens de confirmation (email ci-dessus) et Google OAuth renvoient
vers le vrai site et non `localhost` :

- Supabase → **Authentication → URL Configuration** :
  - **Site URL** = `https://www.ominin.com`
  - Ajoute `https://www.ominin.com/auth/callback` aux **Redirect URLs**
    (garde aussi `http://localhost:3000/auth/callback` pour le dev).

---

## 3. Décision produit : nom propriétaire du sticker QR

Pas une tâche technique, mais une décision de marque à trancher (Ambaka +
Marwan) : donner un **nom propre** au sticker QR de table (« l'Étiquette »,
« le Pass'Table »…) au lieu de « QR code personnalisé ». Une fois choisi,
l'agent le déclinera partout (pricing, FAQ, section QR). Cf. les retours de
positionnement de la session de refonte de la landing.
