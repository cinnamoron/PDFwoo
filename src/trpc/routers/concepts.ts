import { TRPCError } from "@trpc/server";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { generateObject } from "ai";
import { db } from "@/index";
import { model } from "@/lib/ai";
import { concepts, studyMaterials } from "@/db/schema/schema";
import { createTRPCRouter, protectedProcedure } from "../init";

const conceptSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
});

const generatedConceptSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  subconcepts: z.array(conceptSchema).optional(),
});

const topLevelConceptsSchema = z.array(generatedConceptSchema);

const conceptUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isIncluded: z.boolean().optional(),
});

async function getMaterialForTeacher(materialId: string, userId: string) {
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

  return material;
}

async function getConceptWithMaterial(conceptId: string, userId: string) {
  const [concept] = await db
    .select()
    .from(concepts)
    .where(eq(concepts.id, conceptId));

  if (!concept) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Concept not found" });
  }

  const [material] = await db
    .select()
    .from(studyMaterials)
    .where(eq(studyMaterials.id, concept.materialId));

  if (!material) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Material not found" });
  }

  if (material.teacherId !== userId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  return { concept, material };
}

export const conceptsRouter = createTRPCRouter({
  generate: protectedProcedure
    .input(z.object({ materialId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const material = await getMaterialForTeacher(input.materialId, ctx.session.user.id);
      const hasExtractedText = !!material.extractedText?.trim();

      if (material.status !== "ready" || !hasExtractedText) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Study material must be ready and contain readable extracted text before generating concepts.",
        });
      }

      const existingConcepts = await db
        .select()
        .from(concepts)
        .where(eq(concepts.materialId, material.id));

      if (existingConcepts.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Concepts have already been generated for this material.",
        });
      }

      const { object } = await generateObject({
        model,
        schema: topLevelConceptsSchema,
        prompt: `Extract the most important concepts from this study material. Return only a JSON array of top-level concepts. Each concept must include a concise name, a short description, and optional one-level subconcepts with name and description. Avoid duplicates and do not invent unsupported facts. Keep the output grounded only in the provided material.\n\nStudy material:\n${material.extractedText}`,
      });

      const generated = object ?? [];
      const inserted: Array<{ id: string; materialId: string; parentConceptId: string | null; name: string; description: string | null; isIncluded: boolean }> = [];

      for (const topConcept of generated) {
        const parentId = randomUUID();
        inserted.push({
          id: parentId,
          materialId: material.id,
          parentConceptId: null,
          name: topConcept.name,
          description: topConcept.description ?? null,
          isIncluded: true,
        });

        for (const subConcept of topConcept.subconcepts ?? []) {
          inserted.push({
            id: randomUUID(),
            materialId: material.id,
            parentConceptId: parentId,
            name: subConcept.name,
            description: subConcept.description ?? null,
            isIncluded: true,
          });
        }
      }

      if (inserted.length === 0) {
        return [];
      }

      await db.insert(concepts).values(inserted);

      return db
        .select()
        .from(concepts)
        .where(eq(concepts.materialId, material.id));
    }),

  listByMaterial: protectedProcedure
    .input(z.object({ materialId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const material = await getMaterialForTeacher(input.materialId, ctx.session.user.id);

      return db
        .select()
        .from(concepts)
        .where(eq(concepts.materialId, material.id));
    }),

  update: protectedProcedure
    .input(conceptUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { concept } = await getConceptWithMaterial(input.id, ctx.session.user.id);

      const [updatedConcept] = await db
        .update(concepts)
        .set({
          name: input.name ?? concept.name,
          description: input.description ?? concept.description,
          isIncluded: input.isIncluded ?? concept.isIncluded,
        })
        .where(eq(concepts.id, concept.id))
        .returning();

      return updatedConcept;
    }),

  create: protectedProcedure
    .input(
      z.object({
        materialId: z.string().min(1),
        parentConceptId: z.string().min(1).optional(),
        name: z.string().min(1),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const material = await getMaterialForTeacher(input.materialId, ctx.session.user.id);

      if (input.parentConceptId) {
        const [parentConcept] = await db
          .select()
          .from(concepts)
          .where(and(eq(concepts.id, input.parentConceptId), eq(concepts.materialId, material.id)));

        if (!parentConcept) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Parent concept does not belong to this material.",
          });
        }
      }

      const newConcept = {
        id: randomUUID(),
        materialId: material.id,
        parentConceptId: input.parentConceptId ?? null,
        name: input.name,
        description: input.description ?? null,
        isIncluded: true,
      };

      await db.insert(concepts).values(newConcept);
      return newConcept;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { concept } = await getConceptWithMaterial(input.id, ctx.session.user.id);

      await db.delete(concepts).where(eq(concepts.id, concept.id));
      return concept;
    }),
});
