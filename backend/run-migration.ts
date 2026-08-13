import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import "dotenv/config";

const migrationClient = postgres(process.env.DATABASE_URL as string, { max: 1 });
const db = drizzle(migrationClient);

migrate(db, { migrationsFolder: "./src/db/migrations" })
  .then(() => {
    console.log("Migration successful");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration failed", err);
    process.exit(1);
  });
