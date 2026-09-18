"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export default function PracticeWorkspace() {
  const trpc = useTRPC();
  const sessionsQuery = useQuery(trpc.practice.listMine.queryOptions());
  const sessions = sessionsQuery.data ?? [];

  return (
    <main className="min-h-[calc(100vh-72px)] bg-ink-950 text-white">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bloom-500">Practice lab</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Build your understanding</h1>
            <p className="mt-3 max-w-xl text-mist-400">Practice from your own materials or add a topic you want to explore.</p>
          </div>
          <Link href="/practice/new" className="rounded-full bg-gradient-to-r from-brand-600 to-bloom-600 px-5 py-3 text-center text-sm font-semibold">New practice session</Link>
        </div>

        <section className="mt-10 rounded-[2rem] border border-ink-800 bg-ink-900/55 p-5 sm:p-6">
          <h2 className="text-xl font-semibold">Practice history</h2>
          {sessionsQuery.isPending ? <p className="mt-5 text-sm text-mist-400">Loading practice history...</p> : sessions.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-ink-700 bg-ink-950/30 p-6 text-sm text-mist-400">No practice sessions yet. Start one to create your first mastery signal.</div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {sessions.map((session) => (
                <Link key={session.id} href={`/practice/${session.id}`} className="rounded-2xl border border-ink-800 bg-ink-950/35 p-4 transition-colors hover:border-brand-500/60">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-white">{session.title}</p>
                    <span className="rounded-full border border-ink-700 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-mist-300">{session.status === "completed" ? "Completed" : "In progress"}</span>
                  </div>
                  <p className="mt-3 text-sm text-mist-400">{session.status === "completed" ? `${session.score ?? 0}% · ${session.totalQuestions} questions` : `${session.totalQuestions} questions`}</p>
                  <p className="mt-2 text-xs text-mist-400">{new Date(session.createdAt).toLocaleDateString()}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
