import { relations } from "drizzle-orm";
import { integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { concepts } from "./concepts";
import { studyMaterials } from "./materials";

export const assessments = pgTable("assessments", {
  id: text("id").primaryKey(),
  teacherId: text("teacher_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  materialId: text("material_id")
    .notNull()
    .references(() => studyMaterials.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: text("status")
    .$type<"draft" | "published">()
    .default("draft")
    .notNull(),
  numQuestions: integer("num_questions").default(10).notNull(),
  difficulty: text("difficulty")
    .$type<"easy" | "medium" | "hard" | "mixed">()
    .default("mixed")
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const assessmentConcepts = pgTable(
  "assessment_concepts",
  {
    assessmentId: text("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    conceptId: text("concept_id")
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.assessmentId, table.conceptId], name: "assessment_concepts_pkey" }),
  }),
);

export const assessmentsRelations = relations(assessments, ({ one, many }) => ({
  user: one(user, {
    fields: [assessments.teacherId],
    references: [user.id],
  }),
  studyMaterial: one(studyMaterials, {
    fields: [assessments.materialId],
    references: [studyMaterials.id],
  }),
  selectedConcepts: many(assessmentConcepts),
}));

export const assessmentConceptsRelations = relations(assessmentConcepts, ({ one }) => ({
  assessment: one(assessments, {
    fields: [assessmentConcepts.assessmentId],
    references: [assessments.id],
  }),
  concept: one(concepts, {
    fields: [assessmentConcepts.conceptId],
    references: [concepts.id],
  }),
}));
