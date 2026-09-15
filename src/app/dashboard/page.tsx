"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppSelector } from "@/hooks/hooks";
import { authClient } from "@/lib/auth-client";

const concepts = [{ name: "Virtual Memory", teacher: 39, student: 32, tone: "critical" }, { name: "Deadlocks", teacher: 52, student: 58, tone: "weak" }, { name: "CPU Scheduling", teacher: 82, student: 88, tone: "strong" }];

export default function DashboardPage() {
  const router = useRouter();
  const role = useAppSelector((state) => state.nav.role);
  const { data: session, isPending } = authClient.useSession();
  const isTeacher = role === "teacher";

  useEffect(() => { if (!isPending && !session) router.replace("/login?callbackUrl=%2Fdashboard"); }, [isPending, router, session]);
  if (isPending || !session) return <main className="min-h-[calc(100vh-72px)] bg-ink-950" aria-label="Loading dashboard" />;

  const firstName = session.user.name?.trim().split(/\s+/)[0] || (isTeacher ? "Teacher" : "Student");
  const stats = isTeacher ? [["04", "Active assessments"], ["128", "Student attempts"], ["03", "Critical concept gaps"]] : [["72%", "Overall performance"], ["03", "Concepts to revisit"], ["07", "Practice questions"]];

  return <main className="min-h-[calc(100vh-72px)] bg-ink-950 text-white"><div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pt-12"><section className="rounded-[2rem] border border-ink-700/70 bg-[#24212d] px-6 py-8 sm:px-10 lg:px-12 lg:py-11"><p className="text-sm text-mist-400">{isTeacher ? "Teacher workspace / Assessment intelligence" : "Learning workspace / Concept progress"}</p><h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">{isTeacher ? `Good morning, ${firstName}.` : `Keep your momentum, ${firstName}.`}</h1><p className="mt-4 max-w-xl text-base leading-7 text-mist-400">{isTeacher ? "Turn study material into concept-aware assessments and see where your class needs help." : "Your progress is more than a score. Focus on the concepts that move your understanding forward."}</p><div className="mt-7 flex flex-wrap gap-3"><Link href={isTeacher ? "/assessments/new" : "/practice"} className="rounded-full bg-gradient-to-r from-brand-600 to-bloom-600 px-5 py-3 text-sm font-semibold">{isTeacher ? "Create assessment" : "Start targeted practice"}</Link><Link href={isTeacher ? "/assessments" : "/progress"} className="rounded-full border border-ink-700 px-5 py-3 text-sm font-semibold text-mist-300">{isTeacher ? "View assessments" : "View my progress"}</Link></div></section><section className="mt-8 grid gap-4 sm:grid-cols-3">{stats.map(([value, label]) => <div key={label} className="border-b border-ink-800 pb-5 sm:border-b-0 sm:border-r sm:pr-5"><p className="text-3xl font-semibold">{value}</p><p className="mt-1 text-sm text-mist-300">{label}</p></div>)}</section><section className="mt-12"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-bloom-500">Concept intelligence</p><h2 className="mt-2 text-2xl font-semibold">{isTeacher ? "Where your class is getting stuck" : "Your knowledge map"}</h2><div className="mt-5 divide-y divide-ink-800 rounded-2xl border border-ink-800 bg-ink-900/55">{concepts.map((concept) => { const score = isTeacher ? concept.teacher : concept.student; return <div key={concept.name} className="flex items-center gap-4 px-5 py-5 sm:px-6"><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${toneClasses[concept.tone]}`}>{score}%</div><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><p className="font-medium">{concept.name}</p><span className={`text-xs ${toneTextClasses[concept.tone]}`}>{score >= 80 ? "Strong" : score < 40 ? "Critical gap" : "Developing"}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-800"><div className={`h-full rounded-full ${toneBarClasses[concept.tone]}`} style={{ width: `${score}%` }} /></div></div></div>; })}</div></section><section className="mt-12 border-t border-ink-800 pt-8"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-bloom-500">The learning loop</p><h2 className="mt-2 text-2xl font-semibold">From material to measurable improvement</h2><div className="mt-6 grid gap-3 md:grid-cols-5">{["Study material", "Concepts", "Assessment", "Gap detection", "Targeted practice"].map((step, index) => <div key={step} className="rounded-xl border border-ink-800 bg-ink-900/35 p-4"><span className="text-xs font-semibold text-brand-500">0{index + 1}</span><p className="mt-3 text-sm text-mist-300">{step}</p></div>)}</div></section></div></main>;
}

const toneClasses: Record<string, string> = { critical: "bg-red-400/10 text-red-300", weak: "bg-amber-400/10 text-amber-300", strong: "bg-emerald-400/10 text-emerald-300" };
const toneTextClasses: Record<string, string> = { critical: "text-red-300", weak: "text-amber-300", strong: "text-emerald-300" };
const toneBarClasses: Record<string, string> = { critical: "bg-red-400", weak: "bg-amber-400", strong: "bg-emerald-400" };