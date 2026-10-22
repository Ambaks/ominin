import { createHash } from "node:crypto";

/** La base ne garde que l'empreinte de la clé du téléphone reconnu, jamais la clé. */
export const deviceFingerprint = (token: string) =>
  createHash("sha256").update(token).digest("hex");
