#!/bin/bash
# Lance un script Playwright (.cjs) de ce dossier avec la version de Playwright
# la plus récente du cache npx — Playwright n'est pas une dépendance du projet.
#
#   pw.sh <script.cjs> [args...]
#
# Les scripts sont en CommonJS exprès : NODE_PATH ne s'applique qu'à require(),
# un import ESM ne trouverait pas le paquet.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
script="$1"
shift
[ -f "$script" ] || script="$here/$script"

modules="$(python3 - <<'PY'
import glob, json, os
best = None
for pkg in glob.glob(os.path.expanduser("~/.npm/_npx/*/node_modules/playwright/package.json")):
    version = tuple(int(p) for p in json.load(open(pkg))["version"].split(".")[:3])
    if best is None or version > best[0]:
        best = (version, os.path.dirname(os.path.dirname(pkg)))
print(best[1] if best else "")
PY
)"

if [ -z "$modules" ]; then
  echo "Playwright absent du cache npx. Installe-le une fois :" >&2
  echo "  npx -y playwright@latest install chromium" >&2
  exit 1
fi

NODE_PATH="$modules" exec node "$script" "$@"
