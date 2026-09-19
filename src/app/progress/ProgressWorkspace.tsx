"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";

const levelStyles = { struggling: "border-red-500/40 bg-red-500/10 text-red-200", average: "border-amber-500/40 bg-amber-500/10 text-amber-200", good: "border-sky-500/40 bg-sky-500/10 text-sky-200", excellent: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" } as const;
const barStyles = { struggling: "bg-red-500", average: "bg-amber-500", good: "bg-sky-500", excellent: "bg-emerald-500" } as const;

export default function ProgressWorkspace() {
  const trpc = useTRPC();
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const query = useQuery(trpc.progress.myConceptStats.queryOptions(undefined, { enabled: !isSessionPending && Boolean(session) }));
  const stats = query.data ?? [];

  return <main className="min-h-[calc(100vh-72px)] bg-ink-950 text-white"><div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8"><Link href="/dashboard" className="text-sm text-mist-400 hover:text-white">← Dashboard</Link><p className="mt-10 text-xs font-semibold uppercase tracking-[0.18em] text-bloom-500">Progress</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Concept mastery</h1><p className="mt-3 max-w-xl text-mist-400">Every answer contributes to the picture, across practice sessions and assigned tests.</p>{query.isPending ? <p className="mt-8 text-sm text-mist-400">Loading your progress...</p> : stats.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-ink-700 bg-ink-900/55 p-6 text-sm text-mist-400">Complete a practice session or assigned test to see this.</div> : <div className="mt-8 grid gap-4 sm:grid-cols-2">{stats.map((item) => <article key={item.label} className="rounded-2xl border border-ink-800 bg-ink-900/55 p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{item.label}</h2><p className="mt-1 text-xs text-mist-400">{item.attempts} answers counted</p></div><span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${levelStyles[item.level]}`}>{item.level}</span></div><div className="mt-5 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-800"><div className={`h-full ${barStyles[item.level]}`} style={{ width: `${item.accuracy}%` }} /></div><span className="text-lg font-semibold">{item.accuracy}%</span></div></article>)}</div>}</div></main>;
}
