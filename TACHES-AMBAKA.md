# Tâches manuelles

Étapes qu'un agent de code ne peut pas faire à ta place : elles se passent dans
des dashboards (Vercel, Supabase, Stripe, registrar DNS) auxquels il n'a pas
accès. Tant qu'elles ne sont pas faites, les fonctionnalités correspondantes
restent inertes en production — le code, lui, est en place.

## 1. Éclatement en sous-domaines (nouveau)

`ominin.com` ne sert plus que le portail. Le produit menu QR (landing, espace
de gestion, menus publics) a déménagé sur `menu.ominin.com`. Déployer ce code
avant les étapes ci-dessous ne casse rien : tant que la variable n'est pas
posée, les anciennes URLs (`ominin.com/m/…`, `/login`, `/gestion`) continuent
d'être servies telles quelles. **Respecter l'ordre** : l'étape Vercel doit
venir en dernier, c'est elle qui déclenche la bascule.

- [ ] **DNS** : créer l'enregistrement `menu` (CNAME vers `cname.vercel-dns.com`,
      comme `collect` et `clip`).
- [ ] **Supabase → Authentication → URL Configuration** : ajouter
      `https://menu.ominin.com/**` aux *Redirect URLs*. À faire **avant** la
      bascule : sans ça, la connexion et l'inscription cassent au moment où la
      variable est posée, puisque `/login` vivra sur ce host.
- [ ] **Google Cloud Console** (si le provider Google est activé) : ajouter
      `https://menu.ominin.com` aux origines JavaScript autorisées.
- [ ] **Vercel — sessions par host** : retirer la variable
      `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN` si elle existe, puis redéployer. Les
      sessions sont désormais volontairement séparées par sous-domaine — la
      laisser en place les repartagerait silencieusement entre produits.
- [ ] **Vercel — la bascule** : ajouter le domaine `menu.ominin.com` au projet,
      puis poser `NEXT_PUBLIC_MENU_HOST=menu.ominin.com` et redéployer.
      Vérifier au passage que `NEXT_PUBLIC_COLLECT_HOST` et
      `NEXT_PUBLIC_CLIP_HOST` sont bien renseignées.
- [ ] **Vérifier après bascule** : `ominin.com/m/trattoria-lucia` redirige vers
      `menu.ominin.com/m/trattoria-lucia` (les Cachets imprimés suivent), et la
      connexion à `menu.ominin.com/login` fonctionne.

Rien à changer côté Stripe : les URLs de retour (`success_url`, `return_url`,
webhooks) sont construites à partir du host de la requête, elles suivent donc
le déménagement toutes seules.

Les anciennes URLs (`ominin.com/m/<slug>`, `/gestion`, `/login`, `/onboarding`)
sont redirigées en 308 vers le nouveau host — les Cachets déjà imprimés
continuent de fonctionner. **Ne pas retirer ces redirections** tant que des
stickers de l'ancienne génération circulent.

## 2. Formulaire « sur mesure » (nouveau)

- [ ] **Migrations** : `supabase db push` pour appliquer les quatre migrations en
      attente — `20260805000001_collect_eta.sql`,
      `20260805000002_reserved_slugs.sql`,
      `20260810000001_collect_standalone.sql` (offre facultative + SIRET,
      inscription collect autonome),
      `20260810000002_contact_requests.sql`. Sans la dernière, le formulaire de
      `/sur-mesure` renvoie une erreur 500.
- [ ] **Resend** (notification e-mail des demandes) : créer un compte, vérifier
      le domaine d'envoi, puis poser dans Vercel `RESEND_API_KEY`,
      `CONTACT_NOTIFY_FROM` (adresse du domaine vérifié) et `CONTACT_NOTIFY_TO`
      (ta boîte). Non bloquant : sans ces variables le formulaire fonctionne, la
      demande est écrite dans `contact_requests`, seul l'e-mail est sauté.
- [ ] Après la migration, régénérer les types :
      `supabase gen types typescript --linked > frontend/lib/supabase/database.types.ts`
      (l'entrée `contact_requests` a été écrite à la main en attendant).

## 3. Reliquats des chantiers précédents

- [ ] **Supabase → Auth → Email Templates → Confirmation** : coller le contenu de
      `supabase/templates/confirmation.html` (le CLI de cette machine ne peut pas
      pousser les templates).
- [ ] **Ominin Clip** : créer le compte upload-post et poser
      `UPLOAD_POST_API_KEY` (+ `ANTHROPIC_API_KEY`) dans Vercel.
