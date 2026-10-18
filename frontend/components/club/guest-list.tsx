"use client";

import { useState, type FormEvent } from "react";
import { Reveal } from "@/components/club/reveal";
import { createClient } from "@/lib/supabase/client";

/*
 * La liste d'invités d'une soirée : un nom, un nombre de personnes et un
 * téléphone (une inscription par numéro et par soirée), l'e-mail en option.
 * inscrire_guest_list (anonyme) tient le plafond, le nombre de personnes
 * par inscription et le numéro, et le dit en clair.
 */
export function GuestList({
  eventId,
  maxParty,
  initialLeft,
}: {
  eventId: string;
  maxParty: number;
  /** Places restantes ; null : sans plafond. */
  initialLeft: number | null;
}) {
  const [left, setLeft] = useState(initialLeft);
  const [name, setName] = useState("");
  const [party, setParty] = useState(1);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ name: string; party: number } | null>(null);

  const full = left !== null && left <= 0;
  const cap = Math.min(maxParty, left ?? maxParty);

  const submit = async (formEvent: FormEvent) => {
    formEvent.preventDefault();
    if (sending) return;
    setSending(true);
    setError(null);
    const db = createClient();
    const { error: rpcError } = await db.rpc("inscrire_guest_list", {
      p_event: eventId,
      p_name: name.trim(),
      p_party: party,
      p_phone: phone.trim(),
      p_email: email.trim(),
    });
    if (rpcError) {
      setError(rpcError.code === "P0001" ? rpcError.message : "Inscription impossible pour le moment.");
    } else {
      setDone({ name: name.trim(), party });
    }
    const { data } = await db.rpc("club_guest_list_restant", { p_event: eventId });
    setLeft(data ?? null);
    setSending(false);
  };

  return (
    <section className="club-section" data-chapter aria-labelledby="liste-titre">
      <Reveal className="club-guest">
        <header className="club-section-head">
          <p className="club-eyebrow">Liste d&rsquo;invités</p>
          <h2 id="liste-titre" className="club-h2">
            Sans table, sur la liste
          </h2>
          <p className="club-section-lead">
            Inscrivez-vous ici, puis donnez simplement votre nom à l&rsquo;entrée.
            {left !== null && !done && (
              <>
                {" "}
                <span className="club-nums club-guest-left">
                  {full ? "La liste est complète." : `${left} place${left > 1 ? "s" : ""} restante${left > 1 ? "s" : ""}.`}
                </span>
              </>
            )}
          </p>
        </header>

        {done ? (
          <div className="club-guest-done" role="status">
            <svg viewBox="0 0 48 48" aria-hidden className="club-guest-done-mark">
              <circle cx="24" cy="24" r="22" />
              <path d="M15 24.5l6 6 12-13" />
            </svg>
            <p className="club-sheet-title">C&rsquo;est noté, {done.name}.</p>
            <p className="club-sheet-text">
              {`${done.party === 1 ? "Vous êtes sur la liste." : `Vous êtes ${done.party} sur la liste.`} Donnez votre nom à l’entrée.`}
            </p>
          </div>
        ) : (
          <form className="club-form club-guest-form" onSubmit={submit}>
            <label className="club-field">
              <span>Nom et prénom</span>
              <input
                name="guest-name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={80}
                value={name}
                onChange={(input) => setName(input.target.value)}
                disabled={full}
              />
            </label>
            <div className="club-party">
              <span id="guest-party-label">Nombre de personnes</span>
              <div className="club-stepper" role="group" aria-labelledby="guest-party-label">
                <button
                  type="button"
                  onClick={() => setParty((value) => Math.max(1, value - 1))}
                  disabled={party <= 1 || full}
                  aria-label="Une personne de moins"
                >
                  −
                </button>
                <output className="club-nums" aria-live="polite">
                  {party}
                </output>
                <button
                  type="button"
                  onClick={() => setParty((value) => Math.min(cap, value + 1))}
                  disabled={party >= cap || full}
                  aria-label="Une personne de plus"
                >
                  +
                </button>
              </div>
            </div>
            <label className="club-field">
              <span>Téléphone</span>
              <input
                name="guest-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                value={phone}
                onChange={(input) => setPhone(input.target.value)}
                disabled={full}
              />
            </label>
            <label className="club-field">
              <span>
                E-mail <em>facultatif</em>
              </span>
              <input
                name="guest-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                onChange={(input) => setEmail(input.target.value)}
                disabled={full}
              />
            </label>
            {error && (
              <p className="club-error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="club-button club-button-gold club-button-block" disabled={sending || full}>
              {sending ? (
                <>
                  <span className="club-spinner" aria-hidden />
                  Inscription…
                </>
              ) : (
                "M'inscrire sur la liste"
              )}
            </button>
          </form>
        )}
      </Reveal>
    </section>
  );
}
