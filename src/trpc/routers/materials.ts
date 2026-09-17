import { TRPCError } from "@trpc/server";
import { randomUUID } from "node:crypto";
import { access, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { extractText, getDocumentProxy } from "unpdf";
import { db } from "@/index";
import { studyMaterials } from "@/db/schema/schema";
import { createTRPCRouter, protectedProcedure } from "../init";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

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

export const materialsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(studyMaterials)
      .where(eq(studyMaterials.teacherId, ctx.session.user.id))
      .orderBy(desc(studyMaterials.createdAt));
  }),

  requestUpload: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1),
        fileType: z.string(),
        fileSize: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.fileType !== "application/pdf") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only PDF files are supported",
        });
      }

      if (input.fileSize > MAX_FILE_SIZE) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "File size must be 25 MB or less",
        });
      }

      const teacherId = ctx.session.user.id;
      const materialId = randomUUID();
      const safeFileName = input.fileName.replace(/[\\/]/g, "_");
      const fileKey = `materials/${teacherId}/${materialId}/${safeFileName}`;

      await db.insert(studyMaterials).values({
        id: materialId,
        teacherId,
        fileName: input.fileName,
        fileKey,
        fileSize: input.fileSize,
        mimeType: input.fileType,
        status: "uploading",
      });

      return { materialId };
    }),

  uploadFile: protectedProcedure
    .input(
      z.object({
        materialId: z.string().min(1),
        fileData: z.string().min(1),
        mimeType: z.literal("application/pdf"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [material] = await db
        .select()
        .from(studyMaterials)
        .where(eq(studyMaterials.id, input.materialId));

      if (!material) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Material not found" });
      }

      if (material.teacherId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const file = Buffer.from(input.fileData, "base64");
      if (file.length > MAX_FILE_SIZE) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "File size must be 25 MB or less" });
      }

      const storageRoot = path.resolve(process.cwd(), "storage");
      const filePath = path.resolve(storageRoot, material.fileKey);
      if (!filePath.startsWith(`${storageRoot}${path.sep}`)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid file path" });
      }

      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, file);
      return { materialId: material.id };
    }),

  confirmUpload: protectedProcedure
    .input(z.object({ materialId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [material] = await db
        .select()
        .from(studyMaterials)
        .where(eq(studyMaterials.id, input.materialId));

      if (!material) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Material not found" });
      }

      if (material.teacherId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      try {
        await access(path.resolve(process.cwd(), "storage", material.fileKey));
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Material file is not available" });
      }

      const [updatedMaterial] = await db
        .update(studyMaterials)
        .set({ status: "processing" })
        .where(eq(studyMaterials.id, input.materialId))
        .returning();

      return updatedMaterial;
    }),

  delete: protectedProcedure
    .input(z.object({ materialId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const material = await getMaterialForTeacher(input.materialId, ctx.session.user.id);
      const storagePath = path.resolve(process.cwd(), "storage", material.fileKey);

      try {
        await unlink(storagePath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to remove the material file from storage.",
          });
        }
      }

      await db.delete(studyMaterials).where(eq(studyMaterials.id, material.id));

      return { success: true, materialId: material.id };
    }),

  extractText: protectedProcedure
    .input(z.object({ materialId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [material] = await db
        .select()
        .from(studyMaterials)
        .where(eq(studyMaterials.id, input.materialId));

      if (!material) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Material not found" });
      }

      if (material.teacherId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const filePath = path.resolve(process.cwd(), "storage", material.fileKey);

      try {
        const pdfBuffer = await readFile(filePath);
        const pdf = await getDocumentProxy(new Uint8Array(pdfBuffer));
        const { text } = await extractText(pdf, { mergePages: true });
        const cleanedText = text?.trim();

        if (!cleanedText) {
          const [updatedMaterial] = await db
            .update(studyMaterials)
            .set({
              status: "failed",
              extractedText: null,
              extractionError: "No readable text could be extracted from this PDF. Please upload a text-based PDF.",
            })
            .where(eq(studyMaterials.id, material.id))
            .returning();

          return updatedMaterial;
        }

        const [updatedMaterial] = await db
          .update(studyMaterials)
          .set({
            status: "ready",
            extractedText: cleanedText,
            extractionError: null,
          })
          .where(eq(studyMaterials.id, material.id))
          .returning();

        return updatedMaterial;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown PDF extraction error";

        const [updatedMaterial] = await db
          .update(studyMaterials)
          .set({
            status: "failed",
            extractedText: null,
            extractionError: message,
          })
          .where(eq(studyMaterials.id, material.id))
          .returning();

        return updatedMaterial;
      }
    }),
});