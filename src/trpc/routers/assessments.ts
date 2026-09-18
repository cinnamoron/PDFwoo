import { TRPCError } from "@trpc/server";
import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/index";
import {
  assessmentConcepts,
  assessments,
  concepts,
  questionConcepts,
  questions,
  studyMaterials,
} from "@/db/schema/schema";
import { createTRPCRouter, protectedProcedure } from "../init";

const assessmentDifficultySchema = z.enum(["easy", "medium", "hard", "mixed"]);

const conceptIdArraySchema = z.array(z.string().min(1));

async function getMaterialWithConcepts(materialId: string, userId: string) {
  const [material] = await db
    .select()
    .from(studyMaterials)
    .where(eq(studyMaterials.id, materialId));

  if (!material) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Material not found" });
  }

  if (material.teacherId !== userId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  const materialConcepts = await db
    .select()
    .from(concepts)
    .where(eq(concepts.materialId, material.id));

  return { material, materialConcepts };
}

async function getAssessmentForTeacher(assessmentId: string, userId: string) {
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

export const assessmentsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        materialId: z.string().min(1),
        title: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { material, materialConcepts } = await getMaterialWithConcepts(input.materialId, ctx.session.user.id);

      if (material.status !== "ready") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Study material must be ready before creating an assessment.",
        });
      }

      if (materialConcepts.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "At least one concept is required before creating an assessment.",
        });
      }

      const title = input.title?.trim() || material.fileName.replace(/\.pdf$/i, "") || "Untitled assessment";
      const assessmentId = randomUUID();

      const [created] = await db
        .insert(assessments)
        .values({
          id: assessmentId,
          teacherId: ctx.session.user.id,
          materialId: material.id,
          title,
          status: "draft",
          numQuestions: 10,
          difficulty: "mixed",
        })
        .returning();

      return created;
    }),

  get: protectedProcedure
    .input(z.object({ assessmentId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { assessment, material } = await getAssessmentForTeacher(input.assessmentId, ctx.session.user.id);

      const selectedConceptIds = await db
        .select({ conceptId: assessmentConcepts.conceptId })
        .from(assessmentConcepts)
        .where(eq(assessmentConcepts.assessmentId, assessment.id));

      const materialConcepts = await db
        .select()
        .from(concepts)
        .where(eq(concepts.materialId, material.id));

      const assessmentQuestions = await db
        .select()
        .from(questions)
        .where(eq(questions.assessmentId, assessment.id));

      return {
        assessment,
        selectedConceptIds: selectedConceptIds.map((item) => item.conceptId),
        materialConcepts,
        questions: assessmentQuestions,
      };
    }),

  updateConfig: protectedProcedure
    .input(
      z.object({
        assessmentId: z.string().min(1),
        numQuestions: z.number().int().min(1).max(200),
        difficulty: assessmentDifficultySchema,
        conceptIds: conceptIdArraySchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { assessment, material } = await getAssessmentForTeacher(input.assessmentId, ctx.session.user.id);

      const materialConcepts = await db
        .select()
        .from(concepts)
        .where(eq(concepts.materialId, material.id));

      const validConceptIds = new Set(materialConcepts.map((concept) => concept.id));
      const invalidConcepts = input.conceptIds.filter((id) => !validConceptIds.has(id));

      if (invalidConcepts.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "One or more selected concepts do not belong to this material.",
        });
      }

      const [updatedAssessment] = await db
        .update(assessments)
        .set({
          numQuestions: input.numQuestions,
          difficulty: input.difficulty,
        })
        .where(eq(assessments.id, assessment.id))
        .returning();

      await db.delete(assessmentConcepts).where(eq(assessmentConcepts.assessmentId, assessment.id));

      if (input.conceptIds.length > 0) {
        await db.insert(assessmentConcepts).values(
          input.conceptIds.map((conceptId) => ({
            assessmentId: assessment.id,
            conceptId,
          })),
        );
      }

      return updatedAssessment;
    }),

  listByMaterial: protectedProcedure
    .input(z.object({ materialId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { material } = await getMaterialWithConcepts(input.materialId, ctx.session.user.id);

      return db
        .select()
        .from(assessments)
        .where(eq(assessments.materialId, material.id))
        .orderBy(desc(assessments.createdAt));
    }),

  listMine: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(assessments)
      .where(eq(assessments.teacherId, ctx.session.user.id))
      .orderBy(desc(assessments.createdAt));
  }),
});
