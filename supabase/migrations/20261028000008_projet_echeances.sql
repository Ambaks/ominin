-- Échéance d'une étape : le jour où elle doit être faite, minuit compris.
-- Demandée à chaque étape ajoutée depuis l'admin ; les pipelines clients
-- générées par projet_add_client en restent sans.
alter table public.projet_steps add column due_on date;
