export default function UnderDevelopmentNotice({ feature }: { feature: string }) {
  return (
    <main className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-ink-950 px-6 py-16 text-white">
      <section className="w-full max-w-4xl rounded-[2rem] border border-brand-500/30 bg-ink-900/70 px-6 py-16 text-center shadow-2xl shadow-brand-950/30 sm:px-12">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-bloom-500">{feature}</p>
        <h1 className="mt-6 text-5xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-7xl">
          UNDER DEVELOPMENT
          <span className="mt-3 block text-brand-400">PLS WAIT SORRY !!</span>
        </h1>
        <p className="mx-auto mt-8 max-w-xl text-sm leading-6 text-mist-400">
          This teacher workspace is still being built. Please check back soon.
        </p>
      </section>
    </main>
  );
}
