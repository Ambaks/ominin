"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDateTime } from "@/lib/shop/format";
import type { ShopMessage } from "@/lib/shop/types";
import { Alert, Button, Textarea } from "./ui";

export function MessageBubbles({ messages, viewer }: { messages: ShopMessage[]; viewer: "customer" | "shop" }) {
  if (messages.length === 0) return <p className="text-sm text-shop-ink-soft">Aucun message.</p>;
  return (
    <ul className="flex flex-col gap-4">
      {messages.map((m) => {
        const mine = m.sender === viewer;
        return (
          <li key={m.id} className={`flex flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
            <div className={`max-w-[85%] whitespace-pre-line rounded-[18px] px-4 py-3 text-sm leading-relaxed ${mine ? "rounded-br-md bg-shop-accent text-shop-paper" : "rounded-bl-md border border-shop-line bg-shop-paper text-shop-ink"}`}>{m.body}</div>
            <span className="text-[11px] text-shop-ink-mute">
              {mine ? "Toi" : viewer === "shop" ? "Cliente" : "La boutique"} · {formatDateTime(m.created_at)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Réponse d'une cliente connectée : insérée via la route serveur (notification e-mail à la boutique). */
export function CustomerReplyForm({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch("/api/shop/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, body }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (response.ok) {
      setBody("");
      router.refresh();
    } else setError(data.error ?? "Impossible d'envoyer ta réponse.");
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label htmlFor="reply" className="text-[13px] font-medium text-shop-ink-soft">
        Répondre
      </label>
      <Textarea id="reply" value={body} onChange={(e) => setBody(e.target.value)} required minLength={2} maxLength={3000} placeholder="Ta réponse…" />
      {error && <Alert tone="error">{error}</Alert>}
      <Button type="submit" size="sm" className="w-fit" loading={busy}>
        Envoyer
      </Button>
    </form>
  );
}
