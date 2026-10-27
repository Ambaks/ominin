"use client";

import { WhatsappIcon } from "@/components/admin/icons";
import { ghostButton } from "./ui";

/** Partage d'un lien au gérant : WhatsApp, ou SMS. */
export function ShareLink({ url, title }: { url: string; title: string }) {
  const text = `${title} : ${url}`;
  return (
    <div className="flex shrink-0 gap-2">
      <a
        href={`https://wa.me/?text=${encodeURIComponent(text)}`}
        target="_blank"
        rel="noopener"
        aria-label={`Envoyer « ${title} » par WhatsApp`}
        className={`${ghostButton} px-3`}
      >
        <WhatsappIcon className="size-4" />
      </a>
      <a href={`sms:?&body=${encodeURIComponent(text)}`} aria-label={`Envoyer « ${title} » par SMS`} className={`${ghostButton} px-3`}>
        SMS
      </a>
    </div>
  );
}
