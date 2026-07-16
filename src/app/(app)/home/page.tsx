export default function HomeSpacePage() {
  return (
    <div className="space-y-12">
      <section>
        <p className="text-[11px] tracking-[0.28em] text-[var(--signal)] uppercase">
          Your space
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl md:text-5xl">
          Cirqua Home
        </h1>
        <p className="mt-4 max-w-xl text-[var(--muted)]">
          Phase 1 foundation is live. Feed, circles, messaging, realtime, and
          media pipelines arrive in the next phases — on this architecture.
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        {[
          {
            id: "circles",
            title: "Circles",
            body: "Intentional communities with membership and moderation controls.",
          },
          {
            id: "messages",
            title: "Messages",
            body: "Private conversations with Socket.io realtime in Phase 2+.",
          },
          {
            id: "studio",
            title: "Studio",
            body: "Cinematic media publishing via Cloudinary / UploadThing.",
          },
        ].map((card) => (
          <article
            key={card.id}
            id={card.id}
            className="rounded-[1.5rem] border border-[var(--mist)] bg-white/60 p-6 shadow-[0_20px_60px_var(--shadow)]"
          >
            <h2 className="font-[family-name:var(--font-display)] text-2xl">
              {card.title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
              {card.body}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
