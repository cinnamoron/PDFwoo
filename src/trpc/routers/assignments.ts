import { TRPCError } from "@trpc/server";
import { randomUUID } from "node:crypto";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/index";
import { assessmentAssignments, assignmentAnswers, assignmentAttempts, assessments, classMembers, classes, questions } from "@/db/schema/schema";
import { createTRPCRouter, protectedProcedure } from "../init";

const answerSchema = z.object({
  questionId: z.string().min(1),
  selectedOptionIndex: z.number().int().min(0).max(3),
});

async function getAssignmentForTeacher(assignmentId: string, teacherId: string) {
  const [assignment] = await db.select().from(assessmentAssignments).where(eq(assessmentAssignments.id, assignmentId));
  if (!assignment) throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found" });

  const [assessment] = await db.select().from(assessments).where(eq(assessments.id, assignment.assessmentId));
  if (!assessment) throw new TRPCError({ code: "NOT_FOUND", message: "Assessment not found" });

  if (assessment.teacherId !== teacherId) throw new TRPCError({ code: "FORBIDDEN" });

  return { assignment, assessment };
}

async function getAssignmentForStudent(assignmentId: string, studentId: string) {
  const [assignment] = await db.select().from(assessmentAssignments).where(eq(assessmentAssignments.id, assignmentId));
  if (!assignment) throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found" });

  const [member] = await db.select().from(classMembers).where(and(eq(classMembers.classId, assignment.classId), eq(classMembers.studentId, studentId)));
  if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member of this class." });

  return assignment;
}

export const assignmentsRouter = createTRPCRouter({
  assign: protectedProcedure
    .input(z.object({ assessmentId: z.string().min(1), classId: z.string().min(1), dueAt: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [assessment] = await db.select().from(assessments).where(eq(assessments.id, input.assessmentId));
      if (!assessment) throw new TRPCError({ code: "NOT_FOUND", message: "Assessment not found" });
      if (assessment.teacherId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const [klass] = await db.select().from(classes).where(eq(classes.id, input.classId));
      if (!klass) throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      if (klass.teacherId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const questionCount = await db.select({ count: count() }).from(questions).where(eq(questions.assessmentId, assessment.id));
      if (questionCount[0]?.count === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Generate questions before assigning this assessment." });
      }

      const [assignment] = await db
        .insert(assessmentAssignments)
        .values({
          id: randomUUID(),
          assessmentId: assessment.id,
          classId: klass.id,
          dueAt: new Date(input.dueAt),
          maxAttempts: 1,
        })
        .returning();

      await db.update(assessments).set({ status: "published" }).where(eq(assessments.id, assessment.id));

      return assignment;
    }),

  forClass: protectedProcedure
    .input(z.object({ classId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [klass] = await db.select().from(classes).where(eq(classes.id, input.classId));
      if (!klass) throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      if (klass.teacherId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const rows = await db
        .select({
          assignment: assessmentAssignments,
          assessmentTitle: assessments.title,
          completedCount: sql<number>`count(distinct ${assignmentAttempts.id})`.as("completedCount"),
        })
        .from(assessmentAssignments)
        .leftJoin(assessments, eq(assessments.id, assessmentAssignments.assessmentId))
        .leftJoin(assignmentAttempts, eq(assignmentAttempts.assignmentId, assessmentAssignments.id))
        .where(eq(assessmentAssignments.classId, input.classId))
        .groupBy(assessmentAssignments.id, assessments.id)
        .orderBy(desc(assessmentAssignments.assignedAt));

      return rows.map((row) => ({
        ...row.assignment,
        assessmentTitle: row.assessmentTitle,
        completedCount: Number(row.completedCount ?? 0),
      }));
    }),

  myAssignments: protectedProcedure.query(async ({ ctx }) => {
    const joinedClasses = await db.select({ classId: classMembers.classId }).from(classMembers).where(eq(classMembers.studentId, ctx.session.user.id));
    const classIds = joinedClasses.map((item) => item.classId);

    if (classIds.length === 0) {
      return [] as any[];
    }

    const rows = await db
      .select({
        assignment: assessmentAssignments,
        assessmentTitle: assessments.title,
        className: classes.name,
        score: assignmentAttempts.score,
        completed: assignmentAttempts.status,
        dueAt: assessmentAssignments.dueAt,
      })
      .from(assessmentAssignments)
      .innerJoin(assessments, eq(assessments.id, assessmentAssignments.assessmentId))
      .innerJoin(classes, eq(classes.id, assessmentAssignments.classId))
      .leftJoin(assignmentAttempts, and(eq(assignmentAttempts.assignmentId, assessmentAssignments.id), eq(assignmentAttempts.studentId, ctx.session.user.id)))
      .where(sql`${assessmentAssignments.classId} IN (${sql.join(classIds.map((id) => sql`${id}`), sql`, `)})`)
      .orderBy(desc(assessmentAssignments.dueAt));

    return rows.map((row) => ({
      ...row.assignment,
      assessmentTitle: row.assessmentTitle,
      className: row.className,
      dueAt: row.dueAt,
      completed: row.completed ?? null,
      score: row.score ?? null,
      expired: row.dueAt < new Date() && row.completed == null,
    }));
  }),

  getForAttempt: protectedProcedure
    .input(z.object({ assignmentId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const assignment = await getAssignmentForStudent(input.assignmentId, ctx.session.user.id);
      const attempt = await db
        .select()
        .from(assignmentAttempts)
        .where(and(eq(assignmentAttempts.assignmentId, assignment.id), eq(assignmentAttempts.studentId, ctx.session.user.id)))
        .limit(1);

      if (attempt[0] && attempt[0].status === "completed") {
        const answers = await db
          .select({
            id: assignmentAnswers.id,
            selectedOptionIndex: assignmentAnswers.selectedOptionIndex,
            questionId: assignmentAnswers.questionId,
            isCorrect: assignmentAnswers.isCorrect,
            questionText: questions.questionText,
            options: questions.options,
            correctOptionIndex: questions.correctOptionIndex,
            explanation: questions.explanation,
          })
          .from(assignmentAnswers)
          .innerJoin(questions, eq(questions.id, assignmentAnswers.questionId))
          .where(eq(assignmentAnswers.attemptId, attempt[0].id));

        return {
          status: "completed",
          score: attempt[0].score,
          answers: answers.map((answer) => ({
            questionId: answer.questionId,
            questionText: answer.questionText,
            options: answer.options,
            selectedOptionIndex: answer.selectedOptionIndex,
            isCorrect: answer.isCorrect,
            correctOptionIndex: answer.correctOptionIndex,
            explanation: answer.explanation,
          })),
        };
      }

      if (assignment.dueAt < new Date() && !attempt[0]) {
        return { status: "expired" };
      }

      const rows = await db
        .select({
          questionText: questions.questionText,
          options: questions.options,
          id: questions.id,
          difficulty: questions.difficulty,
        })
        .from(questions)
        .where(eq(questions.assessmentId, (await db.select({ assessmentId: assessments.id }).from(assessments).where(eq(assessments.id, assignment.assessmentId)))[0]?.assessmentId ?? assignment.assessmentId));

      return {
        status: "available",
        questions: rows.map((question) => ({
          id: question.id,
          questionText: question.questionText,
          options: question.options,
          difficulty: question.difficulty,
        })),
      };
    }),

  submit: protectedProcedure
    .input(z.object({ assignmentId: z.string().min(1), answers: z.array(answerSchema).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const assignment = await getAssignmentForStudent(input.assignmentId, ctx.session.user.id);
      const existingAttempt = await db.select().from(assignmentAttempts).where(and(eq(assignmentAttempts.assignmentId, assignment.id), eq(assignmentAttempts.studentId, ctx.session.user.id)));

      if (existingAttempt.length >= assignment.maxAttempts) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You already used your submission attempt." });
      }

      if (assignment.dueAt < new Date() && existingAttempt.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This assignment is past due." });
      }

      const assessmentQuestions = await db.select().from(questions).where(eq(questions.assessmentId, (await db.select({ id: assessments.id }).from(assessments).where(eq(assessments.id, assignment.assessmentId)))[0]?.id ?? assignment.assessmentId));
      const questionMap = new Map(assessmentQuestions.map((question) => [question.id, question]));

      const validAnswers = input.answers.filter((answer) => questionMap.has(answer.questionId));
      if (validAnswers.length !== input.answers.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "One or more answers do not belong to this assignment." });
      }

      let correctCount = 0;
      const answerRows = validAnswers.map((answer) => {
        const question = questionMap.get(answer.questionId)!;
        const isCorrect = answer.selectedOptionIndex === question.correctOptionIndex;
        if (isCorrect) correctCount += 1;
        return {
          id: randomUUID(),
          attemptId: "__TEMP__",
          questionId: question.id,
          selectedOptionIndex: answer.selectedOptionIndex,
          isCorrect,
        };
      });

      const [attempt] = await db
        .insert(assignmentAttempts)
        .values({
          id: randomUUID(),
          assignmentId: assignment.id,
          studentId: ctx.session.user.id,
          status: "completed",
          score: Math.round((correctCount / assessmentQuestions.length) * 100),
          totalQuestions: assessmentQuestions.length,
          completedAt: new Date(),
        })
        .returning();

      for (const answer of answerRows) {
        await db.insert(assignmentAnswers).values({
          ...answer,
          attemptId: attempt.id,
        });
      }

      return {
        score: attempt.score ?? 0,
        totalQuestions: assessmentQuestions.length,
      };
    }),
});
