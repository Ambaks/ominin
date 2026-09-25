#!/bin/bash
# Serveur de dev et fraîcheur du CSS.
#
#   dev_server.sh status                 le serveur répond-il ?
#   dev_server.sh css-has <texte> [url]  le CSS SERVI contient-il <texte> ?
#   dev_server.sh restart                repart de zéro (rm -rf .next)
#
# Pourquoi : dans ce projet, Turbopack ne recompile pas toujours globals.css en
# dev. Le fichier source est à jour, la page sert l'ancienne feuille, et on
# juge un rendu qui n'existe pas. Après toute modification de globals.css,
# vérifier avec css-has un sélecteur que tu viens d'ajouter (ex.
# ".theme-mon-resto") ; s'il manque, restart.
#
# restart n'arrête que le serveur qui écoute sur le port 3000 — mais une autre
# session Claude peut justement partager celui-là. Ne relance jamais pendant
# qu'un correcteur ou un testeur tourne : il mesurerait une page qui disparaît.
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
base="http://localhost:3000"

case "${1:-}" in
  status)
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 "$base/" || true)
    echo "serveur de dev : ${code:-injoignable}"
    [ "$code" = "200" ] || [ "$code" = "307" ] || [ "$code" = "308" ]
    ;;

  css-has)
    needle="${2:?usage : dev_server.sh css-has <texte> [url]}"
    page="${3:-$base/}"
    found=0
    for css in $(curl -s --max-time 60 "$page" | grep -oE '/_next/static/[^"]+\.css' | sort -u); do
      n=$(curl -s --max-time 60 "$base$css" | grep -c -- "$needle" || true)
      echo "$css : $n"
      [ "$n" -gt 0 ] && found=1
    done
    if [ "$found" = 1 ]; then
      echo "« $needle » est servi."
    else
      echo "« $needle » ABSENT du CSS servi — lance : dev_server.sh restart"
      exit 1
    fi
    ;;

  restart)
    pids="$(lsof -ti tcp:3000 -sTCP:LISTEN 2>/dev/null || true)"
    [ -n "$pids" ] && kill $pids 2>/dev/null || true
    sleep 2
    rm -rf "$root/frontend/.next"
    log="${TMPDIR:-/tmp}/ominin-next-dev.log"
    (cd "$root/frontend" && nohup npm run dev >"$log" 2>&1 &)
    for _ in $(seq 1 90); do
      code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$base/" 2>/dev/null || true)
      if [ "$code" = "200" ] || [ "$code" = "307" ] || [ "$code" = "308" ]; then
        echo "serveur de dev relancé (journal : $log)"
        exit 0
      fi
      sleep 1
    done
    echo "le serveur ne répond pas — voir $log" >&2
    tail -20 "$log" >&2
    exit 1
    ;;

  *)
    sed -n '2,15p' "$0"
    exit 2
    ;;
esac
