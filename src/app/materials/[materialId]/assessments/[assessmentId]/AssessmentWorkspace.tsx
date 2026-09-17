"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { startTransition, useEffect, useMemo, useState } from "react";
import { useTRPC } from "@/trpc/client";

type Concept = {
  id: string;
  materialId: string;
  parentConceptId: string | null;
  name: string;
  description: string | null;
  isIncluded: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type Question = {
  id: string;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  conceptIds: string[];
};

export default function AssessmentWorkspace({ materialId, assessmentId }: { materialId: string; assessmentId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const assessmentQuery = useQuery(trpc.assessments.get.queryOptions({ assessmentId }));
  const questionsQuery = useQuery(trpc.questions.listByAssessment.queryOptions({ assessmentId }));
  const updateConfig = useMutation(trpc.assessments.updateConfig.mutationOptions({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: trpc.assessments.get.queryKey({ assessmentId }) });
    },
  }));
  const generateQuestions = useMutation(trpc.questions.generate.mutationOptions({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: trpc.questions.listByAssessment.queryKey({ assessmentId }) });
      await queryClient.invalidateQueries({ queryKey: trpc.assessments.get.queryKey({ assessmentId }) });
    },
  }));
  const updateQuestion = useMutation(trpc.questions.update.mutationOptions({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: trpc.questions.listByAssessment.queryKey({ assessmentId }) });
    },
  }));
  const regenerateQuestion = useMutation(trpc.questions.regenerate.mutationOptions({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: trpc.questions.listByAssessment.queryKey({ assessmentId }) });
    },
  }));
  const deleteQuestion = useMutation(trpc.questions.delete.mutationOptions({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: trpc.questions.listByAssessment.queryKey({ assessmentId }) });
    },
  }));

  const assessment = assessmentQuery.data?.assessment;
  const selectedConceptIds = assessmentQuery.data?.selectedConceptIds ?? [];
  const materialConcepts = useMemo(
    () => (assessmentQuery.data?.materialConcepts ?? []) as Concept[],
    [assessmentQuery.data?.materialConcepts],
  );
  const questions = (questionsQuery.data ?? []) as Question[];

  const [title, setTitle] = useState(assessment?.title ?? "");
  const [numQuestions, setNumQuestions] = useState<number>(assessment?.numQuestions ?? 10);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "mixed">(
    (assessment?.difficulty as "easy" | "medium" | "hard" | "mixed") ?? "mixed",
  );
  const [conceptSelection, setConceptSelection] = useState<string[]>(selectedConceptIds);
  const [extraGenerateCount, setExtraGenerateCount] = useState<number>(5);
  const [isQuizPreview, setIsQuizPreview] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isQuizComplete, setIsQuizComplete] = useState(false);

  useEffect(() => {
    if (assessment) {
      startTransition(() => {
        setTitle(assessment.title);
        setNumQuestions(assessment.numQuestions ?? 10);
        setDifficulty((assessment.difficulty as "easy" | "medium" | "hard" | "mixed") ?? "mixed");
        setConceptSelection(assessmentQuery.data?.selectedConceptIds ?? []);
      });
    }
  }, [assessment, assessmentQuery.data?.selectedConceptIds]);

  const topLevelConcepts = useMemo(
    () => materialConcepts.filter((concept) => !concept.parentConceptId),
    [materialConcepts],
  );

  const getChildren = (parentId: string) => materialConcepts.filter((concept) => concept.parentConceptId === parentId);

  const toggleConcept = (conceptId: string) => {
    setConceptSelection((current) =>
      current.includes(conceptId)
        ? current.filter((id) => id !== conceptId)
        : [...current, conceptId],
    );
  };

  if (assessmentQuery.isPending || questionsQuery.isPending) {
    return <main className="min-h-[calc(100vh-72px)] bg-ink-950 px-4 py-10 text-white">Loading assessment...</main>;
  }

  if (!assessment) {
    return <main className="min-h-[calc(100vh-72px)] bg-ink-950 px-4 py-10 text-white">Assessment not found.</main>;
  }

  async function handleSaveConfig() {
    await updateConfig.mutateAsync({
      assessmentId,
      numQuestions,
      difficulty,
      conceptIds: conceptSelection,
    });
  }

  async function handleGenerateQuestions() {
    await generateQuestions.mutateAsync({ assessmentId, count: numQuestions });
  }

  async function handleGenerateMore() {
    await generateQuestions.mutateAsync({ assessmentId, count: extraGenerateCount });
  }

  function startQuizPreview() {
    setAnswers({});
    setCurrentQuestionIndex(0);
    setIsQuizComplete(false);
    setIsQuizPreview(true);
  }

  function selectAnswer(questionId: string, optionIndex: number) {
    if (isQuizComplete) return;
    setAnswers((current) => ({ ...current, [questionId]: optionIndex }));
  }

  function finishQuizPreview() {
    setIsQuizComplete(true);
  }

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const score = questions.reduce(
    (total, question) => total + (answers[question.id] === question.correctOptionIndex ? 1 : 0),
    0,
  );

  if (isQuizPreview && questions.length > 0) {
    return (
      <main className="min-h-[calc(100vh-72px)] bg-[#071b2a] px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <button
            type="button"
            onClick={() => setIsQuizPreview(false)}
            className="text-sm text-sky-200 transition-colors hover:text-white"
          >
            ← Back to assessment editor
          </button>

          <div className="mt-8 overflow-hidden rounded-[2rem] border border-sky-400/20 bg-[#0b2638] shadow-2xl shadow-emerald-950/30">
            <div className="border-b border-sky-300/15 bg-gradient-to-r from-sky-500/20 to-emerald-400/15 px-6 py-7 sm:px-10">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Quiz preview</p>
                  <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{assessment.title}</h1>
                  <p className="mt-2 text-sm text-sky-100/65">Answer the questions as a student would.</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-2xl font-semibold text-emerald-300">{isQuizComplete ? `${score}/${questions.length}` : `${answeredCount}/${questions.length}`}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-sky-100/55">{isQuizComplete ? "Score" : "Answered"}</p>
                </div>
              </div>
              <div className="mt-7 h-2 overflow-hidden rounded-full bg-sky-950/70">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-300 transition-[width] duration-500"
                  style={{ width: `${isQuizComplete ? 100 : ((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            {isQuizComplete ? (
              <div className="px-6 py-12 text-center sm:px-10">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-emerald-300/40 bg-emerald-400/15 text-2xl font-semibold text-emerald-200">{Math.round((score / questions.length) * 100)}%</div>
                <h2 className="mt-6 text-2xl font-semibold">Preview complete</h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-sky-100/65">You answered {score} of {questions.length} questions correctly. Review the questions or try the preview again.</p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <button type="button" onClick={startQuizPreview} className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-[#062319] transition-colors hover:bg-emerald-300">Try again</button>
                  <button type="button" onClick={() => setIsQuizPreview(false)} className="rounded-full border border-sky-300/30 px-5 py-3 text-sm font-semibold text-sky-100 transition-colors hover:border-sky-200">Edit questions</button>
                </div>
              </div>
            ) : (
              <div className="px-6 py-8 sm:px-10 sm:py-10">
                <p className="text-sm font-semibold text-emerald-300">Question {currentQuestionIndex + 1} <span className="font-normal text-sky-100/45">of {questions.length}</span></p>
                <h2 className="mt-5 text-2xl font-medium leading-9 text-white sm:text-3xl">{currentQuestion.questionText}</h2>
                <div className="mt-8 grid gap-3">
                  {currentQuestion.options?.map((option: string, optionIndex: number) => {
                    const isSelected = answers[currentQuestion.id] === optionIndex;
                    return (
                      <button
                        key={`${currentQuestion.id}-preview-${optionIndex}`}
                        type="button"
                        onClick={() => selectAnswer(currentQuestion.id, optionIndex)}
                        className={`flex items-center gap-4 rounded-2xl border px-4 py-4 text-left text-sm transition-all ${isSelected ? "border-emerald-300 bg-emerald-400/15 text-emerald-100 shadow-lg shadow-emerald-950/20" : "border-sky-200/15 bg-sky-950/25 text-sky-100/75 hover:border-sky-300/45 hover:bg-sky-400/10"}`}
                      >
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${isSelected ? "border-emerald-300 bg-emerald-300 text-[#062319]" : "border-sky-200/25 text-sky-200/65"}`}>{String.fromCharCode(65 + optionIndex)}</span>
                        <span>{option}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-9 flex items-center justify-between gap-3 border-t border-sky-300/15 pt-6">
                  <button type="button" onClick={() => setCurrentQuestionIndex((index) => Math.max(0, index - 1))} disabled={currentQuestionIndex === 0} className="rounded-full border border-sky-200/20 px-4 py-2.5 text-sm font-medium text-sky-100/70 transition-colors hover:border-sky-200/50 disabled:cursor-not-allowed disabled:opacity-30">Previous</button>
                  {currentQuestionIndex === questions.length - 1 ? (
                    <button type="button" onClick={finishQuizPreview} disabled={answeredCount < questions.length} className="rounded-full bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-[#062319] transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40">Finish quiz</button>
                  ) : (
                    <button type="button" onClick={() => setCurrentQuestionIndex((index) => Math.min(questions.length - 1, index + 1))} className="rounded-full bg-sky-400 px-5 py-2.5 text-sm font-semibold text-[#061b2b] transition-colors hover:bg-sky-300">Next question</button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-72px)] bg-ink-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href={`/materials/${materialId}/concepts`} className="text-sm text-mist-400 hover:text-white">← Back to concepts</Link>
        <div className="mt-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">Assessment</p>
            <h1 className="mt-3 text-3xl font-semibold">{assessment.title}</h1>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[2rem] border border-ink-800 bg-ink-900/55 p-5">
            <h2 className="text-xl font-semibold">Configuration</h2>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm text-mist-300">Title</label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-xl border border-ink-700 bg-ink-950/55 px-3 py-2.5 text-white outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-mist-300">Questions in the next batch</label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={numQuestions}
                  onChange={(event) => setNumQuestions(Math.min(200, Math.max(1, Number(event.target.value) || 1)))}
                  className="w-full rounded-xl border border-ink-700 bg-ink-950/55 px-3 py-2.5 text-white outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-mist-300">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(event) => setDifficulty(event.target.value as "easy" | "medium" | "hard" | "mixed")}
                  className="w-full rounded-xl border border-ink-700 bg-ink-950/55 px-3 py-2.5 text-white outline-none focus:border-brand-500"
                >
                  <option value="mixed">Mixed</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <p className="mb-2 text-sm text-mist-300">Concepts to include</p>
                <div className="space-y-4">
                  {topLevelConcepts.map((concept) => (
                    <div key={concept.id} className="rounded-2xl border border-ink-800 bg-ink-950/35 p-3">
                      <label className={`flex items-center justify-between gap-3 ${!concept.isIncluded ? "text-mist-500" : "text-white"}`}>
                        <span className="font-medium">{concept.name}</span>
                        <input
                          type="checkbox"
                          checked={conceptSelection.includes(concept.id)}
                          onChange={() => toggleConcept(concept.id)}
                        />
                      </label>
                      <div className="mt-3 ml-4 space-y-2 border-l border-ink-700 pl-3">
                        {getChildren(concept.id).map((subConcept) => (
                          <label key={subConcept.id} className={`flex items-center justify-between gap-3 ${!subConcept.isIncluded ? "text-mist-500" : "text-white"}`}>
                            <span>{subConcept.name}</span>
                            <input
                              type="checkbox"
                              checked={conceptSelection.includes(subConcept.id)}
                              onChange={() => toggleConcept(subConcept.id)}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={updateConfig.isPending}
                  className="rounded-full bg-gradient-to-r from-brand-600 to-bloom-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {updateConfig.isPending ? "Saving..." : "Save configuration"}
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-ink-800 bg-ink-900/55 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Questions</h2>
              <div className="flex items-center gap-2">
                {questions.length > 0 && (
                  <button
                    type="button"
                    onClick={startQuizPreview}
                    className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition-colors hover:border-emerald-300 hover:bg-emerald-400/20"
                  >
                    Preview quiz
                  </button>
                )}
                {!questions.length && (
                <button
                  type="button"
                  onClick={handleGenerateQuestions}
                  disabled={generateQuestions.isPending}
                  className="rounded-full bg-gradient-to-r from-brand-600 to-bloom-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generateQuestions.isPending ? "Generating..." : "Generate questions"}
                </button>
                )}
              </div>
            </div>

            {questions.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-ink-700 bg-ink-950/30 p-6 text-sm text-mist-400">
                No questions generated yet for this assessment.
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                <div className="flex items-center gap-3 rounded-2xl border border-ink-800 bg-ink-950/35 p-3">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={extraGenerateCount}
                    onChange={(event) => setExtraGenerateCount(Math.min(100, Math.max(1, Number(event.target.value) || 1)))}
                    className="w-20 rounded-lg border border-ink-700 bg-ink-950/55 px-2 py-1.5 text-sm text-white outline-none focus:border-brand-500"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateMore}
                    disabled={generateQuestions.isPending}
                    className="rounded-full border border-brand-500/40 bg-brand-500/10 px-3 py-2 text-xs font-semibold text-brand-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Generate more
                  </button>
                </div>

                {questions.map((question, index) => (
                  <div key={question.id} className="rounded-2xl border border-ink-800 bg-ink-950/35 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-mist-300">Question {index + 1}</p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => regenerateQuestion.mutate({ id: question.id })}
                          className="rounded-full border border-ink-700 bg-ink-900/80 px-2.5 py-1.5 text-xs font-medium text-mist-200"
                        >
                          Regenerate
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteQuestion.mutate({ id: question.id })}
                          className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <textarea
                      value={question.questionText}
                      onChange={(event) => updateQuestion.mutate({ id: question.id, questionText: event.target.value })}
                      rows={3}
                      className="mt-3 w-full resize-none rounded-xl border border-ink-700 bg-ink-950/55 p-3 text-sm text-white outline-none focus:border-brand-500"
                    />

                    <div className="mt-3 space-y-2">
                      {question.options?.map((option: string, optionIndex: number) => (
                        <div key={`${question.id}-option-${optionIndex}`} className="flex items-center gap-3">
                          <input
                            type="radio"
                            checked={question.correctOptionIndex === optionIndex}
                            onChange={() => updateQuestion.mutate({ id: question.id, correctOptionIndex: optionIndex })}
                            className="h-4 w-4"
                          />
                          <input
                            value={option}
                            onChange={(event) => {
                              const nextOptions = [...(question.options ?? [])];
                              nextOptions[optionIndex] = event.target.value;
                              updateQuestion.mutate({ id: question.id, options: nextOptions });
                            }}
                            className="flex-1 rounded-lg border border-ink-700 bg-ink-950/55 px-2 py-1.5 text-sm text-white outline-none focus:border-brand-500"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <label className="text-xs uppercase tracking-[0.14em] text-mist-400">Difficulty</label>
                      <span className="rounded-full border border-brand-500/30 bg-brand-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-200">
                        {question.difficulty}
                      </span>
                    </div>

                    <div className="mt-3">
                      <label className="mb-1 block text-xs uppercase tracking-[0.14em] text-mist-400">Explanation</label>
                      <textarea
                        value={question.explanation ?? ""}
                        onChange={(event) => updateQuestion.mutate({ id: question.id, explanation: event.target.value })}
                        rows={3}
                        className="w-full resize-none rounded-xl border border-ink-700 bg-ink-950/55 p-3 text-sm text-white outline-none focus:border-brand-500"
                      />
                    </div>

                    <div className="mt-3">
                      <label className="mb-1 block text-xs uppercase tracking-[0.14em] text-mist-400">Concept</label>
                      <select
                        value={question.conceptIds?.[0] ?? ""}
                        onChange={(event) => updateQuestion.mutate({ id: question.id, conceptId: event.target.value })}
                        className="w-full rounded-xl border border-ink-700 bg-ink-950/55 px-3 py-2.5 text-sm text-white outline-none focus:border-brand-500"
                      >
                        {materialConcepts.map((concept) => (
                          <option key={concept.id} value={concept.id}>{concept.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
