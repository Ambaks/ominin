#!/usr/bin/env bash
# Prépare un boîtier de référence au clonage : efface tout ce qui est propre à
# cette machine, puis éteint. La carte peut ensuite être copiée (dd, Raspberry
# Pi Imager) et servir de base à n'importe quel nouveau boîtier — au premier
# démarrage, le pont détecte un numéro de série inconnu, génère son propre
# jeton et s'annonce dans l'onglet Terminaux.
#
#   sudo ./golden-image.sh
#
# À ne jamais lancer sur un boîtier en service : le script éteint la machine et
# la dépaire du backend.
set -euo pipefail

ENV_FILE=/boot/firmware/omilink.env
COMPOSE_DIR=/home/omilink/omilink

[[ $EUID -eq 0 ]] || { echo "À lancer avec sudo." >&2; exit 1; }

read -rp "Ce boîtier sera dépairé puis éteint. Taper OUI pour continuer : " reply
[[ $reply == "OUI" ]] || { echo "Annulé."; exit 1; }

# Arrêt par systemd et non par `docker compose stop` : `stop` marque les
# conteneurs comme arrêtés par l'utilisateur, et `restart: unless-stopped` ne
# les relancerait plus au démarrage du clone.
systemctl stop docker.socket docker.service

# Le jeton et le numéro de série appartiennent à cette carte ; seul BACKEND_URL
# doit survivre au clonage.
sed -i -E '/^(DEVICE_TOKEN|DEVICE_SERIAL)=/d' "$ENV_FILE"

if command -v tailscale >/dev/null; then
  tailscale logout || true
  systemctl stop tailscaled || true
  rm -f /var/lib/tailscale/tailscaled.state
fi

# Régénérées au premier démarrage par omilink-firstboot.service.
rm -f /etc/ssh/ssh_host_*

# Vidé et non supprimé : systemd ne régénère l'identifiant que si le fichier
# existe et qu'il est vide.
truncate -s 0 /etc/machine-id
ln -sf /etc/machine-id /var/lib/dbus/machine-id

# Le Wi-Fi du site de référence n'a pas cours ailleurs, et le mot de passe
# voyagerait sur chaque carte. Prévoir un câble Ethernet à l'installation.
rm -f /etc/NetworkManager/system-connections/*.nmconnection

truncate -s 0 /var/lib/docker/containers/*/*-json.log 2>/dev/null || true
journalctl --rotate
journalctl --vacuum-time=1s
apt-get clean
rm -f /root/.bash_history /home/*/.bash_history

echo "Carte prête à être clonée. Extinction…"
shutdown -h now
