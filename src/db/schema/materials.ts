import { relations } from "drizzle-orm";
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const studyMaterials = pgTable("study_materials", {
  id: text("id").primaryKey(),
  teacherId: text("teacher_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  fileKey: text("file_key").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  status: text("status")
    .$type<"uploading" | "ready" | "failed">()
    .default("uploading")
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const studyMaterialsRelations = relations(studyMaterials, ({ one }) => ({
  user: one(user, {
    fields: [studyMaterials.teacherId],
    references: [user.id],
  }),
}));