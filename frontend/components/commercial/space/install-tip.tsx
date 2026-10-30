"use client";

import { useState, useSyncExternalStore } from "react";
import { Modal } from "@/components/ui/modal";
import { primaryButton } from "./ui";

const SEEN_KEY = "commercial:install-tip-seen";
const noSubscription = () => () => undefined;

function alreadyHandled(): boolean {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if ((navigator as Navigator & { standalone?: boolean }).standalone) return true;
  try {
    return localStorage.getItem(SEEN_KEY) !== null;
  } catch {
    return false;
  }
}

const STEPS = {
  ios: ["Touche le bouton Partager de Safari, en bas de l’écran.", "Choisis « Sur l’écran d’accueil ».", "Touche « Ajouter »."],
  other: ["Ouvre le menu du navigateur (⋮).", "Choisis « Installer l’application » ou « Ajouter à l’écran d’accueil ».", "Confirme."],
};

/* Le tuto de la première arrivée sur le tableau de bord : mettre l'espace sur l'écran d'accueil. */
export function InstallTip() {
  const handled = useSyncExternalStore(noSubscription, alreadyHandled, () => true);
  const isIos = useSyncExternalStore(noSubscription, () => /iPhone|iPad|iPod/.test(navigator.userAgent), () => false);
  const [closed, setClosed] = useState(false);
  if (handled || closed) return null;

  const close = () => {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {}
    setClosed(true);
  };

  return (
    <Modal
      title="Mets l’espace sur ton écran d’accueil"
      onClose={close}
      footer={
        <button type="button" onClick={close} className={primaryButton}>
          C’est compris
        </button>
      }
    >
      <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
        {STEPS[isIos ? "ios" : "other"].map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className="mt-3 text-sm text-muted">
        Ouvre ensuite l’application depuis son icône et connecte-toi : avec Google, ou ton e-mail et ton code à 6 chiffres.
      </p>
    </Modal>
  );
}
