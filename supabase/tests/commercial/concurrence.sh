#!/usr/bin/env bash
# Critère 3 : deux déclarations simultanées du même restaurant, une seule
# passe. Deux sessions réelles, sur une copie jetable de la base migrée.
set -euo pipefail
name="${PG_CONTAINER:-omicom-pg}"
db=concurrence
run() { MSYS_NO_PATHCONV=1 docker exec -i "$name" psql -U postgres -v ON_ERROR_STOP=1 -q -o /dev/null "$@"; }

run -c "drop database if exists $db" -c "create database $db template postgres" 2>/dev/null
run -d "$db" -c '\i /work/tests/fixtures.inc'

declare_as() {
  run -d "$db" <<SQL
begin;
select set_config('request.jwt.claims', json_build_object('sub', '$1'::uuid, 'role', 'authenticated')::text, true),
       set_config('role', 'authenticated', true);
select public.commercial_declare('00000000-0000-0000-0000-000000000f01', '{menu}', '{"role": "Gérant"}');
select pg_sleep($2);
commit;
SQL
}

# A prend le verrou et le garde deux secondes ; B arrive pendant ce temps.
declare_as 00000000-0000-0000-0000-0000000000a1 2 &
sleep 0.5
declare_as 00000000-0000-0000-0000-0000000000b1 0
wait

result=$(MSYS_NO_PATHCONV=1 docker exec -i "$name" psql -U postgres -d "$db" -Atc "
  select count(*) filter (where status = 'pending') || ' '
      || count(*) filter (where status = 'refused' and refusal_reason = 'declared')
  from public.commercial_declarations where restaurant_id = '00000000-0000-0000-0000-000000000f01'")
run -c "drop database $db"
if [ "$result" != "1 1" ]; then
  echo "ÉCHEC : deux déclarations simultanées → attendu « 1 1 » (une en attente, une refusée), obtenu « $result »" >&2
  exit 1
fi
