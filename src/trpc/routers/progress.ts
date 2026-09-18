import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/index";
import { assignmentAnswers, assignmentAttempts, concepts, practiceAnswers, practiceQuestions, practiceSessions, practiceTopics, questionConcepts, questions } from "@/db/schema/schema";
import { createTRPCRouter, protectedProcedure } from "../init";

export const progressRouter = createTRPCRouter({
  myConceptStats: protectedProcedure.query(async ({ ctx }) => {
    const map = new Map<string, { key: string; label: string; total: number; correct: number; attempts: number }>();

    const assignmentRows = await db
      .select({
        isCorrect: assignmentAnswers.isCorrect,
        conceptName: concepts.name,
        conceptId: concepts.id,
      })
      .from(assignmentAnswers)
      .innerJoin(assignmentAttempts, eq(assignmentAttempts.id, assignmentAnswers.attemptId))
      .innerJoin(questions, eq(questions.id, assignmentAnswers.questionId))
      .innerJoin(questionConcepts, eq(questionConcepts.questionId, questions.id))
      .innerJoin(concepts, eq(concepts.id, questionConcepts.conceptId))
      .where(eq(assignmentAttempts.studentId, ctx.session.user.id));

    for (const row of assignmentRows) {
      const key = `concept:${row.conceptId}`;
      const bucket = map.get(key) ?? { key, label: row.conceptName, total: 0, correct: 0, attempts: 0 };
      bucket.total += 1;
      bucket.attempts += 1;
      if (row.isCorrect) bucket.correct += 1;
      map.set(key, bucket);
    }

    const practiceRows = await db
      .select({
        isCorrect: practiceAnswers.isCorrect,
        conceptName: concepts.name,
        conceptId: concepts.id,
        customLabel: practiceTopics.label,
        source: practiceTopics.source,
      })
      .from(practiceAnswers)
      .innerJoin(practiceQuestions, eq(practiceQuestions.id, practiceAnswers.questionId))
      .innerJoin(practiceTopics, eq(practiceTopics.id, practiceQuestions.topicId))
      .leftJoin(concepts, eq(concepts.id, practiceTopics.conceptId))
      .innerJoin(practiceSessions, eq(practiceSessions.id, practiceAnswers.practiceSessionId))
      .where(eq(practiceSessions.studentId, ctx.session.user.id));

    for (const row of practiceRows) {
      const key = row.source === "concept" && row.conceptId ? `concept:${row.conceptId}` : `topic:${(row.customLabel ?? "unknown").toLowerCase()}`;
      const bucket = map.get(key) ?? { key, label: row.source === "concept" ? (row.conceptName ?? "Unknown concept") : (row.customLabel ?? "Custom topic"), total: 0, correct: 0, attempts: 0 };
      bucket.total += 1;
      bucket.attempts += 1;
      if (row.isCorrect) bucket.correct += 1;
      map.set(key, bucket);
    }

    const items = Array.from(map.values()).map((item) => {
      const accuracy = item.total === 0 ? 0 : Math.round((item.correct / item.total) * 100);
      let level: "struggling" | "average" | "good" | "excellent" = "excellent";
      if (accuracy < 40) level = "struggling";
      else if (accuracy < 60) level = "average";
      else if (accuracy < 85) level = "good";

      return {
        key: item.key,
        label: item.label,
        accuracy,
        level,
        attempts: item.attempts,
      };
    });

    return items.sort((a, b) => a.accuracy - b.accuracy);
  }),
});
