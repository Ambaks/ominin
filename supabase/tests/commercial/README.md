# Tests SQL de l'espace commercial

Scripts d'assertions de l'espace commercial (cahier `docs/espace-commercial.md`).
Chaque script rejoue un critère d'acceptation en appelant les fonctions comme
le ferait PostgREST : sous le rôle `authenticated` d'un commercial A, d'un
commercial B, d'un admin, ou sous `service_role`. Tout tourne dans une
transaction annulée à la fin.

## Lancer

Docker Desktop démarré, depuis la racine du dépôt (Git Bash) :

```sh
bash supabase/tests/commercial/run.sh              # base neuve + tous les tests
SKIP_SETUP=1 bash supabase/tests/commercial/run.sh 05   # relancer un script sur la base déjà montée
KEEP=0 bash supabase/tests/commercial/run.sh       # supprimer le conteneur à la fin
```

`run.sh` démarre un Postgres 16 jetable (`postgis/postgis:16-3.4-alpine`,
conteneur `omicom-pg`, port 54371), applique `supabase/tests/stubs.sql` (ce que
la plateforme Supabase fournit : rôles, `auth`, `storage`, extensions), puis
toutes les migrations, puis chaque `NN_*.sql` avec `psql -v ON_ERROR_STOP=1`.
Le premier échec arrête tout et affiche `ÉCHEC : <critère>`.

Les constantes du contrat sont lues dans `frontend/lib/legal/constants.ts` et
passées à `psql` (`-v TERM_MONTHS=24` …) : `01_reglages.sql` vérifie que
`commercial_settings` les recopie.

## Fichiers

- `fixtures.inc` : comptes (admin, commerciaux A, B, C non signé, D terminé),
  version du contrat, restaurants libres, clients et opposition ; aides
  `pg_temp.act`, `pg_temp.ok`, `pg_temp.fails`.
- `01_reglages.sql` : réglages, droits sur les fonctions.
- `02_contrat.sql` : deck, pièces, notifications, option, terme et résiliation ; relevés de chaque mois, régularisation relevée une fois, détail ; départ d'un client posé, corrigé, annulé.
- `05_liens.sql` : liens fiche ↔ client, outil de rattachement (4.1, 13.2 n° 5).
- `07_commissions.sql` : assiette recalculée à la main sur les cinq sources, avoirs, relevés, régularisations, contestation et sa clôture, relevé final, rappel URSSAF.
- `12_carte.sql` à `17_retours.sql` : la carte, la visite, les demandes de visite, le tableau de bord et la commission des restaurants inscrits, la fin de contrat, le récap.
- `19_taux.sql` : taux propre à chaque commercial (jamais baissé, relevés envoyés figés à leur taux, régularisation à ce taux), motif de résiliation par Ominin.
