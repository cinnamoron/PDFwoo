import { TRPCError } from "@trpc/server";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { generateObject } from "ai";
import { db } from "@/index";
import { fallbackModel, model } from "@/lib/ai";
import {
  assessmentConcepts,
  assessments,
  concepts,
  questionConcepts,
  questions,
  studyMaterials,
} from "@/db/schema/schema";
import { createTRPCRouter, protectedProcedure } from "../init";

const questionOptionSchema = z.array(z.string()).length(4);

const generatedQuestionSchema = z.object({
  questionText: z.string().min(1),
  options: questionOptionSchema,
  correctOptionIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

function getProviderStatusCode(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  if ("statusCode" in error && typeof error.statusCode === "number") {
    return error.statusCode;
  }
  if ("lastError" in error) return getProviderStatusCode(error.lastError);
  return undefined;
}

function getProviderFailureMessage(error: unknown): string {
  const statusCode = getProviderStatusCode(error);

  if (statusCode === 401) {
    return "The Gemini API key is invalid or revoked. Replace GOOGLE_GENERATIVE_AI_API_KEY in the server environment.";
  }
  if (statusCode === 403) {
    return "Gemini denied this API key. Check that the Generative Language API is enabled and that the key is not restricted.";
  }
  if (statusCode === 404) {
    return "The configured AI model is unavailable. Check the server model configuration.";
  }
  if (statusCode === 429) {
    return "Question generation is temporarily unavailable because the AI provider quota was reached. Please try again later.";
  }
  if (statusCode !== undefined && statusCode >= 500) {
    return "The AI provider is temporarily unavailable. Please try again shortly.";
  }
  if (error instanceof TypeError) {
    return "Could not connect to the AI provider. Check the server's network connection and try again.";
  }
  return "The AI provider could not generate questions. Check the server logs for details.";
}

async function generateWithQuotaFallback<TSchema extends z.ZodType>(
  schema: TSchema,
  prompt: string,
) {
  const request = { schema, prompt, maxRetries: 0 };

  try {
    return await generateObject({ ...request, model });
  } catch (primaryError) {
    const statusCode = getProviderStatusCode(primaryError);
    if (statusCode === 401 || statusCode === 403) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: getProviderFailureMessage(primaryError),
      });
    }
  }

  try {
    return await generateObject({ ...request, model: fallbackModel });
  } catch (fallbackError) {
    throw new TRPCError({
      code:
        getProviderStatusCode(fallbackError) === 429
          ? "TOO_MANY_REQUESTS"
          : "INTERNAL_SERVER_ERROR",
      message: getProviderFailureMessage(fallbackError),
    });
  }
}

function buildDifficultySplit(
  count: number,
): Record<"easy" | "medium" | "hard", number> {
  if (count <= 0) {
    return { easy: 0, medium: 0, hard: 0 };
  }

  const easy = Math.ceil(count / 3);
  const medium = Math.ceil((count - easy) / 2);
  const hard = count - easy - medium;

  return {
    easy,
    medium,
    hard,
  };
}

async function getAssessmentWithMaterial(assessmentId: string, userId: string) {
  const [assessment] = await db
    .select()
    .from(assessments)
    .where(eq(assessments.id, assessmentId));

  if (!assessment) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Assessment not found" });
  }

  const [material] = await db
    .select()
    .from(studyMaterials)
    .where(eq(studyMaterials.id, assessment.materialId));

  if (!material) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Material not found" });
  }

  if (material.teacherId !== userId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  return { assessment, material };
}

async function getQuestionWithAssessment(questionId: string, userId: string) {
  const [question] = await db
    .select()
    .from(questions)
    .where(eq(questions.id, questionId));

  if (!question) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });
  }

  const [assessment] = await db
    .select()
    .from(assessments)
    .where(eq(assessments.id, question.assessmentId));

  if (!assessment) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Assessment not found" });
  }

  const [material] = await db
    .select()
    .from(studyMaterials)
    .where(eq(studyMaterials.id, assessment.materialId));

  if (!material) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Material not found" });
  }

  if (material.teacherId !== userId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  return { question, assessment, material };
}

export const questionsRouter = createTRPCRouter({
  generate: protectedProcedure
    .input(
      z.object({
        assessmentId: z.string().min(1),
        count: z.number().int().min(1).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { assessment, material } = await getAssessmentWithMaterial(
        input.assessmentId,
        ctx.session.user.id,
      );

      const selectedConcepts = await db
        .select({
          id: concepts.id,
          name: concepts.name,
          description: concepts.description,
        })
        .from(assessmentConcepts)
        .innerJoin(concepts, eq(concepts.id, assessmentConcepts.conceptId))
        .where(eq(assessmentConcepts.assessmentId, assessment.id));

      if (selectedConcepts.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Select at least one concept before generating questions.",
        });
      }

      const totalCount = input.count;
      const conceptShares = selectedConcepts.map((concept, index) => {
        const base = Math.floor(totalCount / selectedConcepts.length);
        const extra = index < totalCount % selectedConcepts.length ? 1 : 0;
        return { concept, share: base + extra };
      });

      const inserted: Array<{
        id: string;
        assessmentId: string;
        questionText: string;
        options: string[];
        correctOptionIndex: number;
        explanation: string;
        difficulty: "easy" | "medium" | "hard";
      }> = [];

      const questionConceptLinks: Array<{
        questionId: string;
        conceptId: string;
      }> = [];

      const generationTasks = conceptShares.flatMap(({ concept, share }) => {
        if (share <= 0) return [];

        let conceptDifficultyCounts: Record<
          "easy" | "medium" | "hard",
          number
        > = { easy: 0, medium: 0, hard: 0 };
        if (assessment.difficulty === "mixed") {
          conceptDifficultyCounts = buildDifficultySplit(share);
        } else {
          const difficulty =
            assessment.difficulty === "easy" ||
            assessment.difficulty === "medium" ||
            assessment.difficulty === "hard"
              ? assessment.difficulty
              : "medium";
          conceptDifficultyCounts = { easy: 0, medium: 0, hard: 0 };
          conceptDifficultyCounts[difficulty] = share;
        }

        return (Object.entries(conceptDifficultyCounts) as Array<[
          "easy" | "medium" | "hard",
          number
        ]>).flatMap(([difficultyKey, count]) => {
          if (count <= 0) return [];

          return [
            async () => {
              const { object } = await generateWithQuotaFallback(
                z.array(generatedQuestionSchema),
                `Generate ${count} ${difficultyKey} question(s) grounded only in this material and concept. Use the exact concept name and description as your anchor, and keep the content consistent with the source material. Return a JSON array of objects with questionText, options (exactly 4 strings), correctOptionIndex, explanation, and difficulty. The questions must be aligned to the concept and should not invent unsupported facts.\n\nConcept name: ${concept.name}\nConcept description: ${concept.description ?? "No additional description available."}\n\nMaterial text:\n${material.extractedText ?? "No extracted text available."}`,
              );

              const generated = Array.isArray(object) ? object : [];
              const generatedRows = generated.slice(0, count).map((item) => {
                const questionId = randomUUID();
                return {
                  questionId,
                  row: {
                    id: questionId,
                    assessmentId: assessment.id,
                    questionText: item.questionText,
                    options: item.options,
                    correctOptionIndex: item.correctOptionIndex,
                    explanation: item.explanation,
                    difficulty: item.difficulty,
                  },
                  conceptId: concept.id,
                };
              });

              return generatedRows;
            },
          ];
        });
      });

      for (const generationTask of generationTasks) {
        const batch = await generationTask();
        for (const item of batch) {
          inserted.push(item.row);
          questionConceptLinks.push({
            questionId: item.questionId,
            conceptId: item.conceptId,
          });
        }
      }

      if (inserted.length === 0) {
        return [];
      }

      await db.insert(questions).values(inserted);
      await db.insert(questionConcepts).values(questionConceptLinks);

      return inserted;
    }),

  listByAssessment: protectedProcedure
    .input(z.object({ assessmentId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { assessment } = await getAssessmentWithMaterial(
        input.assessmentId,
        ctx.session.user.id,
      );

      const rows = await db
        .select({
          question: questions,
          conceptId: questionConcepts.conceptId,
          conceptName: concepts.name,
        })
        .from(questions)
        .leftJoin(
          questionConcepts,
          eq(questionConcepts.questionId, questions.id),
        )
        .leftJoin(concepts, eq(concepts.id, questionConcepts.conceptId))
        .where(eq(questions.assessmentId, assessment.id));

      const grouped = new Map<string, any>();

      for (const row of rows) {
        if (!grouped.has(row.question.id)) {
          grouped.set(row.question.id, {
            ...row.question,
            conceptIds: [],
            conceptNames: [],
          });
        }

        const current = grouped.get(row.question.id);
        if (row.conceptId && !current.conceptIds.includes(row.conceptId)) {
          current.conceptIds.push(row.conceptId);
          current.conceptNames.push(row.conceptName ?? "Unknown concept");
        }
      }

      return Array.from(grouped.values());
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        questionText: z.string().min(1).optional(),
        options: z.array(z.string()).length(4).optional(),
        correctOptionIndex: z.number().int().min(0).max(3).optional(),
        explanation: z.string().min(1).optional(),
        conceptId: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { question, assessment, material } =
        await getQuestionWithAssessment(input.id, ctx.session.user.id);

      const validConcepts = await db
        .select()
        .from(concepts)
        .where(eq(concepts.materialId, material.id));

      const validConceptIds = new Set(
        validConcepts.map((concept) => concept.id),
      );

      if (input.conceptId && !validConceptIds.has(input.conceptId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That concept does not belong to this material.",
        });
      }

      const [updatedQuestion] = await db
        .update(questions)
        .set({
          questionText: input.questionText ?? question.questionText,
          options: input.options ?? question.options,
          correctOptionIndex:
            input.correctOptionIndex ?? question.correctOptionIndex,
          explanation: input.explanation ?? question.explanation,
        })
        .where(eq(questions.id, question.id))
        .returning();

      if (input.conceptId) {
        await db
          .delete(questionConcepts)
          .where(eq(questionConcepts.questionId, question.id));
        await db.insert(questionConcepts).values({
          questionId: question.id,
          conceptId: input.conceptId,
        });
      }

      return updatedQuestion;
    }),

  regenerate: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { question, assessment, material } =
        await getQuestionWithAssessment(input.id, ctx.session.user.id);

      const [currentConcept] = await db
        .select()
        .from(questionConcepts)
        .innerJoin(concepts, eq(concepts.id, questionConcepts.conceptId))
        .where(eq(questionConcepts.questionId, question.id));

      if (!currentConcept) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Question is missing its concept link.",
        });
      }

      const { object } = await generateWithQuotaFallback(
        generatedQuestionSchema,
        `Create a single replacement question for this concept and difficulty. Keep it grounded only in the material text. The question should be written at ${question.difficulty} level.\n\nConcept name: ${currentConcept.concepts.name}\nConcept description: ${currentConcept.concepts.description ?? "No description available."}\n\nMaterial text:\n${material.extractedText ?? "No extracted text available."}`,
      );

      const [updatedQuestion] = await db
        .update(questions)
        .set({
          questionText: object.questionText,
          options: object.options,
          correctOptionIndex: object.correctOptionIndex,
          explanation: object.explanation,
          difficulty: object.difficulty,
        })
        .where(eq(questions.id, question.id))
        .returning();

      return updatedQuestion;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { question, assessment } = await getQuestionWithAssessment(
        input.id,
        ctx.session.user.id,
      );

      await db.delete(questions).where(eq(questions.id, question.id));
      return question;
    }),
});
