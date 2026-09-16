import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "../init";
import { materialsRouter } from "./materials";

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
});
// export type definition of API
export type AppRouter = typeof appRouter;
