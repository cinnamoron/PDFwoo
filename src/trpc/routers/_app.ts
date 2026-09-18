import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "../init";
import { assessmentsRouter } from "./assessments";
import { assignmentsRouter } from "./assignments";
import { classesRouter } from "./classes";
import { conceptsRouter } from "./concepts";
import { materialsRouter } from "./materials";
import { practiceRouter } from "./practice";
import { progressRouter } from "./progress";
import { questionsRouter } from "./questions";

export const appRouter = createTRPCRouter({
  hello: baseProcedure
    .input(
      z.object({
        text: z.string(),
      }),
    )
    .query((opts) => {
      return {
        greeting: `hello ${opts.input.text}`,
      };
    }),
  materials: materialsRouter,
  concepts: conceptsRouter,
  assessments: assessmentsRouter,
  questions: questionsRouter,
  classes: classesRouter,
  assignments: assignmentsRouter,
  practice: practiceRouter,
  progress: progressRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;
