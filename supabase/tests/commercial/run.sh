#!/usr/bin/env bash
# Rejoue toutes les migrations sur un Postgres jetable, puis chaque script
# d'assertions de ce dossier. S'arrête au premier échec (ON_ERROR_STOP).
#   bash supabase/tests/commercial/run.sh          → base neuve, tests, conteneur gardé
#   KEEP=0 bash supabase/tests/commercial/run.sh   → conteneur supprimé à la fin
#   SKIP_SETUP=1 bash supabase/tests/commercial/run.sh 05  → tests seuls, sur la base déjà montée
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../../.." && pwd)"
name="${PG_CONTAINER:-omicom-pg}"
port="${PG_PORT:-54371}"
to_host() { if command -v cygpath >/dev/null; then cygpath -w "$1"; else echo "$1"; fi; }
psql_run() { MSYS_NO_PATHCONV=1 docker exec -i "$name" psql -U postgres -v ON_ERROR_STOP=1 -q "$@"; }

if [ "${SKIP_SETUP:-0}" != "1" ]; then
  docker rm -f "$name" >/dev/null 2>&1 || true
  docker run -d --name "$name" -e POSTGRES_PASSWORD=postgres -e POSTGRES_INITDB_ARGS="--encoding=UTF8 --locale=C" -p "$port:5432" postgis/postgis:16-3.4-alpine >/dev/null
  # L'image installe postgis par un premier serveur temporaire : attendre le vrai.
  until docker logs "$name" 2>&1 | grep -q "init process complete"; do sleep 1; done
  until docker exec "$name" pg_isready -U postgres -q 2>/dev/null; do sleep 1; done
  MSYS_NO_PATHCONV=1 docker exec "$name" mkdir -p /work
  docker cp "$(to_host "$root/supabase/tests/stubs.sql")" "$name:/work/stubs.sql"
  docker cp "$(to_host "$root/supabase/migrations")" "$name:/work/migrations"
  {
    echo '\i /work/stubs.sql'
    for file in "$root"/supabase/migrations/*.sql; do echo "\\i /work/migrations/$(basename "$file")"; done
  } | psql_run >/dev/null
  echo "migrations : $(ls "$root"/supabase/migrations/*.sql | wc -l) appliquées"
fi

# Valeurs du contrat (lib/legal/constants.ts), confrontées à commercial_settings.
consts=$(grep -oE "export const COMMERCIAL_[A-Z_]+ = [0-9]+" "$root/frontend/lib/legal/constants.ts" \
  | sed -E 's/export const COMMERCIAL_([A-Z_]+) = ([0-9]+)/-v \1=\2/')

MSYS_NO_PATHCONV=1 docker exec "$name" rm -rf /work/tests
docker cp "$(to_host "$here")" "$name:/work/tests"
for file in "$here"/${1:-[0-9]}*.sql; do
  [ -e "$file" ] || continue
  # shellcheck disable=SC2086
  psql_run $consts -o /dev/null -f "/work/tests/$(basename "$file")"
  echo "ok  $(basename "$file")"
done

if [ -z "${1:-}" ]; then
  PG_CONTAINER="$name" bash "$here/concurrence.sh"
  echo "ok  concurrence.sh"
fi

if [ "${KEEP:-1}" = "0" ]; then docker rm -f "$name" >/dev/null; fi
