"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PUSH_PROMPT_DISMISSED_KEY } from "@/lib/gestion/constants";
import { getPushStatus } from "@/lib/push/client";
import { BellIcon } from "./icons";

/*
 * Invite unique vers la page Notifications, sur la page Commandes : tant que
 * l'appareil peut s'abonner (ou doit d'abord installer l'app sous iOS) et que
 * l'invite n'a pas été écartée, on la propose — c'est là que le push a le
 * plus de valeur.
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
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-hairline bg-surface px-4 py-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-raised">
        <BellIcon className="size-4.5 text-ember-1" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          Soyez prévenu des nouvelles commandes
        </p>
        <p className="text-xs leading-relaxed text-faint">
          Activez les notifications : cet appareil sonnera même en veille.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={dismiss}
          className="text-xs text-muted underline-offset-2 hover:underline"
        >
          Plus tard
        </button>
        <Link
          href="/gestion/notifications"
          className="ember-gradient rounded-full px-4 py-2 text-xs font-semibold text-background"
        >
          Activer
        </Link>
      </div>
    </div>
  );
}
