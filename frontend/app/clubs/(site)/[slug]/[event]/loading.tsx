/* La soirée se charge : sa silhouette, à la place exacte de ce qui arrive. */
export default function EventLoading() {
  return (
    <main className="club-page club-calm" aria-busy>
      <div className="club-top" aria-hidden />
      <section className="club-event-hero" aria-hidden>
        <span className="club-skeleton club-event-poster" />
        <div className="club-event-info">
          <span className="club-skeleton club-skeleton-line" />
          <span className="club-skeleton club-skeleton-title" />
          <span className="club-skeleton club-skeleton-line" />
        </div>
      </section>
      <section className="club-section" aria-hidden>
        <span className="club-skeleton club-skeleton-title" />
        <span className="club-skeleton club-skeleton-block" />
      </section>
      <p className="sr-only">Chargement de la soirée…</p>
    </main>
  );
}
