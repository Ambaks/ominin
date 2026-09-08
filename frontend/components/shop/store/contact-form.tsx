"use client";

import { useState } from "react";
import { REPLY_DELAY_LABEL } from "@/lib/shop/constants";
import { useShop } from "./context";
import { Alert, Button, Field, Input, Select, Textarea } from "./ui";

export function ContactForm({ initialEmail, initialName }: { initialEmail?: string | null; initialName?: string | null }) {
  const { slug } = useShop();
  const [name, setName] = useState(initialName ?? "");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [subject, setSubject] = useState("Question sur un article");
  const [orderNumber, setOrderNumber] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<{ ok: boolean; message: string } | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const response = await fetch("/api/shop/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, name, email, subject, orderNumber: orderNumber || null, message }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setState(response.ok ? { ok: true, message: `Merci, ton message a bien été envoyé. On te répond ${REPLY_DELAY_LABEL}.` } : { ok: false, message: body.error ?? "Impossible d'envoyer le message." });
    setBusy(false);
  };

  if (state?.ok) return <Alert tone="success" title="Message envoyé">{state.message}</Alert>;

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ton nom" htmlFor="name">
          <Input id="name" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Adresse e-mail" htmlFor="email">
          <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Sujet" htmlFor="subject">
          <Select id="subject" value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option>Question sur un article</option>
            <option>Ma commande</option>
            <option>Livraison</option>
            <option>Cadeau ou commande spéciale</option>
            <option>Autre</option>
          </Select>
        </Field>
        <Field label="Numéro de commande" htmlFor="orderNumber" optional>
          <Input id="orderNumber" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value.toUpperCase())} placeholder="MB-2609-0001" />
        </Field>
      </div>
      <Field label="Ton message" htmlFor="message">
        <Textarea id="message" required minLength={5} value={message} onChange={(e) => setMessage(e.target.value)} className="min-h-40" placeholder="Dis-nous tout…" />
      </Field>
      {state && !state.ok && <Alert tone="error">{state.message}</Alert>}
      <Button type="submit" loading={busy} className="w-fit">
        Envoyer mon message
      </Button>
    </form>
  );
}
