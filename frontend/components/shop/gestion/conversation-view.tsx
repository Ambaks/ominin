"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/shop/format";
import * as api from "@/lib/shop/gestion-api";
import type { ConversationWithMessages } from "@/lib/shop/types";
import { primaryButton, secondaryButton } from "./page-header";

export function ConversationView({ conversation }: { conversation: ConversationWithMessages }) {
  const router = useRouter();
  const toast = useToast();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    try {
      const result = await api.replyToConversation(conversation.id, body);
      toast.success("Réponse envoyée");
      if (result.warning) toast.error(result.warning);
      setBody("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Envoi impossible.");
    }
    setBusy(false);
  };

  const toggleStatus = async () => {
    try {
      await api.setConversationStatus(conversation.id, conversation.status === "open" ? "closed" : "open");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur.");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <ul className="flex flex-col gap-4 rounded-2xl border border-hairline bg-surface p-5">
        {conversation.shop_messages.map((m) => {
          const mine = m.sender === "shop";
          return (
            <li key={m.id} className={`flex flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
              <div className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-relaxed ${mine ? "ember-gradient text-background" : "border border-hairline bg-background"}`}>{m.body}</div>
              <span className="text-[11px] text-faint">
                {mine ? "Vous" : "Cliente"} · {formatDateTime(m.created_at)}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-3 rounded-2xl border border-hairline bg-surface p-5">
        <label htmlFor="reply" className="text-[11px] font-semibold uppercase tracking-wider text-faint">
          Répondre à {conversation.customer_name ?? conversation.customer_email}
        </label>
        <textarea id="reply" className={`${inputClass} min-h-28`} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Bonjour, merci pour votre message…" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-faint">Envoyée par e-mail{conversation.user_id ? " et visible dans son espace" : ""}.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => void toggleStatus()} className={secondaryButton}>
              {conversation.status === "open" ? "Clôturer" : "Rouvrir"}
            </button>
            <button type="button" onClick={() => void send()} disabled={busy || body.trim().length < 2} className={primaryButton}>
              Envoyer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
