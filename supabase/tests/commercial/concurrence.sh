#!/usr/bin/env bash
# Deux sessions réelles, sur une copie jetable de la base migrée :
#   critère 3 — deux déclarations simultanées du même restaurant, une seule passe ;
#   plafond   — deux déclarations simultanées du même commercial au plafond de 1,
#               une seule passe.
set -euo pipefail
name="${PG_CONTAINER:-omicom-pg}"
db=concurrence
run() { MSYS_NO_PATHCONV=1 docker exec -i "$name" psql -U postgres -v ON_ERROR_STOP=1 -q -o /dev/null "$@"; }
query() { MSYS_NO_PATHCONV=1 docker exec -i "$name" psql -U postgres -d "$db" -Atc "$1"; }

run -c "drop database if exists $db" -c "create database $db template postgres" 2>/dev/null
run -d "$db" -c '\i /work/tests/fixtures.inc'

# declare_as <utilisateur> <restaurant> <secondes de verrou gardées>
declare_as() {
  run -d "$db" <<SQL
begin;
select set_config('request.jwt.claims', json_build_object('sub', '$1'::uuid, 'role', 'authenticated')::text, true),
       set_config('role', 'authenticated', true);
select public.commercial_declare('$2', '{menu}', '{"role": "Gérant"}');
select pg_sleep($3);
commit;
SQL
}
a=00000000-0000-0000-0000-0000000000a1
b=00000000-0000-0000-0000-0000000000b1
fail() { run -c "drop database $db"; echo "ÉCHEC : $1" >&2; exit 1; }

# A prend le verrou et le garde deux secondes ; B arrive pendant ce temps.
declare_as $a 00000000-0000-0000-0000-000000000f01 2 &
sleep 0.5
declare_as $b 00000000-0000-0000-0000-000000000f01 0
wait
result=$(query "
  select count(*) filter (where status = 'pending') || ' '
      || count(*) filter (where status = 'refused' and refusal_reason = 'declared')
  from public.commercial_declarations where restaurant_id = '00000000-0000-0000-0000-000000000f01'")
[ "$result" = "1 1" ] || fail "deux déclarations simultanées → attendu « 1 1 » (une en attente, une refusée), obtenu « $result »"

# Plafond de 1 : B (sans autre déclaration) déclare r2 et garde la transaction, puis r3 en parallèle.
run -d "$db" -c "update public.commercial_settings set declaration_cap = 1"
declare_as $b 00000000-0000-0000-0000-000000000f02 2 &
sleep 0.5
declare_as $b 00000000-0000-0000-0000-000000000f03 0
wait
result=$(query "
  select count(*) filter (where status in ('pending', 'confirmed')) || ' '
      || count(*) filter (where status = 'refused' and refusal_reason = 'cap')
  from public.commercial_declarations where commercial_id = '00000000-0000-0000-0000-00000000bbbb'")
[ "$result" = "1 1" ] || fail "plafond 1, deux déclarations simultanées → attendu « 1 1 » (une active, une refusée), obtenu « $result »"

run -c "drop database $db"
