const { Client } = require("pg");
require("dotenv").config();

const sql = `
ALTER TABLE "study_materials"
  ADD COLUMN IF NOT EXISTS "extracted_text" text,
  ADD COLUMN IF NOT EXISTS "extraction_error" text;

CREATE TABLE IF NOT EXISTS "concepts" (
  "id" text PRIMARY KEY NOT NULL,
  "material_id" text NOT NULL,
  "parent_concept_id" text,
  "name" text NOT NULL,
  "description" text,
  "is_included" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "concepts_material_id_study_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."study_materials"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "concepts_parent_concept_id_concepts_id_fk" FOREIGN KEY ("parent_concept_id") REFERENCES "public"."concepts"("id") ON DELETE cascade ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS "concepts_material_id_idx" ON "concepts" ("material_id");
CREATE INDEX IF NOT EXISTS "concepts_parent_concept_id_idx" ON "concepts" ("parent_concept_id");
`;

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query(sql);

  const materialColumns = await client.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'study_materials' ORDER BY ordinal_position"
  );
  const conceptTable = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'concepts'"
  );

  console.log(JSON.stringify({ materialColumns: materialColumns.rows, conceptTable: conceptTable.rows }, null, 2));
  await client.end();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
