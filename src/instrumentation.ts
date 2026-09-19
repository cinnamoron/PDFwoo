declare global {
  // eslint-disable-next-line no-var
  var conceptIqMigrationPromise: Promise<void> | undefined;
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const migrationPromise = globalThis.conceptIqMigrationPromise ??= import("@/db/migrate")
    .then(({ migrateDatabase }) => migrateDatabase())
    .then(() => {
      console.info("[db] migrations applied successfully");
    })
    .catch((error) => {
      console.error("[db] migration failed", error);
      throw error;
    });

  await migrationPromise;
}