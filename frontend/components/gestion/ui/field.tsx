"use client";

import { createContext, useContext, useId, type ReactNode } from "react";
import { AlertIcon } from "@/components/gestion/icons";

interface FieldWiring {
  id: string;
  describedBy?: string;
  invalid: boolean;
}

const FieldContext = createContext<FieldWiring | null>(null);

/** Ce qu'un contrôle posé dans un Field reprend : id, description, invalidité. */
export function useField(): FieldWiring | null {
  return useContext(FieldContext);
}

/**
 * Un champ : étiquette en capitales, le contrôle, puis l'indication ou
 * l'erreur (jamais les deux). Le contrôle enfant (Input, Textarea, Select)
 * reçoit son id et sa description par contexte ; un contrôle maison les
 * reprend avec useField().
 */
export function Field({
  label,
  required = false,
  hint,
  error,
  className = "",
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  /** Ce qui bloque et comment le corriger ; prend la place de l'indication. */
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  const noteId = `${id}-note`;
  const note = error ?? hint;
  return (
    <div className={`g-field ${className}`}>
      <label htmlFor={id} className="g-field-label">
        {label}
        {required && <b aria-hidden>*</b>}
      </label>
      <FieldContext.Provider value={{ id, describedBy: note ? noteId : undefined, invalid: Boolean(error) }}>
        {children}
      </FieldContext.Provider>
      {error ? (
        <p id={noteId} role="alert" className="g-field-error">
          <AlertIcon />
          <span>{error}</span>
        </p>
      ) : (
        hint && (
          <p id={noteId} className="g-field-hint">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
