# Tâches manuelles

Ce fichier sert à noter les étapes qu'un agent de code ne peut pas faire à
notre place — un réglage dans un dashboard Supabase, Vercel ou Stripe, une
valeur à décider. Il se remplit au fil des chantiers.

## Refonte de la navigation admin (branche `claude/fervent-pasteur-6wfvqw`)

- [ ] **Avant de fusionner** : appliquer la migration
      `supabase/migrations/20261005000001_crm_produits_vises.sql`
      (`npm run db:push` depuis `frontend/`). Le front lit
      `crm_leads.target_products` au chargement du CRM : déployé sans la
      migration, l'admin affiche « Chargement impossible ».

L'ancienne liste reste consultable dans l'historique :
`git show 2df15e3:TACHES-AMBAKA.md`.
