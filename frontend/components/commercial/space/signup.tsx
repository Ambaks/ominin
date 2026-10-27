"use client";

import { useEffect, useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useRunMutation } from "@/components/ui/toast";
import * as api from "@/lib/commercial/api";
import { PRODUCT_CHOICES, type Product } from "@/lib/commercial/labels";
import { collectSiteUrl, menuSiteUrl, shopSiteUrl } from "@/lib/site";
import { ShareLink } from "./share-link";
import { useAccount } from "./shell";
import { SectionTitle, cardClass, ghostButton, primaryButton } from "./ui";

/** Tunnel d'inscription de chaque offre, où le jeton se lit dans ?c=. */
const TUNNELS: Partial<Record<Product, string>> = {
  menu: `${menuSiteUrl}/inscription`,
  collect: `${collectSiteUrl}/inscription`,
  shop: `${shopSiteUrl}/inscription`,
};

/*
 * Faire inscrire le restaurant (5.5) : le lien porte un jeton à usage unique ;
 * le gérant crée lui-même son compte et accepte lui-même les conditions.
 */
export function SignupLinkCard({ sheet }: { sheet: api.RestaurantSheet }) {
  const run = useRunMutation();
  const [token, setToken] = useState<string | null>(null);
  const offers = PRODUCT_CHOICES.filter((choice) => (sheet.products ?? []).includes(choice.id));

  return (
    <section className="flex flex-col gap-2.5">
      <SectionTitle>Inscription</SectionTitle>
      <div className={`${cardClass} flex flex-col gap-3`}>
        {token ? (
          <>
            <p className="text-sm text-muted">
              Envoyez ce lien au gérant : il crée son compte et accepte lui-même les conditions d’Ominin. Le lien ne
              sert qu’une fois.
            </p>
            {(offers.length ? offers : PRODUCT_CHOICES).map((offer) => {
              const url = `${TUNNELS[offer.id]}?c=${token}`;
              return (
                <div key={offer.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block font-medium">{offer.label}</span>
                    <span className="block truncate text-xs text-faint">{url.replace(/^https?:\/\//, "")}</span>
                  </span>
                  <ShareLink url={url} title={`Votre inscription à Ominin ${offer.label}`} />
                </div>
              );
            })}
          </>
        ) : (
          <>
            <p className="text-sm text-muted">
              Le restaurant a choisi une offre ? Créez son lien d’inscription : il s’inscrit, il devient votre Client Apporté.
            </p>
            <button
              type="button"
              onClick={() => void run(async () => setToken(await api.signupLink(sheet.mine!.id)))}
              className={primaryButton}
            >
              Créer le lien d’inscription
            </button>
          </>
        )}
      </div>
    </section>
  );
}

/** Démo à ses couleurs, avec les photos de la carte prises sur place. */
export function DemoCard({ sheet }: { sheet: api.RestaurantSheet }) {
  const account = useAccount();
  const run = useRunMutation();
  const declarationId = sheet.mine!.id;
  const [requests, setRequests] = useState<api.DemoRequest[] | null>(null);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const load = () => api.demoRequests(declarationId).then(setRequests);
  useEffect(() => {
    void api.demoRequests(declarationId).then(setRequests);
  }, [declarationId]);

  const send = () =>
    void run(async () => {
      setBusy(true);
      try {
        await api.requestDemo(account.id, declarationId, note, photos);
        setOpen(false);
        setNote("");
        setPhotos([]);
        await load();
      } finally {
        setBusy(false);
      }
    }, "Demande envoyée à Ominin");

  const done = requests?.find((request) => request.status === "done");
  const waiting = requests?.some((request) => request.status === "requested");

  return (
    <section className="flex flex-col gap-2.5">
      <SectionTitle>Démo à ses couleurs</SectionTitle>
      <div className={`${cardClass} flex flex-col gap-3 text-sm`}>
        {done?.demo_url && (
          <div className="flex items-center justify-between gap-3">
            <a href={done.demo_url} target="_blank" rel="noopener" className="font-medium text-ember-1">
              Ouvrir sa démo
            </a>
            <ShareLink url={done.demo_url} title={`Votre carte sur Ominin`} />
          </div>
        )}
        {waiting ? (
          <p className="text-muted">Demande envoyée : Ominin prépare sa démo.</p>
        ) : (
          <button type="button" onClick={() => setOpen(true)} className={ghostButton}>
            Demander une démo à ses couleurs
          </button>
        )}
      </div>
      {open && (
        <Modal
          title="Démo à ses couleurs"
          onClose={() => setOpen(false)}
          footer={
            <button type="button" onClick={send} disabled={busy || !photos.length} className={`${primaryButton} w-full`}>
              {busy ? "Envoi…" : "Envoyer"}
            </button>
          }
        >
          <div className="flex flex-col gap-4">
            <Field label="Photos de la carte" required hint="Prenez chaque page, lisible.">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={(event) => setPhotos([...photos, ...Array.from(event.target.files ?? [])])}
                className="text-sm"
              />
            </Field>
            {photos.length > 0 && <p className="text-sm text-muted">{photos.length} photo(s) prête(s).</p>}
            <Field label="Pour Ominin">
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                placeholder="Couleurs, logo, plats à mettre en avant…"
                className={`${inputClass} resize-none`}
              />
            </Field>
          </div>
        </Modal>
      )}
    </section>
  );
}
