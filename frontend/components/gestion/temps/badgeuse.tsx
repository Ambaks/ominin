"use client";

import Link from "next/link";
import { useState } from "react";
import { GlassButton, GlassFrame, Input, Plate, Sheet } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import { describeError } from "@/lib/gestion/errors";
import { SERVICE_CLOCK_TICK_MS, STAFF_CODE_LENGTH } from "@/lib/gestion/constants";
import { formatTime } from "@/lib/gestion/format";
import { isPickupShop, visibleStaff } from "@/lib/gestion/selectors";
import { useGestion } from "@/lib/gestion/store";
import {
  clockIn,
  clockOut,
  formatDuration,
  minutesBetween,
  openEntry,
  type TimeEntry,
} from "@/lib/gestion/temps";
import type { Staff } from "@/lib/gestion/types";
import { useNow } from "@/lib/gestion/use-now";
import { SignaturePad } from "./signature-pad";

/*
 * La badgeuse du comptoir : deux gestes, arrivée et départ. Chacun se
 * désigne dans l'équipe, tape son code de badgeage quand sa fiche en a un,
 * puis signe — c'est la signature, figée avec le nom et l'heure, qui fait la
 * preuve du temps de travail ; le code, lui, dit que c'est bien la bonne
 * personne qui signe. L'écran est partagé et ne suppose donc pas que celui
 * qui badge est celui qui a ouvert la session : la tablette du restaurant est
 * connectée une fois pour toutes.
 */

type Action = "in" | "out";

const ACTION_LABELS: Record<Action, string> = {
  in: "Arrivée",
  out: "Départ",
};

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function Badgeuse({
  staff,
  entries,
  showHours,
  onChange,
}: {
  /** Équipe active : les fiches, avec ou sans compte. */
  staff: Staff[];
  /** Périodes de travail ouvertes, quelle que soit leur date. */
  entries: TimeEntry[];
  /** Durées de service : le gérant seul les lit, pas la salle. */
  showHours: boolean;
  onChange: () => void;
}) {
  const toast = useToast();
  const state = useGestion();
  const now = useNow(SERVICE_CLOCK_TICK_MS);
  const [action, setAction] = useState<Action | null>(null);
  const [chosen, setChosen] = useState<Staff | null>(null);
  const [code, setCode] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const team = visibleStaff(staff);
  const present = team.filter((s) => openEntry(entries, s.id));
  const absent = team.filter((s) => !openEntry(entries, s.id));
  const eligible = action === "out" ? present : absent;
  const needsCode = chosen?.codeSet ?? false;
  const codeReady = !needsCode || code.length === STAFF_CODE_LENGTH;
  const time = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const close = () => {
    setAction(null);
    setChosen(null);
    setCode("");
    setSignature(null);
  };

  const submit = async () => {
    if (!chosen || !signature || !codeReady) return;
    setBusy(true);
    const presented = needsCode ? code : null;
    try {
      if (action === "in") {
        await clockIn(chosen, presented, signature);
        toast.success(`Arrivée de ${chosen.name} enregistrée.`);
      } else {
        const open = openEntry(entries, chosen.id);
        if (!open) throw new Error("Aucune arrivée à clôturer.");
        await clockOut(open.id, presented, signature);
        toast.success(
          showHours
            ? `Départ de ${chosen.name} — ${formatDuration(
                minutesBetween(open.startedAt, new Date().toISOString())
              )} de service.`
            : `Départ de ${chosen.name} enregistré.`
        );
      }
      close();
      onChange();
    } catch (error) {
      toast.error(
        describeError(error).message
      );
      // La signature reste ; seul le code se retape.
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-g-gap">
      <GlassFrame hero entity="orders" eyebrow="Pointage" icon={<ClockIcon />}>
        <Plate className="flex flex-wrap items-end justify-between gap-4 p-5">
          <div>
            <p className="text-g-day tabular-nums">{time}</p>
            <p className="mt-2.5 text-g-label text-muted">
              {present.length > 0
                ? `${present.length} personne${present.length > 1 ? "s" : ""} en service`
                : "Personne en service"}
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-3 sm:w-auto sm:min-w-80">
            <button
              type="button"
              onClick={() => setAction("in")}
              disabled={absent.length === 0}
              className="g-press ember-gradient rounded-g-card px-6 py-5 font-display text-g-h2 text-background disabled:opacity-30"
            >
              Arrivée
            </button>
            <button
              type="button"
              onClick={() => setAction("out")}
              disabled={present.length === 0}
              className="g-press rounded-g-card border border-hairline bg-surface px-6 py-5 font-display text-g-h2 disabled:opacity-30"
            >
              Départ
            </button>
          </div>
        </Plate>
      </GlassFrame>

      {team.length === 0 && (
        <p className="text-g-label text-muted">
          Aucun {isPickupShop(state) ? "employé" : "serveur"} dans l&rsquo;équipe. Le gérant les
          ajoute depuis{" "}
          <Link href="/gestion/equipe" className="font-semibold text-foreground underline decoration-hairline underline-offset-2">
            Équipe
          </Link>
          .
        </p>
      )}

      {present.length > 0 && (
        <Plate className="divide-y divide-hairline px-4" aria-label="En service">
          {present.map((member) => {
            const open = openEntry(entries, member.id)!;
            return (
              <div
                key={member.id}
                className="flex min-h-g-control items-center justify-between gap-4 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-g-label font-semibold">{member.name}</p>
                  <p className="text-g-meta text-muted">Depuis {formatTime(open.startedAt)}</p>
                </div>
                {showHours && (
                  <span className="shrink-0 text-g-label font-semibold tabular-nums text-ember-1">
                    {formatDuration(minutesBetween(open.startedAt, now.toISOString()))}
                  </span>
                )}
              </div>
            );
          })}
        </Plate>
      )}

      {action && !chosen && (
        <Sheet title={`${ACTION_LABELS[action]} — qui êtes-vous ?`} onClose={close}>
          {eligible.length === 0 ? (
            <p className="text-g-label text-muted">
              {action === "in"
                ? "Toute l'équipe a déjà badgé son arrivée."
                : "Personne n'est en service."}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {eligible.map((member) => (
                <li key={member.id}>
                  <button
                    type="button"
                    onClick={() => setChosen(member)}
                    className="g-press flex min-h-14 w-full items-center justify-between gap-3 rounded-g-card border border-hairline bg-surface px-4 py-3 text-left"
                  >
                    <span className="truncate text-g-body font-semibold">{member.name}</span>
                    {action === "out" && (
                      <span className="shrink-0 text-g-meta tabular-nums text-muted">
                        Depuis {formatTime(openEntry(entries, member.id)!.startedAt)}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Sheet>
      )}

      {action && chosen && (
        <Sheet
          title={`${ACTION_LABELS[action]} de ${chosen.name}`}
          onClose={close}
          footer={
            <>
              <GlassButton
                onClick={() => {
                  setChosen(null);
                  setCode("");
                  setSignature(null);
                }}
              >
                Retour
              </GlassButton>
              <GlassButton
                variant="primary"
                disabled={!signature || !codeReady || busy}
                onClick={() => void submit()}
              >
                Valider
              </GlassButton>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <p className="text-g-label text-muted">
              {ACTION_LABELS[action]} à{" "}
              <span className="tabular-nums text-foreground">{time}</span>
              . {needsCode ? "Tapez votre code, puis signez." : "Signez pour confirmer."}
            </p>
            {needsCode && (
              <Input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                data-autofocus
                value={code}
                onChange={(event) =>
                  setCode(
                    event.target.value.replace(/\D/g, "").slice(0, STAFF_CODE_LENGTH)
                  )
                }
                aria-label="Code de badgeage"
                placeholder="••••"
                className="text-center tracking-[0.5em] placeholder:tracking-[0.5em]"
              />
            )}
            <SignaturePad onChange={setSignature} />
          </div>
        </Sheet>
      )}
    </section>
  );
}
