import { TRPCError } from "@trpc/server";
import { randomUUID } from "node:crypto";
import { and, count, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/index";
import { classInvites, classMembers, classes, user } from "@/db/schema/schema";
import { createTRPCRouter, protectedProcedure, baseProcedure } from "../init";

async function getClassForTeacher(classId: string, teacherId: string) {
  const [classRow] = await db.select().from(classes).where(eq(classes.id, classId));

  if (!classRow) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
  }

  if (classRow.teacherId !== teacherId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  return classRow;
}

export const classesRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).trim() }))
    .mutation(async ({ ctx, input }) => {
      const [created] = await db
        .insert(classes)
        .values({
          id: randomUUID(),
          teacherId: ctx.session.user.id,
          name: input.name,
        })
        .returning();

      return created;
    }),

  myClasses: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select({
        class: classes,
        memberCount: sql<number>`count(distinct ${classMembers.id})`.as("memberCount"),
        pendingInviteCount: sql<number>`count(distinct ${classInvites.id}) FILTER (WHERE ${classInvites.status} = 'pending')`.as("pendingInviteCount"),
      })
      .from(classes)
      .leftJoin(classMembers, eq(classMembers.classId, classes.id))
      .leftJoin(classInvites, eq(classInvites.classId, classes.id))
      .where(eq(classes.teacherId, ctx.session.user.id))
      .groupBy(classes.id);

    return rows.map((row) => ({
      ...row.class,
      memberCount: Number(row.memberCount ?? 0),
      pendingInviteCount: Number(row.pendingInviteCount ?? 0),
    }));
  }),

  get: protectedProcedure
    .input(z.object({ classId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const classRow = await getClassForTeacher(input.classId, ctx.session.user.id);

      const invites = await db
        .select()
        .from(classInvites)
        .where(eq(classInvites.classId, classRow.id))
        .orderBy(classInvites.invitedAt);

      const members = await db
        .select({
          id: classMembers.id,
          classId: classMembers.classId,
          studentId: classMembers.studentId,
          joinedAt: classMembers.joinedAt,
          name: user.name,
          email: user.email,
        })
        .from(classMembers)
        .innerJoin(user, eq(user.id, classMembers.studentId))
        .where(eq(classMembers.classId, classRow.id));

      return { class: classRow, invites, members };
    }),

  invite: protectedProcedure
    .input(z.object({ classId: z.string().min(1), email: z.string().trim().email() }))
    .mutation(async ({ ctx, input }) => {
      await getClassForTeacher(input.classId, ctx.session.user.id);
      const email = input.email.toLowerCase();

      const [existing] = await db
        .select()
        .from(classInvites)
        .where(and(eq(classInvites.classId, input.classId), eq(classInvites.email, email), eq(classInvites.status, "pending")));

      if (existing) {
        const [updated] = await db
          .update(classInvites)
          .set({ token: randomUUID() })
          .where(eq(classInvites.id, existing.id))
          .returning();
        return updated;
      }

      const [created] = await db
        .insert(classInvites)
        .values({
          id: randomUUID(),
          classId: input.classId,
          email,
          token: randomUUID(),
          status: "pending",
        })
        .returning();

      return created;
    }),

  getInvite: baseProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input }) => {
      const [invite] = await db
        .select({
          email: classInvites.email,
          status: classInvites.status,
          className: classes.name,
        })
        .from(classInvites)
        .innerJoin(classes, eq(classes.id, classInvites.classId))
        .where(eq(classInvites.token, input.token));

      if (!invite) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });
      }

      return invite;
    }),

  acceptInvite: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [invite] = await db
        .select()
        .from(classInvites)
        .where(eq(classInvites.token, input.token));

      if (!invite) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });
      }

      if (ctx.session.user.email.toLowerCase() !== invite.email.toLowerCase()) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This invite belongs to a different account." });
      }

      const [existingMember] = await db
        .select()
        .from(classMembers)
        .where(and(eq(classMembers.classId, invite.classId), eq(classMembers.studentId, ctx.session.user.id)));

      if (!existingMember) {
        await db.insert(classMembers).values({
          id: randomUUID(),
          classId: invite.classId,
          studentId: ctx.session.user.id,
        });
      }

      const [updated] = await db
        .update(classInvites)
        .set({ status: "accepted", acceptedAt: new Date() })
        .where(eq(classInvites.id, invite.id))
        .returning();

      return updated;
    }),

  myClassesAsStudent: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select({
        class: classes,
        membership: classMembers,
      })
      .from(classMembers)
      .innerJoin(classes, eq(classes.id, classMembers.classId))
      .where(eq(classMembers.studentId, ctx.session.user.id));
  }),
});
