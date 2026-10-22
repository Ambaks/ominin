"use client";

import { useEffect, useRef, useState } from "react";
import { reducedMotion } from "./loyalty-card";
import type { WinTier } from "./wheel-motion";

const SOUND_KEY = "ominin-roue-son";

/**
 * Le claquement des taquets, pris sur une vraie roue de fête foraine
 * (« prize wheel », tony_bear, Freesound, CC0) : quatre coups isolés de
 * 80 ms, un toutes les 100 ms du fichier. WAV, sans le silence d'amorce d'un
 * MP3 qui décalerait chaque coup de l'aiguille.
 */
const CLICKS_URL = "/sons/roue-clics.wav";
const CLICK_SLOTS = 4;

/**
 * Les sons de la roue : le claquement enregistré des taquets (synthétisé
 * tant que le fichier n'est pas là), et, synthétisés, le souffle du lancer,
 * l'arpège d'un gain — deux notes pour un petit lot, toute la gamme pour le
 * gros — et le tintement des pièces à chaque vague. Coupés d'un toucher, même
 * en plein tour ; le choix se garde.
 */
export function useWheelSound() {
  const context = useRef<AudioContext | null>(null);
  const lastTick = useRef(0);
  const lastSlot = useRef(0);
  // Le fichier se télécharge à l'ouverture ; il se décode au lancer, sous le geste.
  const clicksFile = useRef<Promise<ArrayBuffer> | null>(null);
  const clicks = useRef<AudioBuffer | null>(null);
  const [on, setOn] = useState(() => {
    try {
      return localStorage.getItem(SOUND_KEY) !== "off";
    } catch {
      return true;
    }
  });
  const onRef = useRef(on);
  useEffect(() => {
    onRef.current = on;
  }, [on]);
  // Le son coupé ou le mouvement réduit, rien à télécharger.
  const loadClicks = () => {
    clicksFile.current ??= fetch(CLICKS_URL).then((response) => response.arrayBuffer());
    // Hors ligne : le claquement synthétisé prend le relais.
    clicksFile.current.catch(() => {});
    return clicksFile.current;
  };

  useEffect(() => {
    if (onRef.current && !reducedMotion()) loadClicks();
    return () => {
      void context.current?.close();
      context.current = null;
    };
  }, []);

  const audio = () => {
    if (!onRef.current || reducedMotion()) return null;
    try {
      context.current ??= new AudioContext();
    } catch {
      // Pas de Web Audio (ou plus de contexte libre) : la roue tourne en silence.
      return null;
    }
    return context.current;
  };

  const decodeClicks = (ctx: AudioContext) =>
    loadClicks()
      .then((file) => ctx.decodeAudioData(file.slice(0)))
      .then((buffer) => {
        clicks.current = buffer;
      }, () => {});

  const note = (ctx: AudioContext, frequency: number, at: number, length: number, type: OscillatorType, peak: number) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(peak, at + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(at);
    oscillator.stop(at + length + 0.02);
    return oscillator;
  };

  return {
    on,
    toggle: () => {
      setOn(!on);
      try {
        localStorage.setItem(SOUND_KEY, on ? "off" : "on");
      } catch {}
      // Rallumé (sous le geste) : le claquement enregistré se décode tout de suite.
      if (!on) {
        onRef.current = true;
        const ctx = audio();
        if (!ctx) return;
        void ctx.resume();
        if (!clicks.current) decodeClicks(ctx);
      }
    },
    /** Au toucher du bouton : iOS n'ouvre le son que sous un geste. */
    whoosh: () => {
      const ctx = audio();
      if (!ctx) return;
      void ctx.resume();
      if (!clicks.current) decodeClicks(ctx);
      const length = 0.6;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * length, ctx.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      source.buffer = buffer;
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(300, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + length);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + length);
      source.connect(filter).connect(gain).connect(ctx.destination);
      source.start();
    },
    /**
     * Un claquement, `delay` secondes plus tard sur l'horloge audio ; un par
     * 25 ms au plus : au-delà, un bourdon. Jamais deux fois le même coup de
     * suite, chacun un rien plus haut ou plus bas : une roue, pas une boucle.
     * Retenu à pleine vitesse, net sur les derniers taquets.
     */
    tick: (speed: number, delay: number) => {
      const ctx = audio();
      if (!ctx) return;
      const at = ctx.currentTime + delay;
      if (at - lastTick.current < 0.025) return;
      lastTick.current = at;
      const level = speed > 0.7 ? 0.45 : speed < 0.12 ? 0.9 : 0.65;
      const buffer = clicks.current;
      if (buffer) {
        lastSlot.current = (lastSlot.current + 1 + Math.floor(Math.random() * (CLICK_SLOTS - 1))) % CLICK_SLOTS;
        const source = ctx.createBufferSource();
        const gain = ctx.createGain();
        source.buffer = buffer;
        source.playbackRate.value = 0.96 + Math.random() * 0.08;
        gain.gain.value = level;
        source.connect(gain).connect(ctx.destination);
        source.start(at, (lastSlot.current * buffer.duration) / CLICK_SLOTS, buffer.duration / CLICK_SLOTS);
        return;
      }
      const frequency = 900 + Math.min(1100, speed * 1200);
      const oscillator = note(ctx, frequency, at, 0.035, "triangle", level * 0.14);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.7, at + 0.03);
    },
    win: (tier: WinTier) => {
      const ctx = audio();
      if (!ctx) return;
      const scale = {
        small: [784, 1047],
        mid: [523, 659, 784, 1047],
        jackpot: [523, 659, 784, 1047, 784, 1047, 1319, 1568],
      }[tier];
      scale.forEach((frequency, i) => note(ctx, frequency, ctx.currentTime + i * 0.09, 0.35, "triangle", 0.16));
      // Le gros lot frappe : un coup sourd sous la secousse.
      if (tier === "jackpot") note(ctx, 90, ctx.currentTime, 0.18, "sine", 0.25);
      const waves = { small: 2, mid: 3, jackpot: 4 }[tier];
      for (let wave = 0; wave < waves; wave++) {
        const at = ctx.currentTime + 0.05 + wave * 0.18;
        note(ctx, 2637, at, 0.22, "sine", 0.06);
        note(ctx, 3136, at + 0.05, 0.26, "sine", 0.045);
      }
    },
  };
}
