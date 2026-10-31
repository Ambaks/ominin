"use client";

import { useState } from "react";
import { missesNotice, pickupNotice } from "@/components/collect/pickup-fields";
import {
  OptionConfigurator,
  StaffLinesList,
  StaffMenu,
  useStaffOrder,
} from "@/components/gestion/commandes/order-picker";
import {
  ConfirmSheet,
  Field,
  GlassButton,
  Input,
  Notice,
  Select,
  Sheet,
  Textarea,
} from "@/components/gestion/ui";
import { AlertIcon } from "@/components/gestion/icons";
import { useToast } from "@/components/ui/toast";
import {
  firstPickupDay,
  formatClock,
  formatDayLong,
  isCalendarDay,
  parisDate,
  pickupSlots,
} from "@/lib/collect/hours";
import { CUSTOMER_NOTE_MAX_LENGTH, normalizePhone } from "@/lib/collect/shared";
import * as api from "@/lib/gestion/api";
import { describeError } from "@/lib/gestion/errors";
import type { GestionState } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu/format";

/*
 * Commande à emporter prise au comptoir ou au téléphone : « un Paris-Brest
 * huit parts pour mardi 10 h 30 ». Le jour et l'heure se choisissent dans les
 * horaires d'ouverture, sans tenir compte de la capacité des créneaux ni du
 * délai de commande des articles — l'équipe sait ce que le laboratoire peut
 * encore sortir ; un délai non tenu se confirme avant d'enregistrer.
 */
export function PickupOrderDialog({
  state,
  initialDay,
  onCreated,
  onClose,
}: {
  state: GestionState;
  /** Jour affiché dans Retraits : la commande s'y prend par défaut. */
  initialDay: string;
  /** La commande est enregistrée pour ce jour (AAAA-MM-JJ). */
  onCreated: (day: string) => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const { openingHours, collectSlotMinutes } = state.etablissement;
  // Relue quand on ouvre la liste des heures : les créneaux ne bougent pas
  // sous le doigt, et ne restent pas ceux de l'ouverture de la fenêtre.
  const [now, setNow] = useState(() => new Date());
  const today = parisDate(now);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  // Le jour affiché dans Retraits, ou le premier qui a encore un créneau :
  // à 22 h, aujourd'hui est déjà fini.
  const [day, setDay] = useState(() =>
    firstPickupDay(openingHours, initialDay < today ? today : initialDay, collectSlotMinutes, now)
  );
  const [pickupAt, setPickupAt] = useState("");
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmingNotice, setConfirmingNotice] = useState(false);

  const slots = pickupSlots(openingHours, day, collectSlotMinutes, now);
  // L'heure retenue, ou à défaut le premier créneau du jour choisi : les
  // fermetures et le délai des plats se jugent sur elle.
  const checkedAt = pickupAt || slots[0]?.toISOString();
  const order = useStaffOrder(state, checkedAt ? new Date(checkedAt) : undefined);
  // Le plat au plus long délai de la commande, quand l'heure choisie ne le
  // laisse pas : l'équipe décide, l'écran le lui rappelle.
  const items = state.categories.flatMap((category) => category.items);
  const notice = pickupNotice(
    order.lines.map((line) => ({
      name: line.name,
      noticeHours: items.find((item) => item.id === line.itemId)?.noticeHours,
    }))
  );
  const shortNotice = notice && checkedAt && missesNotice(notice, checkedAt, now) ? notice : null;

  const normalizedPhone = normalizePhone(phone);
  const complete =
    name.trim() !== "" && normalizedPhone !== null && pickupAt !== "" && order.lines.length > 0;
  // Le bouton désactivé dit ce qui manque (§ 3.9).
  const missing = !name.trim()
    ? "Indiquez le nom du client pour enregistrer."
    : !normalizedPhone
      ? "Indiquez un numéro pour joindre le client."
      : !pickupAt
        ? slots.length
          ? "Choisissez l'heure du retrait."
          : "Choisissez un jour où la boutique est ouverte."
        : order.lines.length === 0
          ? "Ajoutez au moins un article."
          : null;

  const submit = async () => {
    setSubmitted(true);
    if (!complete || sending) return;
    setSending(true);
    try {
      await api.createPickupOrder(
        { name: name.trim(), phone: normalizedPhone!, pickupAt, note: note.trim() },
        order.payload
      );
      toast.success(
        `Commande de ${name.trim()} enregistrée pour ${formatDayLong(day)} à ${formatClock(pickupAt)}, à régler au retrait.`
      );
      onCreated(day);
      onClose();
    } catch (error) {
      toast.error(describeError(error).message);
      setSending(false);
    }
  };

  const nameMissing = submitted && !name.trim();
  const phoneInvalid = submitted && !normalizedPhone;
  const timeMissing = submitted && !pickupAt;

  return (
    <>
      {/* Une seule feuille : le configurateur d'options y prend la place du
          formulaire, sans la refermer. */}
      <Sheet
        title="Commande à emporter"
        size="wide"
        onClose={onClose}
        footer={
          order.configuring ? undefined : (
            <>
              {missing && !sending && <p>{missing}</p>}
              <span className="mr-auto flex items-baseline gap-2">
                <span className="text-g-label text-muted">À régler au retrait</span>
                <span className="text-g-h2 tabular-nums">{formatPrice(order.total)}</span>
              </span>
              <GlassButton
                variant="primary"
                disabled={sending}
                onClick={() => (complete && shortNotice ? setConfirmingNotice(true) : void submit())}
              >
                {sending ? "Envoi…" : "Enregistrer"}
              </GlassButton>
            </>
          )
        }
      >
        {order.configuring ? (
          <OptionConfigurator
            item={order.configuring}
            onAdd={order.addLine}
            onBack={() => order.setConfiguring(null)}
          />
        ) : (
          <div className="flex flex-col gap-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Nom du client"
                required
                error={nameMissing ? "Indiquez le nom du client." : undefined}
              >
                <Input
                  data-autofocus
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="off"
                />
              </Field>
              <Field
                label="Téléphone"
                required
                error={
                  phoneInvalid
                    ? phone.trim()
                      ? "Numéro invalide : 10 chiffres, ou +indicatif."
                      : "Indiquez un numéro pour joindre le client."
                    : undefined
                }
              >
                <Input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  onBlur={() => normalizedPhone && setPhone(normalizedPhone)}
                  autoComplete="off"
                />
              </Field>
              <Field label="Jour du retrait" required>
                <Input
                  type="date"
                  value={day}
                  min={today}
                  onChange={(event) => {
                    if (!isCalendarDay(event.target.value)) return;
                    setDay(event.target.value);
                    setPickupAt("");
                  }}
                />
              </Field>
              <Field
                label="Heure"
                required
                error={
                  slots.length === 0
                    ? openingHours
                      ? "La boutique est fermée ce jour-là, ou ses créneaux sont passés."
                      : "Saisissez d'abord les horaires d'ouverture dans Réglages."
                    : timeMissing
                      ? "Choisissez l'heure du retrait."
                      : undefined
                }
              >
                <Select
                  value={pickupAt}
                  onChange={(event) => setPickupAt(event.target.value)}
                  onFocus={() => {
                    // Un créneau passé depuis ne reste pas retenu en coulisse.
                    const next = new Date();
                    setNow(next);
                    if (
                      pickupAt &&
                      !pickupSlots(openingHours, day, collectSlotMinutes, next).some(
                        (slot) => slot.toISOString() === pickupAt
                      )
                    ) {
                      setPickupAt("");
                    }
                  }}
                  disabled={slots.length === 0}
                >
                  <option value="" disabled>
                    {slots.length ? "Choisir" : "Fermé"}
                  </option>
                  {slots.map((slot) => (
                    <option key={slot.getTime()} value={slot.toISOString()}>
                      {formatClock(slot.toISOString())}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {shortNotice && (
              <Notice
                tone="info"
                title="Délai court"
                text={`${shortNotice.name} se commande d'habitude ${shortNotice.hours} h à l'avance : vérifiez que la commande pourra être prête à temps.`}
              />
            )}

            <Field label="Inscription, précisions" hint="Facultatif : ce que la préparation doit lire.">
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
                maxLength={CUSTOMER_NOTE_MAX_LENGTH}
                placeholder="« Joyeux anniversaire Léa », sans fruits à coque…"
              />
            </Field>

            <StaffLinesList order={order} />
            {submitted && order.lines.length === 0 && (
              <p role="alert" className="g-field-error -mt-3">
                <AlertIcon />
                <span>Ajoutez au moins un article.</span>
              </p>
            )}
            <StaffMenu order={order} />
          </div>
        )}
      </Sheet>

      {/* Hors de la feuille : la fermeture d'une confirmation imbriquée
          remonterait jusqu'au onClose de la commande. */}
      {confirmingNotice && shortNotice && (
        <ConfirmSheet
          title="Délai court"
          text={`« ${shortNotice.name} » se commande d'habitude ${shortNotice.hours} h à l'avance. La commande pourra-t-elle être prête pour ${formatDayLong(day)} à ${formatClock(pickupAt)} ?`}
          confirmLabel="Enregistrer quand même"
          cancelLabel="Changer l'heure"
          onClose={() => setConfirmingNotice(false)}
          onConfirm={() => {
            setConfirmingNotice(false);
            void submit();
          }}
        />
      )}
    </>
  );
}
