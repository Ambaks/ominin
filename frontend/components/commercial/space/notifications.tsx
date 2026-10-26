"use client";

import { useEffect, useState } from "react";
import { Toggle } from "@/components/ui/toggle";
import { useRunMutation } from "@/components/ui/toast";
import { setPushPrefs, type PushEventKey } from "@/lib/commercial/api";
import { PUSH_EVENT_LABELS } from "@/lib/commercial/push-labels";
import { disablePush, enablePush, getPushStatus, type PushStatus, type PushTarget } from "@/lib/push/client";
import { commercialPrefix } from "@/lib/site";
import { createClient } from "@/lib/supabase/client";
import { SectionTitle, cardClass, ghostButton } from "./ui";

export const COMMERCIAL_PUSH: PushTarget = {
  api: "/api/commercial/push",
  worker: "/commercial-sw.js",
  scope: `${commercialPrefix}/`,
};

const STATUS_TEXT: Record<PushStatus, string> = {
  unsupported: "Ce navigateur ne reçoit pas de notifications.",
  "needs-install": "Sur iPhone, ajoutez d’abord l’espace à l’écran d’accueil.",
  denied: "Notifications refusées : rouvrez-les dans les réglages du navigateur.",
  off: "Désactivées sur cet appareil.",
  on: "Activées sur cet appareil.",
};

/** Notifications (lot 2) : cet appareil, et ce que le commercial veut recevoir. */
export function Notifications() {
  const run = useRunMutation();
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [prefs, setPrefs] = useState<Partial<Record<PushEventKey, boolean>> | null>(null);

  useEffect(() => {
    void getPushStatus().then(setStatus);
    void createClient()
      .from("commerciaux")
      .select("push_prefs")
      .single()
      .then(({ data }) => setPrefs((data?.push_prefs ?? {}) as Partial<Record<PushEventKey, boolean>>));
  }, []);

  if (!status || !prefs) return null;
  return (
    <section className="flex flex-col gap-2.5">
      <SectionTitle>Notifications</SectionTitle>
      <div className={`${cardClass} flex flex-col gap-3 text-sm`}>
        <p className="text-muted">{STATUS_TEXT[status]}</p>
        {(status === "off" || status === "on") && (
          <button
            type="button"
            onClick={() =>
              void run(async () => {
                if (status === "on") await disablePush(COMMERCIAL_PUSH);
                else await enablePush(COMMERCIAL_PUSH);
                setStatus(await getPushStatus());
              })
            }
            className={ghostButton}
          >
            {status === "on" ? "Couper sur cet appareil" : "Activer sur cet appareil"}
          </button>
        )}
        {(Object.keys(PUSH_EVENT_LABELS) as PushEventKey[]).map((key) => (
          <div key={key} className="flex items-center justify-between gap-3">
            <span>{PUSH_EVENT_LABELS[key]}</span>
            <Toggle
              checked={prefs[key] !== false}
              onChange={(checked) => {
                const next = { ...prefs, [key]: checked };
                setPrefs(next);
                void run(() => setPushPrefs(next));
              }}
              label={PUSH_EVENT_LABELS[key]}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
