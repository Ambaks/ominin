import type { AgentMailbox, AgentProfile, AgentStatus } from "./types";

/** Le profil a de quoi prospecter — miroir de prospecting() (backend, tick.py). */
export function isComplete(profile: AgentProfile): boolean {
  return Boolean(
    profile.company_name.trim() &&
      profile.sender_name.trim() &&
      profile.offer.trim() &&
      profile.targets.length &&
      profile.cities.length
  );
}

export function agentStatus(
  profile: AgentProfile,
  mailbox: AgentMailbox | null
): AgentStatus {
  if (!profile.activated_at) return "awaiting_activation";
  if (!mailbox) return "no_mailbox";
  if (mailbox.error) return "mailbox_error";
  if (!isComplete(profile)) return "incomplete";
  return profile.enabled ? "running" : "paused";
}

const DAY_ABBR = ["", "lun", "mar", "mer", "jeu", "ven", "sam", "dim"];

/** « lun–ven · 9 h – 18 h · 20 e-mails/jour » */
export function scheduleSummary(profile: AgentProfile): string {
  const days = [...profile.send_days].sort((a, b) => a - b);
  const contiguous =
    days.length > 2 && days.every((day, i) => i === 0 || day === days[i - 1] + 1);
  const dayText = contiguous
    ? `${DAY_ABBR[days[0]]}–${DAY_ABBR[days[days.length - 1]]}`
    : days.map((day) => DAY_ABBR[day]).join(", ");
  return `${dayText || "aucun jour"} · ${profile.send_start_hour} h – ${profile.send_end_hour} h · ${profile.daily_limit} e-mails/jour`;
}
