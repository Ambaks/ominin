import { query } from "@anthropic-ai/claude-agent-sdk";

/*
 * Un agent du montage : un appel Claude Code qui ne peut que lire (les images
 * fixes qu'on lui désigne) et rend une sortie structurée. Identifiants : le
 * jeton CLAUDE_CODE_OAUTH_TOKEN de l'environnement (le workflow), sinon la
 * session claude de la machine.
 */

export async function ask<T>(options: {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  model: string;
  cwd: string;
}): Promise<T> {
  let result: T | undefined;
  let error: string | undefined;
  for await (const message of query({
    prompt: options.prompt,
    options: {
      systemPrompt: options.system,
      model: options.model,
      cwd: options.cwd,
      allowedTools: ["Read"],
      permissionMode: "dontAsk",
      outputFormat: { type: "json_schema", schema: options.schema },
    },
  })) {
    if (message.type !== "result") continue;
    if (message.subtype === "success" && message.structured_output !== undefined) {
      result = message.structured_output as T;
    } else {
      error = `agent en échec (${message.subtype})`;
    }
  }
  if (result === undefined) throw new Error(error ?? "agent sans résultat");
  return result;
}

export type { Review } from "../../../frontend/lib/social/script.ts";

export const REVIEW_SCHEMA = {
  type: "object",
  properties: {
    score: { type: "number" },
    verdict: { type: "string" },
    fixes: { type: "array", items: { type: "string" } },
    design_issues: { type: "array", items: { type: "string" } },
  },
  required: ["score", "verdict", "fixes", "design_issues"],
  additionalProperties: false,
};
