#!/usr/bin/env bash
# Construit un document : verre, PDF, images de relecture. Usage : build.sh <dossier avec index.html> <nom-du-fichier>
set -euo pipefail

FOLDER=$(cd "$1" && pwd)
NAME=$2
HERE=$(cd "$(dirname "$0")" && pwd)

CORE=${PLAYWRIGHT_CORE:-}
if [ -z "$CORE" ]; then
  for candidate in "$HOME"/.npm/_npx/*/node_modules/playwright-core; do
    [ -d "$candidate" ] && CORE=$candidate
  done
fi
if [ -z "$CORE" ]; then
  echo "playwright-core introuvable. Lance : npx -y playwright-core install chromium, puis pose PLAYWRIGHT_CORE sur son dossier." >&2
  exit 1
fi

touch "$FOLDER/bg.css"
node "$HERE/measure.cjs" "$FOLDER" "$CORE"
uv run --quiet --with numpy --with scipy --with pillow python "$HERE/glass.py" "$FOLDER"
RAW=$(mktemp -t ominin-pdf).pdf
node "$HERE/render.cjs" "$FOLDER" "$CORE" "$RAW"
uv run --quiet --with pypdf --with pymupdf python "$HERE/finish.py" "$RAW" "$FOLDER" "$NAME"
rm -f "$RAW"
