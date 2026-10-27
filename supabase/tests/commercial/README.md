# Tests SQL de l'espace commercial

Scripts d'assertions des lots 1 à 3 (cahier `docs/espace-commercial.md`, suivi
dans `docs/espace-commercial-suivi.md`). Chaque script rejoue un critère
d'acceptation en appelant les fonctions comme le ferait PostgREST : sous le
rôle `authenticated` d'un commercial A, d'un commercial B, d'un admin, ou sous
`service_role`. Tout tourne dans une transaction annulée à la fin.

## Lancer

Docker Desktop démarré, depuis la racine du dépôt (Git Bash) :

```sh
bash supabase/tests/commercial/run.sh              # base neuve + tous les tests
SKIP_SETUP=1 bash supabase/tests/commercial/run.sh 03   # relancer un script sur la base déjà montée
KEEP=0 bash supabase/tests/commercial/run.sh       # supprimer le conteneur à la fin
```

`run.sh` démarre un Postgres 16 jetable (`postgis/postgis:16-3.4-alpine`,
conteneur `omicom-pg`, port 54371), applique `supabase/tests/stubs.sql` (ce que
la plateforme Supabase fournit : rôles, `auth`, `storage`, extensions), puis
toutes les migrations, puis chaque `NN_*.sql` avec `psql -v ON_ERROR_STOP=1`,
et enfin `concurrence.sh` (deux sessions réelles qui déclarent le même
restaurant, puis le même commercial au plafond). Le premier échec arrête tout et affiche `ÉCHEC : <critère>`.

Les constantes du contrat sont lues dans `frontend/lib/legal/constants.ts` et
passées à `psql` (`-v CONFIRM_DAYS=7` …) : `01_reglages.sql` vérifie que
`commercial_settings` les recopie.

## Fichiers

- `fixtures.inc` : comptes (admin, commerciaux A, B, C non signé, D terminé),
  version du contrat, restaurants libres et cas de refus ; aides `pg_temp.act`,
  `pg_temp.ok`, `pg_temp.fails`.
- `01_reglages.sql` : réglages, droits sur les fonctions, quotas (critère 2 bis).
- `02_declarations.sql` : déclarer, confirmer, refuser, échéances (critères 1 à 5, 10).
- `03_visibilite.sql` : ce que voit chacun, passage sans suite, recherche (critères 6, 7).
- `04_reflet.sql` : reflet `crm_leads`, Léa, opposition, fin de contrat, admin (critères 8, 9, 9 bis, 9 ter ; 13.2).
- `concurrence.sh` : deux déclarations simultanées du même restaurant (critère 3), puis du même commercial au plafond de 1, puis deux tâches quotidiennes qui créent une seule relance J+1.
- `05_liens.sql` : liens fiche ↔ client, outil de rattachement (4.1, 13.2 n° 5).
- `06_inscription.sql` : lien d'inscription, Client Apporté, Projet, inscription sans lien, démos, Google, carte, fusion (lot 2).
- `07_commissions.sql` : assiette recalculée à la main sur les cinq sources, avoirs, relevés, régularisations, contestation et sa clôture, relevé final, rappel URSSAF (lot 3).
- `08_defauts.sql` : chaque défaut de la vérification indépendante corrigé côté base, rejoué (client déjà en service, déclaration reçue par e-mail, plafond et réservation échue, fin de contrat, opposition, lien capturé, quota, relances du jour).
- `09_defauts2.sql` : les défauts du second passage (N1 à N10) : fusion de fiches, client parti puis revenu, e-mail déjà échu, lien régénéré, deck, pièces, détail, contrat terminé, alerte « déjà client ? », rappels et abonnements.
- `10_defauts3.sql` : le troisième passage : démos lues par fonction, fusion dans une fiche opposée ou cliente, contrat terminé, mois jamais relevés, départ corrigé ou annulé, retour d'un client, seuil de nom, interlocuteurs d'Ominin, plafond et carence affichés.
- `11_defauts4.sql` : le quatrième passage : régularisation relevée une fois, client en service jamais attribué, rattachement et annulation de départ pendant une redéclaration, correction de départ ciblée, confirmation tacite d'un contrat terminé, relances J+n (rendez-vous fait, jour de l'échéance, retirées après coup, réglage normalisé).
