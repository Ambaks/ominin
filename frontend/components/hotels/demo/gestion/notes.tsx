"use client";

import { useState } from "react";
import { GlassButton, Sheet } from "@/components/gestion/ui";
import { LiveDot } from "@/components/hotels/ui";
import { roomLabel, staff } from "@/lib/hotels-demo-data";
import { formatPrice } from "@/lib/menu/format";
import { useDemo } from "../store";
import { FolioLines, Icon } from "../ui";
import { PageTitle } from "./kit";

/*
 * La note de chaque chambre ; celle de la chambre de la démo se remplit en
 * direct. L'envoi sur la facture est gardé avec l'état de la démo : le client
 * le voit sur sa note.
 */

export function Notes() {
  const { folio: lines, total, sent, sendNote } = useDemo();
  const [open, setOpen] = useState<string | null>(null);
  const slates = [
    { ...staff.notes.mine, lines, total, live: true },
    ...staff.notes.slates.map((s) => ({ ...s, total: s.lines.reduce((sum, l) => sum + l.amount, 0), live: false })),
  ];
  const slate = slates.find((s) => s.room === open);
  return (
    <div className="grid gap-5">
      <PageTitle title={staff.notes.title} sub={staff.notes.hint} />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {slates.map((s) => (
          <li key={s.room}>
            <button type="button" onClick={() => setOpen(s.room)} className={`g-plate g-press flex h-full w-full flex-col p-4 text-left ${s.live ? "g-money" : ""}`}>
              <span className="g-eyebrow flex items-center gap-2">
                {sent.includes(s.room) ? <Icon name="check" className="size-3.5 text-ember-1" /> : s.live && <LiveDot />}
                {sent.includes(s.room) ? staff.notes.sent : s.live ? staff.notes.live : staff.notes.slate}
              </span>
              <span className="kit-display mt-2 text-[1.9rem]">{roomLabel(s.room)}</span>
              <span className="text-xs text-muted">
                {s.guest} · {s.stay}
              </span>
              <span className="mt-4 flex items-baseline justify-between gap-3 border-t border-hairline pt-3">
                <span className="text-xs text-muted">{staff.notes.lines(s.lines.length)}</span>
                <span className="kit-display ember-text text-2xl tabular-nums">{formatPrice(s.total)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-faint">{staff.notesView.demo}</p>
      {slate && (
        <Sheet
          title={roomLabel(slate.room)}
          description={`${slate.guest} · ${slate.stay}`}
          onClose={() => setOpen(null)}
          footer={
            sent.includes(slate.room) ? (
              <p role="status" className="flex items-center gap-2 text-sm font-semibold">
                <Icon name="check" className="size-4 text-ember-1" />
                {staff.notes.sent}
              </p>
            ) : (
              <GlassButton variant="primary" onClick={() => sendNote(slate.room)}>
                {staff.notes.send}
              </GlassButton>
            )
          }
        >
          <FolioLines lines={slate.lines} total={slate.total} />
        </Sheet>
      )}
    </div>
  );
}
