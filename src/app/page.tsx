"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";

const features = [
  ["01", "Structure the source", "Upload a PDF and turn study material into a clear concept hierarchy."],
  ["02", "Review before publishing", "Teachers edit concepts and inspect every generated MCQ."],
  ["03", "Close the gaps", "Analytics finds weak concepts, then targeted practice makes improvement visible."],
];

export default function HomePage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (session) router.replace("/dashboard");
  }, [router, session]);

  if (isPending || session) return <main className="min-h-[calc(100vh-72px)] bg-ink-950" aria-label="Loading ConceptIQ" />;

  return (
    <main className="min-h-[calc(100vh-72px)] overflow-hidden bg-ink-950 text-white">
      <section className="relative border-b border-ink-800"><div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,var(--color-ink-800)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-ink-800)_1px,transparent_1px)] [background-size:56px_56px]" /><div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:pb-28 lg:pt-24"><div className="max-w-2xl self-center"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-bloom-500">Concept-first learning</p><h1 className="mt-6 text-5xl font-semibold leading-[1.02] tracking-tight sm:text-7xl">Turn study material into measurable understanding.</h1><p className="mt-6 max-w-xl text-lg leading-8 text-mist-400">ConceptIQ helps teachers build human-reviewed assessments from PDFs, then helps students see exactly what to learn next.</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/login?callbackUrl=%2Fdashboard" className="rounded-full bg-gradient-to-r from-brand-600 to-bloom-600 px-6 py-3.5 text-sm font-semibold">Start building</Link><a href="#how-it-works" className="rounded-full border border-ink-700 px-6 py-3.5 text-sm font-semibold text-mist-300">See how it works</a></div></div><div className="rounded-[2rem] border border-ink-700 bg-ink-900/80 p-5 shadow-2xl shadow-black/20 sm:p-7"><div className="flex items-center justify-between border-b border-ink-800 pb-5"><div><p className="text-xs uppercase tracking-[0.16em] text-bloom-500">Knowledge snapshot</p><p className="mt-2 text-xl font-semibold">Operating Systems</p></div><span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">Concept view</span></div><div className="mt-6 space-y-5">{[{ name: "CPU Scheduling", score: "82%", color: "bg-emerald-400" }, { name: "Paging", score: "70%", color: "bg-amber-400" }, { name: "Virtual Memory", score: "32%", color: "bg-red-400" }].map((concept) => <div key={concept.name}><div className="flex justify-between text-sm"><span className="text-mist-300">{concept.name}</span><span className="font-semibold">{concept.score}</span></div><div className="mt-2 h-2 rounded-full bg-ink-800"><div className={`h-full rounded-full ${concept.color}`} style={{ width: concept.score }} /></div></div>)}</div><p className="mt-7 border-t border-ink-800 pt-5 text-sm leading-6 text-mist-400"><span className="font-medium text-white">Next best action:</span> practice Page Replacement with new questions matched to the gap.</p></div></div></section>
      <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28"><div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-bloom-500">One learning loop</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">From material to the next breakthrough.</h2><p className="mt-4 text-base leading-7 text-mist-400">AI explains performance, while deterministic analytics keeps recommendations grounded in evidence.</p></div><div className="mt-12 grid gap-4 md:grid-cols-3">{features.map(([number, title, body]) => <article key={number} className="border-t border-ink-700 pt-5"><span className="text-sm font-semibold text-brand-500">{number}</span><h3 className="mt-5 text-xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-mist-400">{body}</p></article>)}</div></section>
      <section className="border-y border-ink-800 bg-ink-900/45"><div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.7fr_1.3fr] lg:px-8"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-bloom-500">Built for both sides</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">Better decisions for teachers. Clearer next steps for students.</h2></div><div className="grid gap-8 sm:grid-cols-2"><div><p className="font-semibold">For teachers</p><p className="mt-3 text-sm leading-6 text-mist-400">Create assessments from real material, keep human oversight, and identify class-wide gaps.</p></div><div><p className="font-semibold">For students</p><p className="mt-3 text-sm leading-6 text-mist-400">See concept-level performance and practice the ideas holding you back.</p></div></div></div></section>
      <section className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8"><h2 className="text-3xl font-semibold tracking-tight">Make every assessment teach you something.</h2><p className="mx-auto mt-4 max-w-xl text-mist-400">Start with a PDF, a set of concepts, and a better way to measure progress.</p><Link href="/login?callbackUrl=%2Fdashboard" className="mt-7 inline-flex rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-ink-950">Enter ConceptIQ</Link></section>
    </main>
  );
}