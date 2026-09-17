import { relations } from "drizzle-orm";
import { AnyPgColumn, boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { studyMaterials } from "./materials";

export const concepts = pgTable("concepts", {
  id: text("id").primaryKey(),
  materialId: text("material_id")
    .notNull()
    .references(() => studyMaterials.id, { onDelete: "cascade" }),
  parentConceptId: text("parent_concept_id").references(
    (): AnyPgColumn => concepts.id,
    { onDelete: "cascade" },
  ),
  name: text("name").notNull(),
  description: text("description"),
  isIncluded: boolean("is_included").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const conceptsRelations = relations(concepts, ({ one, many }) => ({
  parentConcept: one(concepts, {
    fields: [concepts.parentConceptId],
    references: [concepts.id],
  }),
  childConcepts: many(concepts),
  studyMaterial: one(studyMaterials, {
    fields: [concepts.materialId],
    references: [studyMaterials.id],
  }),
}));
