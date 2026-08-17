# Tâches manuelles

Étapes qu'un agent de code ne peut pas faire à ta place : elles se passent dans
des dashboards (Vercel, Supabase, Stripe, registrar DNS) auxquels il n'a pas
accès. Tant qu'elles ne sont pas faites, les fonctionnalités correspondantes
restent inertes en production — le code, lui, est en place.

## 0. CRM admin — admin.ominin.com (nouveau)

Le CRM de prospection terrain vit dans `app/admin/**`. Avant la bascule DNS,
il est servi sur `ominin.com/admin` (et en local sur `localhost:3000/admin`
ou `admin.localhost:3000`) — tout fonctionne dès l'étape 2. **Ordre à
respecter** : la bascule Vercel en dernier.

- [ ] **Supabase** : `supabase db push` — applique `20260810000003_crm.sql`
      (tables `crm_*`, allowlist `admin_users`, RLS, triggers) en plus des
      quatre migrations déjà en attente (§2).
- [ ] **Allowlist** : se connecter une première fois sur `/admin/connexion`
      avec chacun des deux comptes (« Continuer avec Google » crée le compte),
      puis dans Supabase → SQL editor :
      `insert into public.admin_users (user_id, email)
       select id, email from auth.users
       where email in ('marwan.almasri11@gmail.com', 'omininsupport@gmail.com')
       on conflict do nothing;`
      Sans cette étape, un compte connecté voit « Ce compte n'est pas dans
      l'allowlist admin ». Re-exécuter pour tout compte ajouté plus tard.
- [ ] **Types** : régénérer après le push —
      `supabase gen types typescript --linked > frontend/lib/supabase/database.types.ts`
      (les entrées `crm_*` ont été écrites à la main en attendant).
- [ ] **Données de démo** (facultatif) : depuis `frontend/`, `npm run seed:crm`
      — 25 restaurants fictifs de Montpellier au Grau-du-Roi, tous statuts,
      avec activités, tâches, RDV et tags. Réexécutable (purge par
      `source = 'seed'`).
- [ ] **DNS** : créer l'enregistrement `admin` (CNAME vers
      `cname.vercel-dns.com`, comme `collect` et `clip`).
- [ ] **Supabase → Authentication → URL Configuration** : ajouter
      `https://admin.ominin.com/**` aux *Redirect URLs* — **avant** la bascule.
- [ ] **Google Cloud Console** : ajouter `https://admin.ominin.com` aux
      origines JavaScript autorisées.
- [ ] **Vercel — la bascule** : ajouter le domaine `admin.ominin.com` au
      projet, poser `NEXT_PUBLIC_ADMIN_HOST=admin.ominin.com`, redéployer.
- [ ] **Vérifier après bascule** : `admin.ominin.com` anonyme redirige vers
      `/connexion` ; connecté + allowlisté, la carte affiche les marqueurs.

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
