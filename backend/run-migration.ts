import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  // Use MIGRATION_DATABASE_URL (direct unpooled connection) if provided, otherwise DATABASE_URL
  const connectionString = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL or MIGRATION_DATABASE_URL must be set");
    process.exit(1);
  }

  // Warn if using a pooled connection string for DDL migrations in Neon
  if (connectionString.includes("-pooler")) {
    console.warn("⚠️  [NOTICE] Connection string contains '-pooler'.");
    console.warn("   Neon PgBouncer transaction pooling can interfere with DDL migration locks.");
    console.warn("   For safe migrations, use Neon's DIRECT connection string (without '-pooler')");
    console.warn("   or set MIGRATION_DATABASE_URL.\n");
  }

  console.log("Connecting to database for migration runner...");
  const migrationClient = postgres(connectionString, { max: 1 });

  try {
    // 1. Ensure pgvector extension exists (required before creating tables with vector columns)
    console.log("Ensuring 'vector' extension is created...");
    await migrationClient.unsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);
    console.log("✓ 'vector' extension is active");

    // 2. Discover migrations folder across environments (tsx, compiled dist, root or backend cwd)
    const candidatePaths = [
      path.resolve(__dirname, "./src/db/migrations"),
      path.resolve(__dirname, "./dist/db/migrations"),
      path.resolve(process.cwd(), "./src/db/migrations"),
      path.resolve(process.cwd(), "./dist/db/migrations"),
      path.resolve(process.cwd(), "./backend/src/db/migrations"),
      path.resolve(process.cwd(), "./backend/dist/db/migrations"),
    ];

    const migrationsFolder = candidatePaths.find(
      (candidate) =>
        fs.existsSync(candidate) &&
        fs.existsSync(path.join(candidate, "meta", "_journal.json"))
    );

    if (!migrationsFolder) {
      throw new Error(
        `Could not find Drizzle migrations folder with meta/_journal.json. Checked:\n` +
          candidatePaths.map((p) => `  - ${p}`).join("\n")
      );
    }

    const migrationFiles = fs
      .readdirSync(migrationsFolder)
      .filter((f) => f.endsWith(".sql"));
    console.log(
      `Found migrations folder at: ${migrationsFolder} (${migrationFiles.length} migration files)`
    );

    const db = drizzle(migrationClient);
    console.log("Executing pending Drizzle migrations...");
    await migrate(db, { migrationsFolder });

    console.log("✓ All database migrations applied successfully.");
    await migrationClient.end();
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err);
    await migrationClient.end();
    process.exit(1);
  }
}

run();
