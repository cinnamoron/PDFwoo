import { relations } from "drizzle-orm";
import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { concepts } from "./concepts";
import { studyMaterials } from "./materials";

export const practiceSessions = pgTable("practice_sessions", {
  id: text("id").primaryKey(),
  studentId: text("student_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  materialId: text("material_id").references(() => studyMaterials.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  status: text("status").$type<"in_progress" | "completed">().default("in_progress").notNull(),
  score: integer("score").default(0),
  totalQuestions: integer("total_questions").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const practiceTopics = pgTable("practice_topics", {
  id: text("id").primaryKey(),
  practiceSessionId: text("practice_session_id")
    .notNull()
    .references(() => practiceSessions.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  source: text("source").$type<"concept" | "custom">().notNull(),
  conceptId: text("concept_id").references(() => concepts.id, { onDelete: "set null" }),
});

export const practiceQuestions = pgTable("practice_questions", {
  id: text("id").primaryKey(),
  practiceSessionId: text("practice_session_id")
    .notNull()
    .references(() => practiceSessions.id, { onDelete: "cascade" }),
  topicId: text("topic_id")
    .notNull()
    .references(() => practiceTopics.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  options: text("options").array().notNull(),
  correctOptionIndex: integer("correct_option_index").notNull(),
  explanation: text("explanation").notNull(),
  difficulty: text("difficulty").$type<"easy" | "medium" | "hard">().notNull(),
});

export const practiceAnswers = pgTable("practice_answers", {
  id: text("id").primaryKey(),
  practiceSessionId: text("practice_session_id")
    .notNull()
    .references(() => practiceSessions.id, { onDelete: "cascade" }),
  questionId: text("question_id")
    .notNull()
    .references(() => practiceQuestions.id, { onDelete: "cascade" }),
  selectedOptionIndex: integer("selected_option_index").notNull(),
  isCorrect: boolean("is_correct").notNull(),
});

export const practiceSessionsRelations = relations(practiceSessions, ({ one, many }) => ({
  student: one(user, {
    fields: [practiceSessions.studentId],
    references: [user.id],
  }),
  material: one(studyMaterials, {
    fields: [practiceSessions.materialId],
    references: [studyMaterials.id],
  }),
  topics: many(practiceTopics),
  questions: many(practiceQuestions),
  answers: many(practiceAnswers),
}));

export const practiceTopicsRelations = relations(practiceTopics, ({ one, many }) => ({
  session: one(practiceSessions, {
    fields: [practiceTopics.practiceSessionId],
    references: [practiceSessions.id],
  }),
  concept: one(concepts, {
    fields: [practiceTopics.conceptId],
    references: [concepts.id],
  }),
  questions: many(practiceQuestions),
}));

export const practiceQuestionsRelations = relations(practiceQuestions, ({ one, many }) => ({
  topic: one(practiceTopics, {
    fields: [practiceQuestions.topicId],
    references: [practiceTopics.id],
  }),
  session: one(practiceSessions, {
    fields: [practiceQuestions.practiceSessionId],
    references: [practiceSessions.id],
  }),
  answers: many(practiceAnswers),
}));

export const practiceAnswersRelations = relations(practiceAnswers, ({ one }) => ({
  session: one(practiceSessions, {
    fields: [practiceAnswers.practiceSessionId],
    references: [practiceSessions.id],
  }),
  question: one(practiceQuestions, {
    fields: [practiceAnswers.questionId],
    references: [practiceQuestions.id],
  }),
}));
