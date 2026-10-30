"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { TYPE_DEMOS } from "@/lib/commercial/demos";
import type { SignupKind } from "@/lib/commercial/signup-form";
import { commercialPrefix } from "@/lib/site";
import { ShareLink } from "./share-link";
import { cardClass, ghostButton, primaryButton } from "./ui";

/*
 * Présentations et démos : un type d'établissement, puis son deck ou sa démo,
 * et pour la démo, le menu du client ou l'espace de gestion. Le deck s'ouvre
 * en navigation complète : le service worker le garde pour le hors ligne.
 */
export function Presentations({ kinds }: { kinds: { kind: SignupKind; label: string }[] }) {
  const [open, setOpen] = useState<{ kind: SignupKind; label: string } | null>(null);
  const [showDemo, setShowDemo] = useState(false);
  const demo = open && TYPE_DEMOS[open.kind];

  return (
    <>
      <ul className="grid grid-cols-2 gap-2">
        {kinds.map((type) => (
          <li key={type.kind}>
            <button
              type="button"
              onClick={() => {
                setOpen(type);
                setShowDemo(false);
              }}
              className={`${cardClass} block w-full text-left font-medium`}
            >
              {type.label}
            </button>
          </li>
        ))}
      </ul>
      {open && demo && (
        <Modal title={showDemo ? `Démo : ${demo.name}` : open.label} onClose={() => setOpen(null)}>
          {showDemo ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <a href={demo.menu} target="_blank" rel="noopener" className={`${primaryButton} flex-1`}>
                  Le menu
                </a>
                <ShareLink url={demo.menu} title={demo.name} />
              </div>
              <a href={demo.gestion} target="_blank" rel="noopener" className={ghostButton}>
                L’espace de gestion
              </a>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <a href={`${commercialPrefix}/espace/ressources/decks/${open.kind}`} className={primaryButton}>
                Le deck
              </a>
              <button type="button" onClick={() => setShowDemo(true)} className={ghostButton}>
                La démo
              </button>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
