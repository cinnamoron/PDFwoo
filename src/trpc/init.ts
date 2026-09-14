import { initTRPC, TRPCError } from "@trpc/server";
import { auth } from "@/lib/auth";
import { db } from "@/index";
import { eq } from "drizzle-orm";

export const createTRPCContext = async (opts: { headers: Headers }) => {
    const session = await auth.api.getSession({ headers: opts.headers });
    return { session };
};

const t = initTRPC
    .context<Awaited<ReturnType<typeof createTRPCContext>>>()
    .create({
        // transformer: superjson,
    });

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;

const isAuthed = t.middleware(async ({ ctx, next }) => {
    if (!ctx.session) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const [domainUser] = "User" //TODO: Fix this later

    if (!domainUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User profile not found" });
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