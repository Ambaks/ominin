-- Viva en mode ISV : Ominin crée le compte connecté du restaurant
-- (POST /isv/v1/accounts) et lui donne le lien d'ouverture. Le compte
-- marchand n'existe qu'une fois ce parcours fait : jusque-là, la ligne ne
-- porte que viva_account_id, et merchant_id reste vide. Un compte relié à la
-- main (démonstration, mode marchand) porte toujours son merchant_id.

alter table public.viva_accounts
  alter column merchant_id drop not null,
  add constraint viva_accounts_merchant_or_account
    check (merchant_id is not null or viva_account_id is not null);
