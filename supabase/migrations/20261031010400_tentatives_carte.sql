-- La carte de chaque tentative de paiement en ligne : marque, type, pays
-- d'émission, portefeuille et 3-D Secure, pour lire ce que coûte chaque
-- encaissement. Jamais de numéro, de BIN ni d'empreinte. La dernière carte
-- essayée l'emporte ; null = l'encaisseur ne l'a pas dit (Square ne donne que
-- la marque et le type, SumUp et la démonstration rien).
alter table public.online_payment_attempts
  add column card_brand text,
  add column card_funding text,
  add column card_country text,
  add column card_wallet text,
  -- Le résultat de Stripe, 'none' pour un paiement passé sans 3-D Secure.
  add column three_ds text;
