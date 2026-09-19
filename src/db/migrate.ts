import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "@/index";

const migrationsFolder = "src/db/drizzle";

export async function migrateDatabase() {
  await migrate(db, { migrationsFolder });
}

const isMigrationEntryPoint = /(?:^|[\\/])migrate\.(?:ts|js)$/.test(process.argv[1] ?? "");

if (isMigrationEntryPoint) {
  migrateDatabase()
    .then(() => {
      console.info("[db] migrations applied successfully");
    })
    .catch((error) => {
      console.error("[db] migration failed", error);
      process.exitCode = 1;
    });
}