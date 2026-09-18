import { relations } from "drizzle-orm";
import { integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const classes = pgTable("classes", {
  id: text("id").primaryKey(),
  teacherId: text("teacher_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const classInvites = pgTable(
  "class_invites",
  {
    id: text("id").primaryKey(),
    classId: text("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    token: text("token").notNull().unique(),
    status: text("status").$type<"pending" | "accepted">().default("pending").notNull(),
    invitedAt: timestamp("invited_at").defaultNow().notNull(),
    acceptedAt: timestamp("accepted_at"),
  },
);

export const classMembers = pgTable(
  "class_members",
  {
    id: text("id").primaryKey(),
    classId: text("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => ({
    classStudentIdx: uniqueIndex("class_members_class_student_idx").on(table.classId, table.studentId),
  }),
);

export const classesRelations = relations(classes, ({ one, many }) => ({
  teacher: one(user, {
    fields: [classes.teacherId],
    references: [user.id],
  }),
  invites: many(classInvites),
  members: many(classMembers),
}));

export const classInvitesRelations = relations(classInvites, ({ one }) => ({
  class: one(classes, {
    fields: [classInvites.classId],
    references: [classes.id],
  }),
}));

export const classMembersRelations = relations(classMembers, ({ one }) => ({
  class: one(classes, {
    fields: [classMembers.classId],
    references: [classes.id],
  }),
  student: one(user, {
    fields: [classMembers.studentId],
    references: [user.id],
  }),
}));
