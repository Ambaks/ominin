"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PUSH_PROMPT_DISMISSED_KEY } from "@/lib/gestion/constants";
import { getPushStatus } from "@/lib/push/client";
import { BellIcon } from "./icons";
import { GlassButton, Notice } from "./ui";

/*
 * Invite unique vers Alertes, sur la page Commandes : tant que l'appareil
 * peut s'abonner (ou doit d'abord installer l'app sous iOS) et que l'invite
 * n'a pas été écartée, on la propose — c'est là que le push a le plus de
 * valeur. Un bandeau de verre : il compte dans le budget de la page.
 */

export function PushPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(PUSH_PROMPT_DISMISSED_KEY)) return;
    void getPushStatus().then((status) => {
      if (status === "off" || status === "needs-install") setVisible(true);
    });
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    window.localStorage.setItem(PUSH_PROMPT_DISMISSED_KEY, "1");
    setVisible(false);
  };

  return (
    <div data-visite="notifications-push">
      <Notice
        tone="info"
        icon={<BellIcon />}
        title="Soyez prévenu des nouvelles commandes"
        text="Activez les alertes : cet appareil sonnera même en veille."
        action={
          <span className="flex items-center gap-2">
            <GlassButton onClick={dismiss}>Plus tard</GlassButton>
            {/* Lien habillé par le kit : la visite cible ce repère, que
                GlassButton href ne transmet pas (demande faite à la tête). */}
            <Link
              href="/gestion/notifications"
              data-visite="notifications-activer"
              className="g-btn g-btn-primary g-press"
            >
              Activer
            </Link>
          </span>
        }
      />
    </div>
  );
}
