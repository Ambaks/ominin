import { AlertIcon, LockIcon, OfflineIcon } from "@/components/gestion/icons";
import { describeError, type ErrorFamily } from "@/lib/gestion/errors";
import { GlassButton } from "./glass-button";
import { Notice } from "./notice";

const ICON: Record<ErrorFamily, typeof AlertIcon> = {
  reseau: OfflineIcon,
  droit: LockIcon,
  donnee: AlertIcon,
};

/** L'erreur d'une page, une fois, en bandeau : la famille choisit l'icône, « Réessayer » n'apparaît que s'il a un sens. */
export function ErrorNotice({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const described = describeError(error);
  const Icon = ICON[described.family];
  return (
    <Notice
      icon={<Icon />}
      title={described.title}
      text={described.text}
      action={described.retry && onRetry ? <GlassButton onClick={onRetry}>Réessayer</GlassButton> : undefined}
    />
  );
}
