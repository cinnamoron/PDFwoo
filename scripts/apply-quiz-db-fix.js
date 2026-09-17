const { Client } = require("pg");
require("dotenv").config();

const sql = `
CREATE TABLE IF NOT EXISTS "assessments" (
  "id" text PRIMARY KEY NOT NULL,
  "teacher_id" text NOT NULL REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action,
  "material_id" text NOT NULL REFERENCES "public"."study_materials"("id") ON DELETE cascade ON UPDATE no action,
  "title" text NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "num_questions" integer DEFAULT 10 NOT NULL,
  "difficulty" text DEFAULT 'mixed' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "questions" (
  "id" text PRIMARY KEY NOT NULL,
  "assessment_id" text NOT NULL REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action,
  "question_text" text NOT NULL,
  "options" text[] NOT NULL,
  "correct_option_index" integer NOT NULL,
  "explanation" text NOT NULL,
  "difficulty" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "assessment_concepts" (
  "assessment_id" text NOT NULL REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action,
  "concept_id" text NOT NULL REFERENCES "public"."concepts"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "assessment_concepts_pkey" PRIMARY KEY("assessment_id", "concept_id")
);

CREATE TABLE IF NOT EXISTS "question_concepts" (
  "question_id" text NOT NULL REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action,
  "concept_id" text NOT NULL REFERENCES "public"."concepts"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "question_concepts_pkey" PRIMARY KEY("question_id", "concept_id")
);
`;

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query(sql);
  console.log("Quiz tables are ready.");
  await client.end();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});