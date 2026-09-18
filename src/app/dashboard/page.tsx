"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "@/hooks/hooks";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";

const levelStyles = { struggling: "border-red-500/40 bg-red-500/10 text-red-200", average: "border-amber-500/40 bg-amber-500/10 text-amber-200", good: "border-sky-500/40 bg-sky-500/10 text-sky-200", excellent: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" } as const;

export default function DashboardPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const role = useAppSelector((state) => state.nav.role);
  const { data: session, isPending } = authClient.useSession();
  const statsQuery = useQuery(trpc.progress.myConceptStats.queryOptions(undefined, { enabled: role !== "teacher" }));
  const assignmentsQuery = useQuery(trpc.assignments.myAssignments.queryOptions(undefined, { enabled: role !== "teacher" }));
  const practiceQuery = useQuery(trpc.practice.listMine.queryOptions(undefined, { enabled: role !== "teacher" }));
  const isTeacher = role === "teacher";

  useEffect(() => { if (!isPending && !session) router.replace("/login?callbackUrl=%2Fdashboard"); }, [isPending, router, session]);
  if (isPending || !session) return <main className="min-h-[calc(100vh-72px)] bg-ink-950" aria-label="Loading dashboard" />;

  const firstName = session.user.name?.trim().split(/\s+/)[0] || (isTeacher ? "Teacher" : "Student");
  if (isTeacher) return <TeacherDashboard firstName={firstName} />;

  const stats = statsQuery.data ?? [];
  const assignments = assignmentsQuery.data ?? [];
  const practiceSessions = practiceQuery.data ?? [];
  const weightedAccuracy = stats.length === 0 ? 0 : Math.round(stats.reduce((sum, item) => sum + item.accuracy * item.attempts, 0) / stats.reduce((sum, item) => sum + item.attempts, 0));
  const dueCount = assignments.filter((assignment) => !assignment.completed && !assignment.expired).length;
  const completedPracticeCount = practiceSessions.filter((practice) => practice.status === "completed").length;

  return <main className="min-h-[calc(100vh-72px)] bg-ink-950 text-white"><div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pt-12"><section className="rounded-[2rem] border border-ink-700/70 bg-[#24212d] px-6 py-8 sm:px-10 lg:px-12 lg:py-11"><p className="text-sm text-mist-400">Learning workspace / Concept progress</p><h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">Keep your momentum, {firstName}.</h1><p className="mt-4 max-w-xl text-base leading-7 text-mist-400">Your mastery grows one concept at a time. Use the strongest signals to focus on what matters next.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/practice/new" className="rounded-full bg-gradient-to-r from-brand-600 to-bloom-600 px-5 py-3 text-sm font-semibold">Start targeted practice</Link><Link href="/progress" className="rounded-full border border-ink-700 px-5 py-3 text-sm font-semibold text-mist-300">View my progress</Link></div></section><section className="mt-8 grid gap-4 sm:grid-cols-3">{[[`${weightedAccuracy}%`, "Overall performance"], [String(dueCount), "Tests due"], [String(completedPracticeCount), "Practice sessions completed"]].map(([value, label]) => <div key={label} className="rounded-2xl border border-ink-800 bg-ink-900/55 p-5"><p className="text-3xl font-semibold">{value}</p><p className="mt-1 text-sm text-mist-300">{label}</p></div>)}</section><section className="mt-12 rounded-[2rem] border border-ink-800 bg-ink-900/55 p-5 sm:p-6"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-bloom-500">Concept mastery</p><h2 className="mt-2 text-2xl font-semibold">Focus areas</h2></div><Link href="/progress" className="text-sm font-medium text-brand-400 hover:text-brand-300">View all</Link></div>{stats.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed border-ink-700 p-5 text-sm text-mist-400">Complete a practice session or assigned test to see your concept mastery.</div> : <div className="mt-6 grid gap-3 sm:grid-cols-2">{stats.slice(0, 4).map((item) => <div key={item.label} className="rounded-2xl border border-ink-800 bg-ink-950/35 p-4"><div className="flex items-center justify-between gap-3"><p className="font-semibold">{item.label}</p><span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${levelStyles[item.level]}`}>{item.level}</span></div><p className="mt-3 text-2xl font-semibold">{item.accuracy}%</p></div>)}</div>}</section><section className="mt-12 rounded-[2rem] border border-ink-800 bg-ink-900/55 p-5 sm:p-6"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-bloom-500">Assigned tests</p><h2 className="mt-2 text-2xl font-semibold">Your upcoming work</h2>{assignments.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed border-ink-700 p-5 text-sm text-mist-400">No assigned tests yet.</div> : <div className="mt-6 space-y-3">{assignments.slice(0, 5).map((assignment) => <div key={assignment.id} className="flex flex-col gap-3 rounded-2xl border border-ink-800 bg-ink-950/35 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{assignment.assessmentTitle}</p><p className="mt-1 text-xs text-mist-400">{assignment.className ?? "Class assignment"} · Due {new Date(assignment.dueAt).toLocaleDateString()}</p></div>{assignment.completed ? <Link href={`/assignments/${assignment.id}`} className="text-sm font-semibold text-brand-400">View result · {assignment.score ?? 0}%</Link> : assignment.expired ? <span className="text-sm text-mist-400">Expired</span> : <Link href={`/assignments/${assignment.id}`} className="rounded-full border border-brand-500/50 bg-brand-500/10 px-3 py-2 text-center text-xs font-semibold text-brand-200">Start</Link>}</div>)}</div>}</section></div></main>;
}

function TeacherDashboard({ firstName }: { firstName: string }) { return <main className="min-h-[calc(100vh-72px)] bg-ink-950 text-white"><div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pt-12"><section className="rounded-[2rem] border border-ink-700/70 bg-[#24212d] px-6 py-8 sm:px-10 lg:px-12 lg:py-11"><p className="text-sm text-mist-400">Teacher workspace / Assessment intelligence</p><h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">Good morning, {firstName}.</h1><p className="mt-4 max-w-xl text-base leading-7 text-mist-400">Turn study material into concept-aware assessments and see where your class needs help.</p><Link href="/classes" className="mt-7 inline-flex rounded-full bg-gradient-to-r from-brand-600 to-bloom-600 px-5 py-3 text-sm font-semibold">Manage classes</Link></section></div></main>; }
