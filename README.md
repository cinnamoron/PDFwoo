# Concept IQ

Concept IQ helps teachers turn a PDF source into a ready-made question bank and classroom assignment flow. A teacher uploads a PDF, the app extracts concepts, generates assessment questions, assigns them to a class with a due date, and then tracks each student's mastery at the concept level across both assigned tests and self-directed practice. Students can choose topics they want to review, practice them, and answer assigned assessments without losing their learning signal.

## Setup

1. Clone the repo.
2. Install dependencies with Bun:
   ```bash
   bun install
   ```
3. Create a `.env` file in the project root and add the environment variables below.
4. Run database migrations:
   ```bash
   bun run db:migrate
   ```
   Migrations also auto-run on server start via `src/instrumentation.ts`, but the manual command above is the explicit migration step.
5. Start the app:
   ```bash
   bun run dev
   ```

## Required and optional environment variables

Create the following env values in `.env` before starting the app:

- `DATABASE_URL` — required. PostgreSQL connection string used by Drizzle and the app database layer.
- `BETTER_AUTH_URL` — required for auth server configuration; used as the Better Auth base URL. The app also falls back to `http://localhost:3000` for trusted origins in local development when this is unset.
- `NEXT_PUBLIC_APP_URL` — optional. Used when generating join links for class invites. Falls back to `http://localhost:3000`.
- `VERCEL_URL` — optional. Used in the browser TRPC client when running behind Vercel to build the backend URL; otherwise the client falls back to `http://localhost:3000`.
- `NEXT_RUNTIME` — runtime-provided by Next.js, not set in app code. The startup instrumentation checks it to avoid running migrations in non-Node runtimes.

## Stack

Next.js App Router, tRPC, Drizzle + Postgres, Better Auth, and the Vercel AI SDK.
