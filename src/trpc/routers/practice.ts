import { TRPCError } from "@trpc/server";
import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { generateObject } from "ai";
import { db } from "@/index";
import { model } from "@/lib/ai";
import { concepts, practiceAnswers, practiceQuestions, practiceSessions, practiceTopics, studyMaterials, user } from "@/db/schema/schema";
import { createTRPCRouter, protectedProcedure } from "../init";

const generatedPracticeQuestionSchema = z.object({
  questionText: z.string().min(1),
  options: z.array(z.string()).length(4),
  correctOptionIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

const answerSchema = z.object({
  questionId: z.string().min(1),
  selectedOptionIndex: z.number().int().min(0).max(3),
});

async function getSessionForOwner(sessionId: string, userId: string) {
  const [session] = await db.select().from(practiceSessions).where(eq(practiceSessions.id, sessionId));
  if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Practice session not found" });
  if (session.studentId !== userId) throw new TRPCError({ code: "FORBIDDEN" });
  return session;
}

export const practiceRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        materialId: z.string().min(1).optional(),
        conceptIds: z.array(z.string().min(1)).default([]),
        customTopics: z.array(z.string().min(1)).default([]),
        numQuestions: z.number().int().min(1).max(200),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const conceptIds = input.conceptIds.map((id) => id.trim()).filter(Boolean);
      const customTopics = input.customTopics.map((item) => item.trim()).filter(Boolean);

      if (conceptIds.length === 0 && customTopics.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Add at least one concept or custom topic." });
      }

      if (conceptIds.length > 0 && !input.materialId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A material is required when using concept topics." });
      }

      const materialId = input.materialId ?? null;
      let materialName = "Practice";
      if (materialId) {
        const [material] = await db.select().from(studyMaterials).where(eq(studyMaterials.id, materialId));
        if (!material) throw new TRPCError({ code: "NOT_FOUND", message: "Material not found" });
        if (material.teacherId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        materialName = material.fileName.replace(/\.pdf$/i, "");
      }

      const selectedTopics: Array<{ label: string; source: "concept" | "custom"; conceptId?: string }> = [];
      for (const conceptId of conceptIds) {
        const [concept] = await db.select().from(concepts).where(eq(concepts.id, conceptId));
        if (!concept) throw new TRPCError({ code: "NOT_FOUND", message: "Concept not found" });
        if (concept.materialId !== materialId) throw new TRPCError({ code: "BAD_REQUEST", message: "Concept does not belong to the selected material." });
        selectedTopics.push({ label: concept.name, source: "concept", conceptId: concept.id });
      }
      for (const customTopic of customTopics) {
        selectedTopics.push({ label: customTopic, source: "custom" });
      }

      const [session] = await db
        .insert(practiceSessions)
        .values({
          id: randomUUID(),
          studentId: ctx.session.user.id,
          materialId,
          title: `${materialName} practice`,
          status: "in_progress",
          totalQuestions: input.numQuestions,
        })
        .returning();

      const shares = new Map<string, number>();
      const totalTopics = selectedTopics.length || 1;
      for (let index = 0; index < selectedTopics.length; index += 1) {
        const base = Math.floor(input.numQuestions / totalTopics);
        const extra = index < input.numQuestions % totalTopics ? 1 : 0;
        shares.set(`${selectedTopics[index].source}:${selectedTopics[index].label}`, base + extra);
      }

      const practiceTopicRows: Array<{ id: string; practiceSessionId: string; label: string; source: "concept" | "custom"; conceptId: string | null }> = [];
      const createdQuestions: Array<any> = [];

      for (const topic of selectedTopics) {
        const topicId = randomUUID();
        practiceTopicRows.push({
          id: topicId,
          practiceSessionId: session.id,
          label: topic.label,
          source: topic.source,
          conceptId: topic.conceptId ?? null,
        });

        const topicCount = shares.get(`${topic.source}:${topic.label}`) ?? 0;
        if (topicCount <= 0) continue;

        let prompt = `Generate ${topicCount} ${topic.source === "concept" ? "concept-grounded" : "general knowledge"} multiple-choice question(s) on the topic "${topic.label}". Use the exact topic label as the anchor. For concept questions, ground the content only in the material and stay faithful to the source text. For custom topics, there is no source document; answer from general knowledge on this topic. Return a JSON array of objects with questionText, options (exactly 4 strings), correctOptionIndex, explanation, and difficulty.`;

        if (topic.source === "concept") {
          const [concept] = await db.select().from(concepts).where(eq(concepts.id, topic.conceptId!));
          if (!materialId) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Concept topics require a material." });
          }
          const [material] = await db.select().from(studyMaterials).where(eq(studyMaterials.id, materialId));
          prompt = `${prompt}\n\nConcept name: ${concept.name}\nConcept description: ${concept.description ?? "No description available."}\n\nMaterial text:\n${material.extractedText ?? "No extracted text available."}`;
        }

        const { object } = await generateObject({
          model,
          schema: z.array(generatedPracticeQuestionSchema),
          prompt,
        });

        const generated = Array.isArray(object) ? object : [];
        for (const item of generated.slice(0, topicCount)) {
          createdQuestions.push({
            id: randomUUID(),
            practiceSessionId: session.id,
            topicId,
            questionText: item.questionText,
            options: item.options,
            correctOptionIndex: item.correctOptionIndex,
            explanation: item.explanation,
            difficulty: item.difficulty,
          });
        }
      }

      if (practiceTopicRows.length > 0) {
        await db.insert(practiceTopics).values(practiceTopicRows);
      }
      if (createdQuestions.length > 0) {
        await db.insert(practiceQuestions).values(createdQuestions);
      }

      return { sessionId: session.id };
    }),

  get: protectedProcedure
    .input(z.object({ sessionId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const session = await getSessionForOwner(input.sessionId, ctx.session.user.id);
      const topicRows = await db.select().from(practiceTopics).where(eq(practiceTopics.practiceSessionId, session.id));
      const questionRows = await db.select().from(practiceQuestions).where(eq(practiceQuestions.practiceSessionId, session.id));
      const answerRows = session.status === "completed"
        ? await db.select().from(practiceAnswers).where(eq(practiceAnswers.practiceSessionId, session.id))
        : [];

      const answerMap = new Map(answerRows.map((answer) => [answer.questionId, answer]));

      const questions = questionRows.map((question) => {
        const answer = answerMap.get(question.id);
        const base = {
          id: question.id,
          questionText: question.questionText,
          options: question.options,
          difficulty: question.difficulty,
          selectedOptionIndex: answer?.selectedOptionIndex ?? null,
        } as any;

        if (session.status === "completed") {
          return {
            ...base,
            correctOptionIndex: question.correctOptionIndex,
            explanation: question.explanation,
            isCorrect: answer ? answer.isCorrect : null,
          };
        }

        return base;
      });

      return {
        session,
        topics: topicRows,
        questions,
      };
    }),

  submit: protectedProcedure
    .input(z.object({ sessionId: z.string().min(1), answers: z.array(answerSchema).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const session = await getSessionForOwner(input.sessionId, ctx.session.user.id);
      if (session.status === "completed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This practice session is already completed." });
      }
      const questionsForSession = await db.select().from(practiceQuestions).where(eq(practiceQuestions.practiceSessionId, session.id));
      const questionMap = new Map(questionsForSession.map((question) => [question.id, question]));
      const answerRows = input.answers.map((answer) => {
        const question = questionMap.get(answer.questionId);
        if (!question) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "One or more answers do not belong to this session." });
        }
        const isCorrect = answer.selectedOptionIndex === question.correctOptionIndex;
        return {
          id: randomUUID(),
          practiceSessionId: session.id,
          questionId: question.id,
          selectedOptionIndex: answer.selectedOptionIndex,
          isCorrect,
        };
      });

      const correctCount = answerRows.filter((answer) => answer.isCorrect).length;
      const score = Math.round((correctCount / questionsForSession.length) * 100);

      await db.insert(practiceAnswers).values(answerRows);
      await db.update(practiceSessions)
        .set({
          status: "completed",
          score,
          completedAt: new Date(),
          totalQuestions: questionsForSession.length,
        })
        .where(eq(practiceSessions.id, session.id));

      return { score, totalQuestions: questionsForSession.length };
    }),

  listMine: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(practiceSessions)
      .where(eq(practiceSessions.studentId, ctx.session.user.id))
      .orderBy(desc(practiceSessions.createdAt));
  }),
});
