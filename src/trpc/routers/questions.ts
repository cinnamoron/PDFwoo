import { TRPCError } from "@trpc/server";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { generateObject } from "ai";
import { db } from "@/index";
import { model } from "@/lib/ai";
import { assessmentConcepts, assessments, concepts, questionConcepts, questions, studyMaterials } from "@/db/schema/schema";
import { createTRPCRouter, protectedProcedure } from "../init";

const questionOptionSchema = z.array(z.string()).length(4);

const generatedQuestionSchema = z.object({
  questionText: z.string().min(1),
  options: questionOptionSchema,
  correctOptionIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

function buildDifficultySplit(count: number): Record<"easy" | "medium" | "hard", number> {
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
      const { assessment, material } = await getAssessmentWithMaterial(input.assessmentId, ctx.session.user.id);

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

      const questionConceptLinks: Array<{ questionId: string; conceptId: string }> = [];

      for (const { concept, share } of conceptShares) {
        if (share <= 0) continue;

        let conceptDifficultyCounts: Record<"easy" | "medium" | "hard", number> = { easy: 0, medium: 0, hard: 0 };
        if (assessment.difficulty === "mixed") {
          conceptDifficultyCounts = buildDifficultySplit(share);
        } else {
          const difficulty = assessment.difficulty === "easy" || assessment.difficulty === "medium" || assessment.difficulty === "hard"
            ? assessment.difficulty
            : "medium";
          conceptDifficultyCounts = { easy: 0, medium: 0, hard: 0 };
          conceptDifficultyCounts[difficulty] = share;
        }

        for (const [difficultyKey, count] of Object.entries(conceptDifficultyCounts) as Array<["easy" | "medium" | "hard", number]>) {
          if (count <= 0) continue;

          const { object } = await generateObject({
            model,
            schema: z.array(generatedQuestionSchema),
            prompt: `Generate ${count} ${difficultyKey} question(s) grounded only in this material and concept. Use the exact concept name and description as your anchor, and keep the content consistent with the source material. Return a JSON array of objects with questionText, options (exactly 4 strings), correctOptionIndex, explanation, and difficulty. The questions must be aligned to the concept and should not invent unsupported facts.\n\nConcept name: ${concept.name}\nConcept description: ${concept.description ?? "No additional description available."}\n\nMaterial text:\n${material.extractedText ?? "No extracted text available."}`,
          });

          const generated = Array.isArray(object) ? object : [];

          for (const item of generated.slice(0, count)) {
            const questionId = randomUUID();
            inserted.push({
              id: questionId,
              assessmentId: assessment.id,
              questionText: item.questionText,
              options: item.options,
              correctOptionIndex: item.correctOptionIndex,
              explanation: item.explanation,
              difficulty: item.difficulty,
            });
            questionConceptLinks.push({ questionId, conceptId: concept.id });
          }
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
      const { assessment } = await getAssessmentWithMaterial(input.assessmentId, ctx.session.user.id);

      const rows = await db
        .select({
          question: questions,
          conceptId: questionConcepts.conceptId,
          conceptName: concepts.name,
        })
        .from(questions)
        .leftJoin(questionConcepts, eq(questionConcepts.questionId, questions.id))
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
      const { question, assessment, material } = await getQuestionWithAssessment(input.id, ctx.session.user.id);

      const validConcepts = await db
        .select()
        .from(concepts)
        .where(eq(concepts.materialId, material.id));

      const validConceptIds = new Set(validConcepts.map((concept) => concept.id));

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
          correctOptionIndex: input.correctOptionIndex ?? question.correctOptionIndex,
          explanation: input.explanation ?? question.explanation,
        })
        .where(eq(questions.id, question.id))
        .returning();

      if (input.conceptId) {
        await db.delete(questionConcepts).where(eq(questionConcepts.questionId, question.id));
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
      const { question, assessment, material } = await getQuestionWithAssessment(input.id, ctx.session.user.id);

      const [currentConcept] = await db
        .select()
        .from(questionConcepts)
        .innerJoin(concepts, eq(concepts.id, questionConcepts.conceptId))
        .where(eq(questionConcepts.questionId, question.id));

      if (!currentConcept) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Question is missing its concept link." });
      }

      const { object } = await generateObject({
        model,
        schema: generatedQuestionSchema,
        prompt: `Create a single replacement question for this concept and difficulty. Keep it grounded only in the material text. The question should be written at ${question.difficulty} level.\n\nConcept name: ${currentConcept.concepts.name}\nConcept description: ${currentConcept.concepts.description ?? "No description available."}\n\nMaterial text:\n${material.extractedText ?? "No extracted text available."}`,
      });

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
      const { question, assessment } = await getQuestionWithAssessment(input.id, ctx.session.user.id);

      await db.delete(questions).where(eq(questions.id, question.id));
      return question;
    }),
});
