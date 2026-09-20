import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { auth } from "@/lib/auth";
import { CURATED_ERROR_MESSAGES } from "@/lib/curated-error-messages";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth.api.getSession({ headers: opts.headers });
  return { session };
};

const t = initTRPC
  .context<Awaited<ReturnType<typeof createTRPCContext>>>()
  .create({
    transformer: superjson,
    errorFormatter({ shape, error }) {
      console.error("[trpc] request failed", error);

      const curated =
        error instanceof TRPCError && CURATED_ERROR_MESSAGES.has(error.message);
      return {
        ...shape,
        message: curated
          ? error.message
          : "Something went wrong. Please try again.",
      };
    },
  });

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;

const isAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const domainUser = ctx.session.user;

  if (!domainUser) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User profile not found",
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      domainUser,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);
