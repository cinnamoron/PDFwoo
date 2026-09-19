import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { auth } from "@/lib/auth";

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

            const curated = error instanceof TRPCError && CURATED_ERROR_MESSAGES.has(error.message);
            return {
                ...shape,
                message: curated ? error.message : "Something went wrong. Please try again.",
            };
        },
    });

const CURATED_ERROR_MESSAGES = new Set([
    "User profile not found",
    "Material not found",
    "Assessment not found",
    "Class not found",
    "Concept not found",
    "Practice session not found",
    "You are not a member of this class.",
    "Add at least one concept or custom topic.",
    "A material is required when using concept topics.",
    "Concept does not belong to the selected material.",
    "Concept topics require a material.",
    "This practice session is already completed.",
    "One or more answers do not belong to this session.",
    "Question does not belong to this session.",
    "This question has already been answered.",
    "You already used your submission attempt.",
    "This assignment is past due.",
    "One or more answers do not belong to this assignment.",
    "Generate questions before assigning this assessment.",
    "Only PDF files are supported",
    "File size must be 25 MB or less",
    "Material file is not available",
    "Invalid file path",
    "Failed to remove the material file from storage.",
    "Question generation is temporarily unavailable because the AI provider quota was reached. Please try again later.",
]);

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;

const isAuthed = t.middleware(async ({ ctx, next }) => {
    if (!ctx.session) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const domainUser = ctx.session.user;

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