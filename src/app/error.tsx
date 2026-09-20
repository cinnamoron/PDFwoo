"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-ink-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl rounded-[2rem] border border-ink-800 bg-ink-900/55 p-6 shadow-[0_20px_80px_-40px_rgba(56,189,248,0.35)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bloom-500">
          Error
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm leading-6 text-mist-400">
          The app hit an unexpected error. Refreshing the page or trying again
          should resolve it.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-full bg-gradient-to-r from-brand-600 to-bloom-600 px-5 py-3 text-sm font-semibold text-white"
        >
          Try again
        </button>
        <p className="mt-4 text-xs text-mist-500">
          {error.message}
        </p>
      </div>
    </main>
  );
}
