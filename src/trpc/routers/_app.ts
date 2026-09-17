import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "../init";
import { assessmentsRouter } from "./assessments";
import { conceptsRouter } from "./concepts";
import { materialsRouter } from "./materials";
import { questionsRouter } from "./questions";

export const appRouter = createTRPCRouter({
  hello: baseProcedure
    .input(
      z.object({
        text: z.string(),
      }),
    )
    .query(opts => {
      return {
        greeting: `hello ${opts.input.text}`,
      };
    }), // still kept for testing
  materials: materialsRouter,
  concepts: conceptsRouter,
  assessments: assessmentsRouter,
  questions: questionsRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;
