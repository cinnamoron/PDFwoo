import { relations } from "drizzle-orm";
import { integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { assessments } from "./assessments";
import { concepts } from "./concepts";

export const questions = pgTable("questions", {
  id: text("id").primaryKey(),
  assessmentId: text("assessment_id")
    .notNull()
    .references(() => assessments.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  options: text("options").array().notNull(),
  correctOptionIndex: integer("correct_option_index").notNull(),
  explanation: text("explanation").notNull(),
  difficulty: text("difficulty")
    .$type<"easy" | "medium" | "hard">()
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const questionConcepts = pgTable(
  "question_concepts",
  {
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    conceptId: text("concept_id")
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.questionId, table.conceptId], name: "question_concepts_pkey" }),
  }),
);

export const questionsRelations = relations(questions, ({ one, many }) => ({
  assessment: one(assessments, {
    fields: [questions.assessmentId],
    references: [assessments.id],
  }),
  linkedConcepts: many(questionConcepts),
}));

export const questionConceptsRelations = relations(questionConcepts, ({ one }) => ({
  question: one(questions, {
    fields: [questionConcepts.questionId],
    references: [questions.id],
  }),
  concept: one(concepts, {
    fields: [questionConcepts.conceptId],
    references: [concepts.id],
  }),
}));
