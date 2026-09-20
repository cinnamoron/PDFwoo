import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-ink-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl rounded-[2rem] border border-ink-800 bg-ink-900/55 p-6 shadow-[0_20px_80px_-40px_rgba(56,189,248,0.35)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bloom-500">
          404
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          Page not found
        </h1>
        <p className="mt-3 text-sm leading-6 text-mist-400">
          The page you requested could not be found.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-full bg-gradient-to-r from-brand-600 to-bloom-600 px-5 py-3 text-sm font-semibold text-white"
        >
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
