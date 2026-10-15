"use client";

import { useEffect, useState, type ReactNode } from "react";

/*
 * Un template se remonte à chaque navigation entre les pages du site (pas
 * entre la commande et son suivi, qui partagent un segment) : la page qui
 * arrive entre en fondu. Jamais au premier chargement, que la vitrine met
 * déjà en scène. Opacité seule : un transform sur ce conteneur décrocherait
 * la barre du panier, fixe, de la page de commande.
 */
let navigated = false;

export default function CyprienTemplate({ children }: { children: ReactNode }) {
  // Lu une fois au montage : un nouveau rendu de la même page ne rejoue rien.
  const [enter] = useState(() => navigated);

  useEffect(() => {
    navigated = true;
  }, []);

  return (
    <div className="cy-page" data-enter={enter || undefined}>
      {children}
    </div>
  );
}
