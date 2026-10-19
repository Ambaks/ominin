-- Une formule peut porter une photo, comme un plat : son adresse publique
-- (bucket photos, ou URL collée par le gérant).

alter table public.formules add column image text;
