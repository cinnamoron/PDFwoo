import { relations } from "drizzle-orm";
import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { assessments } from "./assessments";
import { user } from "./auth";
import { classes } from "./classes";
import { questions } from "./questions";

export const assessmentAssignments = pgTable("assessment_assignments", {
  id: text("id").primaryKey(),
  assessmentId: text("assessment_id")
    .notNull()
    .references(() => assessments.id, { onDelete: "cascade" }),
  classId: text("class_id")
    .notNull()
    .references(() => classes.id, { onDelete: "cascade" }),
  dueAt: timestamp("due_at").notNull(),
  maxAttempts: integer("max_attempts").default(1).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

export const assignmentAttempts = pgTable("assignment_attempts", {
  id: text("id").primaryKey(),
  assignmentId: text("assignment_id")
    .notNull()
    .references(() => assessmentAssignments.id, { onDelete: "cascade" }),
  studentId: text("student_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  status: text("status").$type<"in_progress" | "completed">().default("completed").notNull(),
  score: integer("score").default(0),
  totalQuestions: integer("total_questions").default(0).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const assignmentAnswers = pgTable("assignment_answers", {
  id: text("id").primaryKey(),
  attemptId: text("attempt_id")
    .notNull()
    .references(() => assignmentAttempts.id, { onDelete: "cascade" }),
  questionId: text("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  selectedOptionIndex: integer("selected_option_index").notNull(),
  isCorrect: boolean("is_correct").notNull(),
});

export const assessmentAssignmentsRelations = relations(assessmentAssignments, ({ one, many }) => ({
  assessment: one(assessments, {
    fields: [assessmentAssignments.assessmentId],
    references: [assessments.id],
  }),
  class: one(classes, {
    fields: [assessmentAssignments.classId],
    references: [classes.id],
  }),
  attempts: many(assignmentAttempts),
}));

export const assignmentAttemptsRelations = relations(assignmentAttempts, ({ one, many }) => ({
  assignment: one(assessmentAssignments, {
    fields: [assignmentAttempts.assignmentId],
    references: [assessmentAssignments.id],
  }),
  student: one(user, {
    fields: [assignmentAttempts.studentId],
    references: [user.id],
  }),
  answers: many(assignmentAnswers),
}));

export const assignmentAnswersRelations = relations(assignmentAnswers, ({ one }) => ({
  attempt: one(assignmentAttempts, {
    fields: [assignmentAnswers.attemptId],
    references: [assignmentAttempts.id],
  }),
  question: one(questions, {
    fields: [assignmentAnswers.questionId],
    references: [questions.id],
  }),
}));
