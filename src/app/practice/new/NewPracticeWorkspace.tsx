"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";

export default function NewPracticeWorkspace() {
  const trpc = useTRPC();
  const router = useRouter();
  const materialsQuery = useQuery(trpc.materials.list.queryOptions());
  const materials = (materialsQuery.data ?? []).filter((material) => material.status === "ready");
  const [materialId, setMaterialId] = useState("");
  const conceptsQuery = useQuery(trpc.concepts.listByMaterial.queryOptions({ materialId }, { enabled: Boolean(materialId) }));
  const [conceptIds, setConceptIds] = useState<string[]>([]);
  const [customTopic, setCustomTopic] = useState("");
  const [customTopics, setCustomTopics] = useState<string[]>([]);
  const [numQuestions, setNumQuestions] = useState(10);
  const createPractice = useMutation(trpc.practice.create.mutationOptions());

  function addTopic() {
    const topic = customTopic.trim();
    if (topic && !customTopics.includes(topic)) setCustomTopics((items) => [...items, topic]);
    setCustomTopic("");
  }

  function chooseMaterial(value: string) {
    setMaterialId(value);
    setConceptIds([]);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await createPractice.mutateAsync({ materialId: materialId || undefined, conceptIds, customTopics, numQuestions });
    router.push(`/practice/${result.sessionId}`);
  }

  const canSubmit = conceptIds.length > 0 || customTopics.length > 0;

  return (
    <main className="min-h-[calc(100vh-72px)] bg-ink-950 text-white">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Link href="/practice" className="text-sm text-mist-400 hover:text-white">← Practice history</Link>
        <p className="mt-10 text-xs font-semibold uppercase tracking-[0.18em] text-bloom-500">Practice builder</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Choose what to practice</h1>
        <p className="mt-3 text-mist-400">Mix concepts from a source material with your own custom topics.</p>

        {materials.length === 0 && !materialsQuery.isPending ? (
          <div className="mt-8 rounded-2xl border border-ink-800 bg-ink-900/55 p-6 text-sm text-mist-400">You need a ready material for concept practice. <Link href="/materials" className="font-semibold text-brand-400 hover:text-brand-300">Upload a PDF</Link>.</div>
        ) : null}

        <form onSubmit={submit} className="mt-8 space-y-6">
          <section className="rounded-2xl border border-ink-800 bg-ink-900/55 p-5 sm:p-6">
            <label htmlFor="material" className="text-sm font-semibold">Source material <span className="font-normal text-mist-400">(optional for custom topics)</span></label>
            <select id="material" value={materialId} onChange={(event) => chooseMaterial(event.target.value)} className="mt-3 h-12 w-full rounded-xl border border-ink-700 bg-ink-950 px-4 text-sm focus:border-brand-500 focus:outline-none">
              <option value="">Choose a ready material</option>
              {materials.map((material) => <option key={material.id} value={material.id}>{material.fileName}</option>)}
            </select>
            {materialId && <div className="mt-5 space-y-3">{(conceptsQuery.data ?? []).map((concept) => <label key={concept.id} className="flex gap-3 rounded-xl border border-ink-800 bg-ink-950/35 p-3"><input type="checkbox" checked={conceptIds.includes(concept.id)} onChange={(event) => setConceptIds((ids) => event.target.checked ? [...ids, concept.id] : ids.filter((id) => id !== concept.id))} className="mt-1 accent-[var(--color-brand-600)]" /><span><span className="block text-sm font-semibold">{concept.name}</span><span className="mt-1 block text-xs text-mist-400">{concept.description}</span></span></label>)}</div>}
          </section>

          <section className="rounded-2xl border border-ink-800 bg-ink-900/55 p-5 sm:p-6">
            <label htmlFor="topic" className="text-sm font-semibold">Custom topics</label>
            <div className="mt-3 flex gap-2"><input id="topic" value={customTopic} onChange={(event) => setCustomTopic(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTopic(); } }} placeholder="e.g. cache coherence" className="h-12 min-w-0 flex-1 rounded-xl border border-ink-700 bg-ink-950 px-4 text-sm focus:border-brand-500 focus:outline-none" /><button type="button" onClick={addTopic} className="rounded-xl border border-ink-700 px-4 text-sm font-semibold text-mist-300 hover:border-brand-500 hover:text-white">Add</button></div>
            <div className="mt-4 flex flex-wrap gap-2">{customTopics.map((topic) => <button key={topic} type="button" onClick={() => setCustomTopics((items) => items.filter((item) => item !== topic))} className="rounded-full border border-brand-500/50 bg-brand-500/10 px-3 py-1.5 text-xs text-brand-200">{topic} ×</button>)}</div>
          </section>

          <section className="rounded-2xl border border-ink-800 bg-ink-900/55 p-5 sm:p-6"><label htmlFor="count" className="text-sm font-semibold">Question count</label><input id="count" type="number" min={1} max={200} value={numQuestions} onChange={(event) => setNumQuestions(Number(event.target.value))} className="mt-3 h-12 w-full rounded-xl border border-ink-700 bg-ink-950 px-4 focus:border-brand-500 focus:outline-none" /><div className="mt-3 flex flex-wrap gap-2">{[5, 10, 15, 20].map((count) => <button key={count} type="button" onClick={() => setNumQuestions(count)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${numQuestions === count ? "border-brand-500 bg-brand-500/15 text-brand-200" : "border-ink-700 text-mist-400"}`}>{count}</button>)}</div></section>

          {createPractice.error && <p className="text-sm text-red-300" role="alert">{createPractice.error.message}</p>}
          <button type="submit" disabled={!canSubmit || createPractice.isPending} className="w-full rounded-xl bg-gradient-to-r from-brand-600 to-bloom-600 px-5 py-3.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40">{createPractice.isPending ? "Generating questions..." : "Generate practice session"}</button>
        </form>
      </div>
    </main>
  );
}
