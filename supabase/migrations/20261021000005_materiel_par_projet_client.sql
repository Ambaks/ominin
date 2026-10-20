-- Le matériel se suit depuis le Projet : un client y existe avant d'avoir un
-- établissement (prospect signé, boutique…). Les deux tables passent donc de
-- etablissement_id à projet_clients.id. Les lignes déjà saisies suivent leur
-- client du Projet ; celles d'un établissement absent du Projet sont écartées.

alter table public.client_materiel add column projet_client_id uuid
  references public.projet_clients (id) on delete cascade;
alter table public.client_caisse add column projet_client_id uuid
  references public.projet_clients (id) on delete cascade;

update public.client_materiel m set projet_client_id = c.id
  from public.projet_clients c where c.etablissement_id = m.etablissement_id;
update public.client_caisse m set projet_client_id = c.id
  from public.projet_clients c where c.etablissement_id = m.etablissement_id;

delete from public.client_materiel where projet_client_id is null;
delete from public.client_caisse where projet_client_id is null;

alter table public.client_materiel drop constraint client_materiel_pkey;
alter table public.client_materiel drop column etablissement_id;
alter table public.client_materiel alter column projet_client_id set not null;
alter table public.client_materiel add primary key (projet_client_id, item);

alter table public.client_caisse drop constraint client_caisse_pkey;
alter table public.client_caisse drop column etablissement_id;
alter table public.client_caisse alter column projet_client_id set not null;
alter table public.client_caisse add primary key (projet_client_id);
