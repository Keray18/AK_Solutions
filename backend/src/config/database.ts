import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from './env.js';
import { logger } from './logger.js';

const connectionString = env.DATABASE_URL;

// Connection for queries (pool)
const queryClient = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  onnotice: () => {}, // Suppress notices in dev
});

export const db = drizzle(queryClient, {
  logger: env.NODE_ENV === 'development'
    ? {
        logQuery(query, params) {
          logger.debug({ query, params }, 'SQL Query');
        },
      }
    : undefined,
});

// Connection for migrations (single, non-pooled)
export function createMigrationClient() {
  return postgres(connectionString, { max: 1 });
}

export { queryClient };
