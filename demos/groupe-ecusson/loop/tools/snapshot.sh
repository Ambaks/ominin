#!/bin/bash
# Build de production figé de la vue groupe, servi sur :5210 pour les notateurs.
# Copie du worktree (sans .next) ; node_modules cloné une fois (APFS, copie à l'écriture).
set -euo pipefail
src=/Users/naiahoard/ominin-groupe/frontend
dst=/Users/naiahoard/ominin-groupe-work/build/frontend
mkdir -p "$dst"
rsync -a --delete --exclude .next --exclude node_modules ${EXCLUDE:-} "$src/" "$dst/"
[ -d "$dst/node_modules" ] || cp -Rc "$src/node_modules" "$dst/node_modules"
cd "$dst"
npx next build > /Users/naiahoard/ominin-groupe-work/build/build.log 2>&1
echo "build ok"
