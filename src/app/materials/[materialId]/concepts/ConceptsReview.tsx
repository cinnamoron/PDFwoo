"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function ConceptsReview({ materialId }: { materialId: string }) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const conceptsQuery = useQuery(trpc.concepts.listByMaterial.queryOptions({ materialId }));
  const generateConcepts = useMutation(trpc.concepts.generate.mutationOptions({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: trpc.concepts.listByMaterial.queryKey({ materialId }) });
      await queryClient.invalidateQueries({ queryKey: trpc.materials.list.queryKey() });
    },
  }));
  const updateConcept = useMutation(trpc.concepts.update.mutationOptions({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: trpc.concepts.listByMaterial.queryKey({ materialId }) });
    },
  }));
  const createConcept = useMutation(trpc.concepts.create.mutationOptions({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: trpc.concepts.listByMaterial.queryKey({ materialId }) });
    },
  }));
  const deleteConcept = useMutation(trpc.concepts.delete.mutationOptions({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: trpc.concepts.listByMaterial.queryKey({ materialId }) });
    },
  }));
  const createAssessment = useMutation(trpc.assessments.create.mutationOptions());
  const updateAssessmentConfig = useMutation(trpc.assessments.updateConfig.mutationOptions());

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newParentId, setNewParentId] = useState("");

  const concepts = (conceptsQuery.data ?? []) as Concept[];
  const topLevelConcepts = useMemo(
    () => concepts.filter((concept) => !concept.parentConceptId),
    [concepts],
  );

  const handleGenerate = async () => {
    await generateConcepts.mutateAsync({ materialId });
  };

  const handleCreateAssessment = async () => {
    const includedConceptIds = concepts.filter((concept) => concept.isIncluded).map((concept) => concept.id);
    const assessment = await createAssessment.mutateAsync({ materialId });

    await updateAssessmentConfig.mutateAsync({
      assessmentId: assessment.id,
      numQuestions: 10,
      difficulty: "mixed",
      conceptIds: includedConceptIds.length > 0 ? includedConceptIds : concepts.map((concept) => concept.id),
    });

    router.push(`/materials/${materialId}/assessments/${assessment.id}`);
  };

  if (conceptsQuery.isPending) {
    return <main className="min-h-[calc(100vh-72px)] bg-ink-950 px-4 py-10 text-white">Loading concepts...</main>;
  }

  if (concepts.length === 0) {
    return (
      <main className="min-h-[calc(100vh-72px)] bg-ink-950 px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-ink-800 bg-ink-900/55 p-8">
          <Link href="/materials" className="text-sm text-mist-400 hover:text-white">← Back to materials</Link>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-bloom-500">Concept review</p>
          <h1 className="mt-3 text-3xl font-semibold">No concepts generated yet</h1>
          <p className="mt-3 text-mist-400">Generate a concept map from the extracted PDF content.</p>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generateConcepts.isPending}
            className="mt-6 rounded-full bg-gradient-to-r from-brand-600 to-bloom-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generateConcepts.isPending ? "Generating concepts..." : "Generate concepts"}
          </button>
        </div>
      </main>
    );
  }

  const getChildren = (parentId: string) => concepts.filter((concept) => concept.parentConceptId === parentId);

  function updateField(id: string, field: "name" | "description" | "isIncluded", value: string | boolean) {
    const target = concepts.find((concept) => concept.id === id);
    if (!target) return;

    updateConcept.mutate({
      id,
      ...(field === "name" ? { name: String(value) } : {}),
      ...(field === "description" ? { description: String(value) } : {}),
      ...(field === "isIncluded" ? { isIncluded: Boolean(value) } : {}),
    });
  }

  const handleCreateConcept = async () => {
    if (!newName.trim()) return;

    await createConcept.mutateAsync({
      materialId,
      parentConceptId: newParentId || undefined,
      name: newName.trim(),
      description: newDescription.trim() || undefined,
    });

    setNewName("");
    setNewDescription("");
    setNewParentId("");
  };

  return (
    <main className="min-h-[calc(100vh-72px)] bg-ink-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/materials" className="text-sm text-mist-400 hover:text-white">← Back to materials</Link>
        <div className="mt-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bloom-500">Concept review</p>
            <h1 className="mt-3 text-3xl font-semibold">Concept map</h1>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generateConcepts.isPending || createAssessment.isPending || updateAssessmentConfig.isPending}
              className="rounded-full border border-ink-700 bg-ink-900/80 px-4 py-2 text-sm font-medium text-mist-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generateConcepts.isPending ? "Generating..." : "Generate concepts"}
            </button>
            <button
              type="button"
              onClick={handleCreateAssessment}
              disabled={createAssessment.isPending || updateAssessmentConfig.isPending}
              className="rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 px-4 py-2 text-sm font-semibold text-[#062319] shadow-lg shadow-emerald-950/20 transition-colors hover:from-sky-400 hover:to-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createAssessment.isPending || updateAssessmentConfig.isPending ? "Preparing quiz..." : "Create assessment & write quiz"}
            </button>
          </div>
        </div>

        <div className="mt-8 space-y-5">
          {topLevelConcepts.map((concept) => (
            <div key={concept.id} className="rounded-[1.5rem] border border-ink-800 bg-ink-900/55 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      value={concept.name}
                      onChange={(event) => updateField(concept.id, "name", event.target.value)}
                      className="w-full bg-transparent text-xl font-semibold text-white outline-none placeholder:text-mist-500"
                    />
                    <input
                      type="checkbox"
                      checked={concept.isIncluded}
                      onChange={(event) => updateField(concept.id, "isIncluded", event.target.checked)}
                      aria-label={`Include concept ${concept.name}`}
                    />
                  </div>
                  <textarea
                    value={concept.description ?? ""}
                    onChange={(event) => updateField(concept.id, "description", event.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-ink-700 bg-ink-950/55 p-3 text-sm text-mist-200 outline-none focus:border-brand-500"
                    placeholder="Add a short description"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => deleteConcept.mutate({ id: concept.id })}
                  className="rounded-full border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200"
                >
                  Delete
                </button>
              </div>

              <div className="mt-5 ml-4 space-y-4 border-l border-ink-700 pl-4">
                {getChildren(concept.id).map((subConcept) => (
                  <div key={subConcept.id} className="rounded-2xl border border-ink-700 bg-ink-950/35 p-3">
                    <div className="flex items-start gap-3">
                      <input
                        value={subConcept.name}
                        onChange={(event) => updateField(subConcept.id, "name", event.target.value)}
                        className="flex-1 bg-transparent text-base font-medium text-white outline-none"
                      />
                      <input
                        type="checkbox"
                        checked={subConcept.isIncluded}
                        onChange={(event) => updateField(subConcept.id, "isIncluded", event.target.checked)}
                        aria-label={`Include concept ${subConcept.name}`}
                      />
                      <button
                        type="button"
                        onClick={() => deleteConcept.mutate({ id: subConcept.id })}
                        className="text-xs text-red-200"
                      >
                        Delete
                      </button>
                    </div>
                    <textarea
                      value={subConcept.description ?? ""}
                      onChange={(event) => updateField(subConcept.id, "description", event.target.value)}
                      rows={2}
                      className="mt-3 w-full resize-none rounded-xl border border-ink-700 bg-ink-950/55 p-2 text-sm text-mist-200 outline-none focus:border-brand-500"
                      placeholder="Subconcept description"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-[1.5rem] border border-ink-800 bg-ink-900/55 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-500">Add concept</p>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Concept name"
              className="rounded-xl border border-ink-700 bg-ink-950/55 px-3 py-2.5 text-sm text-white outline-none focus:border-brand-500"
            />
            <select
              value={newParentId}
              onChange={(event) => setNewParentId(event.target.value)}
              className="rounded-xl border border-ink-700 bg-ink-950/55 px-3 py-2.5 text-sm text-white outline-none focus:border-brand-500"
            >
              <option value="">Top-level concept</option>
              {concepts.map((concept) => (
                <option key={concept.id} value={concept.id}>{concept.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleCreateConcept}
              disabled={createConcept.isPending || !newName.trim()}
              className="rounded-full bg-gradient-to-r from-brand-600 to-bloom-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add
            </button>
          </div>
          <textarea
            value={newDescription}
            onChange={(event) => setNewDescription(event.target.value)}
            rows={3}
            placeholder="Optional description"
            className="mt-3 w-full resize-none rounded-xl border border-ink-700 bg-ink-950/55 p-3 text-sm text-mist-200 outline-none focus:border-brand-500"
          />
        </div>
      </div>
    </main>
  );
}
