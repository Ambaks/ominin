"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { FOCUS_RING, RemiseView } from "@/components/gestion/remise/remise-view";
import { isMenuLink, orderIdOf } from "@/lib/gestion/remise-link";

/*
 * Le scanner de l'espace : l'appareil photo du téléphone de l'équipe, sans
 * quitter l'application. L'icône posée sur l'écran d'accueil de l'iPhone
 * reste ouverte, sa session aussi — l'appareil photo du téléphone, lui, ouvre
 * Safari, qui ne la partage pas, et un onglet de plus à chaque scan. Le code
 * du client porte l'adresse de sa remise (remise-link) : sa remise s'affiche
 * ici, puis « Scanner le suivant ». La caméra reste allumée d'un client à
 * l'autre : le suivant se lit tout de suite.
 *
 * Un dialogue natif (showModal) : au-dessus de tout, l'espace derrière inerte.
 * « Retour » le ferme au lieu de changer la page dessous.
 */

export function Scanner({
  venueId,
  returnTo,
  onClose,
}: {
  /** L'établissement ouvert dans l'espace. */
  venueId: string;
  /** Le bouton qui l'a ouvert : le focus y revient (iOS ne le pose pas au toucher). */
  returnTo: HTMLElement;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLParagraphElement>(null);
  const titleId = useId();
  const [orderId, setOrderId] = useState<string | null>(null);
  // Les commandes remises par ce scanner : le téléphone du client encore
  // tendu au « Scanner le suivant » ne rouvre pas la sienne en « Déjà remise ».
  // Un code qui n'a rien remis (réseau, pas prête…) se relit.
  const handed = useRef(new Set<string>());

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    titleRef.current?.focus();

    // Une entrée d'historique, copie de celle du routeur Next (comme les
    // feuilles du menu) : « Retour » referme le scanner. Empilée au tour
    // suivant : le double montage du mode strict ne laisse pas d'entrée
    // orpheline. Marquée de cette ouverture : celle d'un scanner d'avant un
    // rechargement ne passe pas pour lui.
    const opening = crypto.randomUUID();
    let pushed = false;
    const push = setTimeout(() => {
      history.pushState({ ...history.state, ominninScanner: opening }, "");
      pushed = true;
    });
    const onPopState = () => {
      if (pushed && history.state?.ominninScanner !== opening) onClose();
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      clearTimeout(push);
      window.removeEventListener("popstate", onPopState);
      if (pushed && history.state?.ominninScanner === opening) history.back();
      returnTo.focus({ preventScroll: true });
    };
  }, [onClose, returnTo]);

  const onCode = useCallback((text: string) => {
    const id = orderIdOf(text);
    if (!id) return isMenuLink(text) ? ("table" as const) : ("autre" as const);
    if (handed.current.has(id)) return "lu" as const;
    setOrderId(id);
    return null;
  }, []);

  const next = () => {
    setOrderId(null);
    titleRef.current?.focus({ preventScroll: true });
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      // Échap : le dialogue se ferme de lui-même, puis le dit.
      onClose={onClose}
      className={`m-0 flex h-dvh max-h-none w-full max-w-none flex-col p-0 ${
        orderId ? "bg-background text-foreground" : "bg-black text-white"
      }`}
    >
      <div
        className={`flex shrink-0 items-center justify-between gap-3 px-5 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] ${
          orderId ? "border-b border-hairline" : ""
        }`}
      >
        {/* Le nom du dialogue, pas un titre : celui du résultat ouvre la page. */}
        <p
          id={titleId}
          ref={titleRef}
          tabIndex={-1}
          className="font-display text-lg font-medium outline-none"
        >
          Scanner un code
        </p>
        <button
          type="button"
          onClick={onClose}
          className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${FOCUS_RING} ${
            orderId ? "border-hairline" : "border-white/40"
          }`}
        >
          Fermer
        </button>
      </div>
      <Camera active={orderId === null} onCode={onCode} />
      {orderId && (
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-5 pt-6">
            <RemiseView
              key={orderId}
              orderId={orderId}
              venueId={venueId}
              focusResult
              onHanded={() => handed.current.add(orderId)}
              actions={(manual) => (
                // Collé au bas de l'écran, la remise à faire comprise : rien ne
                // se cache sous une longue commande ni sur un petit téléphone.
                <div className="sticky bottom-0 -mx-5 mt-auto flex flex-col gap-2 bg-background px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
                  {manual?.action}
                  <button
                    type="button"
                    onClick={next}
                    className={`flex min-h-14 w-full items-center justify-center rounded-full px-5 text-base font-semibold ${FOCUS_RING} ${
                      manual?.primary
                        ? "border border-hairline"
                        : "bg-foreground text-background"
                    }`}
                  >
                    Scanner le suivant
                  </button>
                </div>
              )}
            />
          </div>
        </div>
      )}
    </dialog>
  );
}

/** Un code lu mais pas retenu : un autre code, le QR d'une table, une commande déjà remise ici. */
type Hint = "autre" | "table" | "lu";

const HINTS: Record<Hint, string> = {
  autre: "Ce n’est pas un code de retrait\u00a0: visez celui du ticket du client.",
  table: "C’est le QR d’une table\u00a0: visez le ticket sur le téléphone du client.",
  lu: "Ce code vient d’être lu\u00a0: visez celui du client suivant.",
};

type Problem = "refusee" | "absente" | "image" | "autre";

const PROBLEMS: Record<Problem, { title: string; body: string }> = {
  refusee: {
    title: "Appareil photo refusé",
    body: "Autorisez l’appareil photo pour ce site dans les réglages du téléphone, puis réessayez — ou scannez avec l’appareil photo du téléphone.",
  },
  absente: {
    title: "Pas d’appareil photo",
    body: "Cet appareil n’en a pas : scannez avec un téléphone.",
  },
  image: {
    title: "L’image ne démarre pas",
    body: "L’appareil photo est autorisé, mais son image ne s’affiche pas. Réessayez.",
  },
  autre: {
    title: "L’appareil photo ne s’ouvre pas",
    body: "Réessayez, ou scannez avec l’appareil photo du téléphone.",
  },
};

/** L'échec de la lecture vidéo, distinct d'un appareil photo refusé. */
class PlayError extends Error {}

/**
 * La caméra arrière, lue une fois par image neuve (requestVideoFrameCallback,
 * sinon à chaque rafraîchissement), sur le carré du centre — là où vise le
 * viseur. Le décodeur (jsQR) se charge pendant que la caméra démarre. Elle
 * reste allumée tant que le scanner est ouvert, la lecture en pause sur le
 * résultat (active) : la vidéo reste montée, cachée, pour repartir aussitôt.
 */
function Camera({
  active,
  onCode,
}: {
  active: boolean;
  /** Le texte d'un code lu ; rend ce qu'il faut dire s'il n'est pas retenu. */
  onCode: (text: string) => Hint | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const activeRef = useRef(active);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [hint, setHint] = useState<Hint | null>(null);
  // Chaque essai (Réessayer, piste coupée par le téléphone) relance la caméra.
  const [session, setSession] = useState(0);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    let live = true;
    let stream: MediaStream | null = null;
    let frame: { video: HTMLVideoElement; id: number } | { id: number } | null = null;
    let onVisible: (() => void) | null = null;
    const stop = () => stream?.getTracks().forEach((track) => track.stop());
    // Chargé pendant que la caméra démarre, attendu seulement ensuite.
    const decoder = import("jsqr");
    decoder.catch(() => {});

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new DOMException("", "NotSupportedError");
      }
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      stream = media;
      // Fermé pendant que la caméra démarrait : elle s'éteint aussitôt.
      if (!live) return stop();
      // Le téléphone verrouillé coupe la piste : au retour, elle repart.
      media.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (live) setSession((current) => current + 1);
      });
      const video = videoRef.current;
      if (!video) return stop();
      // Revenue au premier plan, l'image que le téléphone a mise en pause repart.
      onVisible = () => {
        if (document.visibilityState === "visible" && video.paused) {
          void video.play().catch(() => {});
        }
      };
      document.addEventListener("visibilitychange", onVisible);
      video.srcObject = media;
      await video.play().catch(() => {
        throw new PlayError();
      });
      const { default: jsQR } = await decoder;
      if (!live) return;

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error();
      const schedule = () => {
        frame =
          "requestVideoFrameCallback" in video
            ? { video, id: video.requestVideoFrameCallback(scan) }
            : { id: requestAnimationFrame(scan) };
      };
      const scan = () => {
        if (!live) return;
        if (activeRef.current && video.readyState >= video.HAVE_CURRENT_DATA) {
          const side = Math.min(video.videoWidth, video.videoHeight);
          if (canvas.width !== side) canvas.width = canvas.height = side;
          context.drawImage(
            video,
            (video.videoWidth - side) / 2,
            (video.videoHeight - side) / 2,
            side,
            side,
            0,
            0,
            side,
            side
          );
          const image = context.getImageData(0, 0, side, side);
          const code = jsQR(image.data, side, side, { inversionAttempts: "dontInvert" });
          if (code) setHint(onCode(code.data));
        }
        schedule();
      };
      schedule();
    };

    start().catch((error: unknown) => {
      stop();
      if (!live) return;
      const name = error instanceof DOMException ? error.name : "";
      setProblem(
        error instanceof PlayError
          ? "image"
          : name === "NotAllowedError" || name === "SecurityError"
            ? "refusee"
            : name === "NotFoundError" || name === "OverconstrainedError"
              ? "absente"
              : "autre"
      );
    });
    return () => {
      live = false;
      if (onVisible) document.removeEventListener("visibilitychange", onVisible);
      if (frame && "video" in frame) frame.video.cancelVideoFrameCallback(frame.id);
      else if (frame) cancelAnimationFrame(frame.id);
      stop();
    };
  }, [session, onCode]);

  if (problem) {
    return active ? (
      // Sur le noir de la caméra, comme le reste du scanner en visée.
      <div role="alert" className="mx-auto flex max-w-sm flex-1 flex-col items-center gap-3 px-6 py-12 text-center">
        <h3 className="font-display text-lg font-medium">{PROBLEMS[problem].title}</h3>
        <p className="text-sm leading-relaxed text-white/80">{PROBLEMS[problem].body}</p>
        <button
          type="button"
          onClick={() => {
            setProblem(null);
            setSession((current) => current + 1);
          }}
          className={`mt-2 min-h-12 rounded-full bg-white px-5 text-sm font-semibold text-black ${FOCUS_RING}`}
        >
          Réessayer
        </button>
      </div>
    ) : null;
  }
  return (
    <div
      aria-hidden={!active || undefined}
      className={active ? "relative flex-1 overflow-hidden" : "sr-only"}
    >
      <video
        ref={videoRef}
        muted
        playsInline
        aria-label="Image de l’appareil photo"
        className="absolute inset-0 size-full object-cover"
      />
      {/* Le viseur : le carré du centre, celui qui se lit ; le reste assombri. */}
      <div aria-hidden className="absolute inset-0 flex items-center justify-center">
        <div className="aspect-square w-2/3 max-w-xs rounded-3xl border-2 border-white/90 shadow-[0_0_0_100vmax_rgb(0_0_0/0.45)]" />
      </div>
      <p
        role="status"
        className="absolute inset-x-0 bottom-0 flex justify-center px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        {/* Sur un pavé sombre : lisible devant un comptoir clair. */}
        <span className="rounded-full bg-black/75 px-4 py-2 text-center text-sm font-medium text-white">
          {hint ? HINTS[hint] : "Visez le code sur le téléphone du client."}
        </span>
      </p>
    </div>
  );
}
