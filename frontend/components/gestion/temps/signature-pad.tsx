"use client";

import { useEffect, useRef, useState } from "react";

/*
 * Signature manuscrite, au doigt sur la tablette du comptoir. Enregistrée en
 * PNG sur fond blanc, comme sur le papier : elle reste lisible partout où on
 * la relit, quel que soit le thème de l'écran.
 */

const WIDTH = 600;
const HEIGHT = 180;
const INK = "#141414";
const STROKE = 2.6;

export function SignaturePad({
  onChange,
}: {
  /** Data URL PNG, ou null tant que rien n'est tracé. */
  onChange: (signature: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [drawn, setDrawn] = useState(false);

  const context = () => {
    const canvas = canvasRef.current;
    return canvas?.getContext("2d") ?? null;
  };

  const clear = () => {
    const ctx = context();
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    setDrawn(false);
    onChange(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    // Le tracé est net sur écran dense : le canvas porte les pixels de
    // l'appareil, les coordonnées restent celles du dessin.
    const ratio = window.devicePixelRatio || 1;
    canvas.width = WIDTH * ratio;
    canvas.height = HEIGHT * ratio;
    ctx.scale(ratio, ratio);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.strokeStyle = INK;
    ctx.lineWidth = STROKE;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const pointAt = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
    };
  };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = context();
    if (!ctx) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    const { x, y } = pointAt(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
    // Un simple point compte comme un paraphe.
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = context();
    if (!drawing.current || !ctx) return;
    const { x, y } = pointAt(event);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!drawn) setDrawn(true);
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    setDrawn(true);
    onChange(canvasRef.current?.toDataURL("image/png") ?? null);
  };

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        aria-label="Zone de signature"
        className="h-40 w-full touch-none rounded-xl border border-hairline bg-white"
        style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-faint">
          {drawn ? "Signature enregistrée." : "Signez avec votre doigt."}
        </p>
        <button
          type="button"
          onClick={clear}
          className="rounded-full border border-hairline px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
        >
          Effacer
        </button>
      </div>
    </div>
  );
}

/** Relecture d'une signature : toujours sur son fond blanc d'origine. */
export function SignatureThumb({
  signature,
  label,
}: {
  signature: string;
  label: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- data URL, hors next/image
    <img
      src={signature}
      alt={label}
      className="h-10 w-28 rounded border border-hairline bg-white object-contain"
    />
  );
}
