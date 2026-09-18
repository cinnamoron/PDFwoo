"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

type AssignmentQuestion = { id?: string; questionId?: string; questionText: string; options: string[]; selectedOptionIndex?: number | null; correctOptionIndex?: number; explanation?: string; isCorrect?: boolean };

type AssignmentData = { status: "available" | "completed" | "expired"; questions?: AssignmentQuestion[]; answers?: AssignmentQuestion[]; score?: number | null };

export default function AssignmentWorkspace({ assignmentId }: { assignmentId: string }) {
  const trpc = useTRPC();
  const query = useQuery(trpc.assignments.getForAttempt.queryOptions({ assignmentId }));
  const submit = useMutation(trpc.assignments.submit.mutationOptions({ onSuccess: () => query.refetch() }));
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const data = query.data as AssignmentData | undefined;

  if (query.isPending) return <main className="min-h-[calc(100vh-72px)] bg-ink-950 px-4 py-10 text-white">Loading assignment...</main>;
  if (query.error) return <main className="min-h-[calc(100vh-72px)] bg-ink-950 px-4 py-10 text-red-300">{query.error.message}</main>;
  if (!data) return null;
  if (data.status === "expired") return <Message title="Assignment expired" body="The due date passed and no attempt was submitted." />;

  const completed = data.status === "completed";
  const questions = (completed ? data.answers : data.questions) ?? [];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit.mutateAsync({ assignmentId, answers: questions.map((question) => ({ questionId: question.id ?? question.questionId ?? "", selectedOptionIndex: answers[question.id ?? question.questionId ?? ""] ?? -1 })).filter((answer) => answer.selectedOptionIndex >= 0) });
  }

  return <main className="min-h-[calc(100vh-72px)] bg-ink-950 text-white"><div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8"><Link href="/dashboard" className="text-sm text-mist-400 hover:text-white">← Dashboard</Link><div className="mt-8 rounded-[2rem] border border-ink-800 bg-ink-900/55 p-6"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-bloom-500">{completed ? "Assignment result" : "Assigned test"}</p><div className="mt-3 flex items-end justify-between gap-4"><h1 className="text-3xl font-semibold">{completed ? "Your submitted answers" : "Complete the assignment"}</h1>{completed && <p className="text-3xl font-semibold text-bloom-300">{data.score ?? 0}%</p>}</div></div><form onSubmit={handleSubmit} className="mt-6 space-y-4">{questions.map((question, index) => { const questionId = question.id ?? question.questionId ?? ""; return <article key={questionId} className="rounded-2xl border border-ink-800 bg-ink-900/55 p-5 sm:p-6"><div className="flex gap-3"><span className="text-sm font-semibold text-mist-400">{String(index + 1).padStart(2, "0")}</span><div className="flex-1"><p className="font-semibold leading-6">{question.questionText}</p><div className="mt-4 space-y-2">{question.options.map((option, optionIndex) => { const selected = completed ? question.selectedOptionIndex === optionIndex : answers[questionId] === optionIndex; const correct = completed && question.correctOptionIndex === optionIndex; const wrong = completed && selected && !correct; return <label key={option} className={`flex gap-3 rounded-xl border p-3 text-sm ${correct ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-100" : wrong ? "border-red-500/60 bg-red-500/10 text-red-100" : "border-ink-800 bg-ink-950/30 text-mist-300"}`}><input type="radio" name={questionId} checked={selected} disabled={completed || submit.isPending} onChange={() => setAnswers((current) => ({ ...current, [questionId]: optionIndex }))} className="mt-0.5 accent-[var(--color-brand-600)]" /><span>{option}{correct ? "  ✓ Correct answer" : wrong ? "  ✕ Your answer" : ""}</span></label>; })}</div>{completed && <p className="mt-4 border-t border-ink-800 pt-4 text-sm text-mist-300"><span className="font-semibold text-white">Explanation:</span> {question.explanation}</p>}</div></div></article>; })}{!completed && <button type="submit" disabled={submit.isPending || questions.length === 0 || questions.some((question) => answers[question.id ?? question.questionId ?? ""] === undefined)} className="w-full rounded-xl bg-gradient-to-r from-brand-600 to-bloom-600 px-5 py-3.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40">{submit.isPending ? "Submitting..." : "Submit assignment"}</button>}{submit.error && <p className="text-sm text-red-300" role="alert">{submit.error.message}</p>}</form></div></main>;
}

function Message({ title, body }: { title: string; body: string }) { return <main className="min-h-[calc(100vh-72px)] bg-ink-950 px-4 py-10 text-white"><div className="mx-auto max-w-2xl rounded-[2rem] border border-ink-800 bg-ink-900/55 p-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-bloom-500">Assigned test</p><h1 className="mt-3 text-3xl font-semibold">{title}</h1><p className="mt-3 text-mist-400">{body}</p><Link href="/dashboard" className="mt-6 inline-flex rounded-xl border border-ink-700 px-5 py-3 text-sm font-semibold text-mist-300">Back to dashboard</Link></div></main>; }
