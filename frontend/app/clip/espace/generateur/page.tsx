"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipReviewGrid } from "@/components/clip/espace/clip-review-grid";
import { JobHistory } from "@/components/clip/espace/job-history";
import { JobProgress } from "@/components/clip/espace/job-progress";
import { PublierTabs } from "@/components/clip/espace/publier-tabs";
import { VodUrlInput } from "@/components/clip/espace/vod-url-input";
import { useToast } from "@/components/ui/toast";
import { useClipData } from "@/lib/clip/context";
import { createVodJob, fetchRecentJobs } from "@/lib/clip/vod/api";
import { usePollJob } from "@/lib/clip/vod/use-poll-job";
import type { ClipperJob } from "@/lib/clip/vod/types";

export default function GenerateurPage() {
  const { state } = useClipData();
  const toast = useToast();

  const [jobs, setJobs] = useState<ClipperJob[] | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { job, error: pollError } = usePollJob(activeJobId);

  const loadJobs = useCallback(() => {
    fetchRecentJobs()
      .then(setJobs)
      .catch((error: unknown) => {
        toast.error(
          error instanceof Error
            ? error.message
            : "Impossible de charger vos analyses."
        );
        setJobs([]);
      });
  }, [toast]);

  useEffect(() => {
    if (!state) return;
    fetchRecentJobs()
      .then((recent) => {
        setJobs(recent);
        const active = recent.find(
          (entry) =>
            entry.status === "en_attente" || entry.status === "en_cours"
        );
        if (active) setActiveJobId(active.id);
      })
      .catch((error: unknown) => {
        toast.error(
          error instanceof Error
            ? error.message
            : "Impossible de charger vos analyses."
        );
        setJobs([]);
      });
  }, [state, toast]);

  if (!state) return null;

  const launch = async (url: string) => {
    setSubmitting(true);
    try {
      const created = await createVodJob(url);
      setActiveJobId(created.id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Échec du lancement."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setActiveJobId(null);
    loadJobs();
  };

  if (jobs === null) {
    return (
      <div className="flex flex-col gap-8">
        <PublierTabs active="vod" />
        <div className="flex items-center gap-2 py-12">
          <span className="size-1.5 animate-pulse rounded-full bg-ember-2" />
          <span className="text-sm text-muted">Chargement…</span>
        </div>
      </div>
    );
  }

  const showForm = !activeJobId;
  const showPollError = activeJobId != null && job == null;
  const showProcessing =
    job && (job.status === "en_attente" || job.status === "en_cours");
  const showCompleted = job?.status === "termine";
  const showError = job?.status === "echec";

  return (
    <div className="flex flex-col gap-8">
      <PublierTabs active="vod" />

      {showForm && (
        <IdleView
          jobs={jobs}
          onSubmit={launch}
          submitting={submitting}
          onSelectJob={(selected) => setActiveJobId(selected.id)}
        />
      )}
      {showPollError && pollError && (
        <PollErrorView message={pollError} onBack={reset} />
      )}
      {showProcessing && <ProcessingView job={job} onBack={reset} />}
      {showCompleted && <CompletedView job={job} onNewJob={reset} />}
      {showError && (
        <ErrorView
          job={job}
          retrying={submitting}
          onRetry={() => launch(job.sourceUrl)}
          onBack={reset}
        />
      )}
    </div>
  );
}

function IdleView({
  jobs,
  onSubmit,
  submitting,
  onSelectJob,
}: {
  jobs: ClipperJob[];
  onSubmit: (url: string) => void;
  submitting: boolean;
  onSelectJob: (job: ClipperJob) => void;
}) {
  return (
    <>
      <header className="rise" style={{ animationDelay: "40ms" }}>
        <h1 className="font-display text-2xl font-medium tracking-tight">
          Générer des clips depuis une VOD
        </h1>
        <p className="mt-1 max-w-lg text-sm text-muted">
          Collez le lien d&apos;un live, d&apos;un podcast ou d&apos;une
          interview : l&apos;IA repère les moments forts et produit des clips
          verticaux prêts à publier.
        </p>
      </header>

      <section
        className="rise rounded-2xl border border-hairline bg-surface p-5 sm:p-6"
        style={{ animationDelay: "100ms" }}
      >
        <SectionTitle index={1} label="Votre vidéo" />
        <div className="mt-3">
          <VodUrlInput onSubmit={onSubmit} submitting={submitting} />
        </div>
      </section>

      {jobs.length > 0 && (
        <div className="rise" style={{ animationDelay: "130ms" }}>
          <JobHistory jobs={jobs} onSelect={onSelectJob} />
        </div>
      )}

      <HowItWorks />
    </>
  );
}

function PollErrorView({
  message,
  onBack,
}: {
  message: string;
  onBack: () => void;
}) {
  return (
    <div className="rise flex flex-col gap-4">
      <p className="text-sm text-muted">
        Impossible de récupérer cette analyse : {message}
      </p>
      <button
        type="button"
        onClick={onBack}
        className="self-start rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold transition-colors hover:border-ember-2/40"
      >
        Retour
      </button>
    </div>
  );
}

function ProcessingView({
  job,
  onBack,
}: {
  job: ClipperJob;
  onBack: () => void;
}) {
  return (
    <>
      <header className="rise" style={{ animationDelay: "40ms" }}>
        <p className="flex items-center gap-2">
          <span className="size-1.5 animate-pulse rounded-full bg-ember-2" />
          <span className="ember-text text-[10px] font-semibold uppercase tracking-[0.28em]">
            Traitement en cours
          </span>
        </p>
        <h1 className="mt-2 font-display text-2xl font-medium tracking-tight">
          Analyse de la vidéo
        </h1>
        <p className="mt-1 max-w-lg text-sm text-muted">
          L&apos;IA visionne votre vidéo, détecte les moments forts et prépare
          les clips. Vous pouvez quitter cette page — le traitement continue.
        </p>
      </header>

      <section
        className="rise rounded-2xl border border-hairline bg-surface p-5 sm:p-6"
        style={{ animationDelay: "100ms" }}
      >
        <JobProgress job={job} />
      </section>

      <button
        type="button"
        onClick={onBack}
        className="rise self-start text-sm text-muted transition-colors hover:text-foreground"
        style={{ animationDelay: "160ms" }}
      >
        ← Retour aux analyses
      </button>
    </>
  );
}

function CompletedView({
  job,
  onNewJob,
}: {
  job: ClipperJob;
  onNewJob: () => void;
}) {
  return (
    <>
      <header className="rise" style={{ animationDelay: "40ms" }}>
        <p className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-ember-1" />
          <span className="ember-text text-[10px] font-semibold uppercase tracking-[0.28em]">
            Terminé
          </span>
        </p>
        <h1 className="mt-2 font-display text-2xl font-medium tracking-tight">
          {job.clipCount} clip{job.clipCount !== 1 ? "s" : ""} généré
          {job.clipCount !== 1 ? "s" : ""}
        </h1>
        <p className="mt-1 max-w-lg text-sm text-muted">
          Vos clips sont prêts. Relisez-les, approuvez ceux qui vous plaisent
          et publiez-les directement.
        </p>
      </header>

      <section
        className="rise"
        style={{ animationDelay: "100ms" }}
      >
        <ClipReviewGrid jobId={job.id} />
      </section>

      <button
        type="button"
        onClick={onNewJob}
        className="rise self-start rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold transition-colors hover:border-ember-2/40"
        style={{ animationDelay: "160ms" }}
      >
        Analyser une autre vidéo
      </button>
    </>
  );
}

function ErrorView({
  job,
  retrying,
  onRetry,
  onBack,
}: {
  job: ClipperJob;
  retrying: boolean;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <>
      <header className="rise" style={{ animationDelay: "40ms" }}>
        <p className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-ember-3" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-ember-3">
            Échec
          </span>
        </p>
        <h1 className="mt-2 font-display text-2xl font-medium tracking-tight">
          Le traitement a échoué
        </h1>
        <p className="mt-1 max-w-lg text-sm text-muted">
          {job.errorMessage ?? "Une erreur est survenue pendant l'analyse."}
        </p>
      </header>

      <div
        className="rise flex flex-wrap items-center gap-3"
        style={{ animationDelay: "100ms" }}
      >
        <button
          type="button"
          disabled={retrying}
          onClick={onRetry}
          className="ember-gradient rounded-full px-6 py-3 text-sm font-semibold text-background transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {retrying ? (
            <span className="animate-pulse">Relance…</span>
          ) : (
            "Relancer l'analyse"
          )}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold transition-colors hover:border-ember-2/40"
        >
          Autre vidéo
        </button>
      </div>
    </>
  );
}

function HowItWorks() {
  return (
    <div
      className="rise grid gap-4 lg:grid-cols-3"
      style={{ animationDelay: "160ms" }}
    >
      {STEPS.map((step, index) => (
        <article
          key={step.title}
          className="flex flex-col gap-4 rounded-2xl border border-hairline bg-surface p-5"
        >
          <div className="flex h-24 items-center justify-center rounded-xl border border-hairline bg-background">
            <step.illustration />
          </div>
          <div className="flex items-center gap-2">
            <span className="ember-gradient flex size-5 items-center justify-center rounded-full text-[11px] font-bold text-background">
              {index + 1}
            </span>
            <h2 className="font-display text-base font-medium">
              {step.title}
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-muted">{step.body}</p>
        </article>
      ))}
    </div>
  );
}

function SectionTitle({ index, label }: { index: number; label: string }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold">
      <span className="ember-gradient flex size-5 items-center justify-center rounded-full text-[11px] font-bold text-background">
        {index}
      </span>
      {label}
    </h2>
  );
}

const STEPS = [
  {
    title: "Collez le lien",
    body: "Un live entier, un podcast, une interview : collez le lien YouTube ou Twitch, sans aucun montage préalable.",
    illustration: VodIllustration,
  },
  {
    title: "L'IA repère les moments forts",
    body: "Pics d'intensité, réactions, punchlines : chaque passage marquant est détecté et découpé au bon moment.",
    illustration: DetectIllustration,
  },
  {
    title: "Des clips prêts à publier",
    body: "Recadrés en 9:16, sous-titrés, titrés par l'IA — ils rejoignent votre flux de publication habituel.",
    illustration: ClipsIllustration,
  },
];

function IllustrationSvg({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 96 56"
      className="h-16"
      fill="none"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function VodIllustration() {
  return (
    <IllustrationSvg>
      <g stroke="currentColor" className="text-faint">
        <rect x="17" y="5" width="62" height="36" rx="4" />
        <path d="M17 47h62" />
        <path d="M25 45v4M35 45v4M45 45v4M55 45v4M65 45v4M75 45v4" />
      </g>
      <path
        d="M44 17.5 54.5 23 44 28.5Z"
        stroke="currentColor"
        className="text-ember-2"
      />
    </IllustrationSvg>
  );
}

function DetectIllustration() {
  return (
    <IllustrationSvg>
      <g stroke="currentColor" className="text-faint">
        <path d="M6 24v8M12 21v14M18 25v6M24 19v18M30 24v8M36 22v12M48 24v8M54 21v14M66 25v6M72 22v12M84 24v8M90 21v14" />
      </g>
      <g stroke="currentColor" className="text-ember-2">
        <path d="M42 13v30M60 9v38M78 15v26" />
        <path d="M38 50h8M56 50h8M74 50h8" />
      </g>
    </IllustrationSvg>
  );
}

function ClipsIllustration() {
  return (
    <IllustrationSvg>
      <g stroke="currentColor" className="text-faint">
        <rect x="10" y="12" width="20" height="34" rx="3" />
        <path d="M15 38h10M15 42h6" />
        <rect x="66" y="12" width="20" height="34" rx="3" />
        <path d="M71 38h10M71 42h6" />
      </g>
      <g stroke="currentColor" className="text-ember-2">
        <rect x="38" y="6" width="20" height="40" rx="3" />
        <path d="M43 36h10M43 40h7" />
        <circle cx="58" cy="8" r="5" />
        <path d="m55.8 8 1.7 1.7 3-3.2" />
      </g>
    </IllustrationSvg>
  );
}
