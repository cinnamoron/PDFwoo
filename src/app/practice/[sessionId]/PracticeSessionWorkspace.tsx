"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

type PracticeQuestion = { id: string; questionText: string; options: string[]; difficulty: string; selectedOptionIndex: number | null; correctOptionIndex?: number; explanation?: string; isCorrect?: boolean | null };
type AnswerResult = { isCorrect: boolean; correctOptionIndex: number; explanation: string };

export default function PracticeSessionWorkspace({ sessionId }: { sessionId: string }) {
  const trpc = useTRPC();
  const query = useQuery(trpc.practice.get.queryOptions({ sessionId }));
  const submitAnswer = useMutation(trpc.practice.submitAnswer.mutationOptions());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [results, setResults] = useState<Record<string, AnswerResult>>({});
  const data = query.data;
  const questions = (data?.questions ?? []) as PracticeQuestion[];

  if (query.isPending) return <main className="min-h-[calc(100vh-72px)] bg-ink-950 px-4 py-10 text-white">Loading practice session...</main>;
  if (query.error) return <main className="min-h-[calc(100vh-72px)] bg-ink-950 px-4 py-10 text-red-300">{query.error.message}</main>;
  if (!data) return null;

  const completed = data.session.status === "completed";
  const currentQuestion = questions[currentIndex];
  const currentResult = currentQuestion ? results[currentQuestion.id] : undefined;
  const answeredCount = Object.keys(results).length;

  async function submitCurrentAnswer() {
    if (!currentQuestion || selectedOptionIndex === null || currentResult) return;
    const result = await submitAnswer.mutateAsync({ sessionId, questionId: currentQuestion.id, selectedOptionIndex });
    setResults((current) => ({ ...current, [currentQuestion.id]: result }));
    if (result.status === "completed") await query.refetch();
  }

  function nextQuestion() {
    setSelectedOptionIndex(null);
    setCurrentIndex((index) => Math.min(index + 1, questions.length - 1));
  }

  return <main className="min-h-[calc(100vh-72px)] bg-ink-950 text-white"><div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8"><Link href="/practice" className="text-sm text-mist-400 hover:text-white">← Practice history</Link><div className="mt-8 flex flex-col gap-4 rounded-[2rem] border border-ink-800 bg-ink-900/55 p-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-bloom-500">{completed ? "Practice results" : "Practice session"}</p><h1 className="mt-3 text-3xl font-semibold">{data.session.title}</h1></div><p className="text-sm text-mist-400">{completed ? `${data.session.score ?? 0}% score` : `${Math.min(answeredCount + 1, questions.length)} of ${questions.length}`}</p></div>
  </div></main>;
}

function CompletedReview({ questions, score, total }: { questions: PracticeQuestion[]; score: number; total: number }) { return <div className="mt-6"><div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5"><p className="text-sm text-emerald-200">Session complete</p><p className="mt-2 text-3xl font-semibold text-white">{score}% <span className="text-sm font-normal text-mist-400">/ {total} questions</span></p></div><div className="mt-4 space-y-4">{questions.map((question, index) => <article key={question.id} className="rounded-2xl border border-ink-800 bg-ink-900/55 p-5"><p className="text-sm font-semibold text-mist-400">Question {index + 1}</p><h2 className="mt-2 font-semibold leading-6">{question.questionText}</h2><div className="mt-4 space-y-2">{question.options.map((option, optionIndex) => <div key={option} className={`rounded-xl border p-3 text-sm ${question.correctOptionIndex === optionIndex ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-100" : question.selectedOptionIndex === optionIndex ? "border-red-500/60 bg-red-500/10 text-red-100" : "border-ink-800 text-mist-400"}`}>{option}{question.correctOptionIndex === optionIndex ? "  ✓ Correct answer" : question.selectedOptionIndex === optionIndex ? "  ✕ Your answer" : ""}</div>)}</div><p className="mt-4 border-t border-ink-800 pt-4 text-sm text-mist-300"><span className="font-semibold text-white">Explanation:</span> {question.explanation}</p></article>)}</div><Link href="/practice/new" className="mt-6 inline-flex rounded-xl border border-ink-700 px-5 py-3 text-sm font-semibold text-mist-300 hover:border-brand-500 hover:text-white">Practice again</Link></div>; }
