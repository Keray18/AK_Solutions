import { db } from '../config/database.js';
import { sql } from 'drizzle-orm';

async function testTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS knowledge_embeddings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        source_type varchar(50) NOT NULL,
        source_id varchar(255) NOT NULL,
        title text NOT NULL,
        content text NOT NULL,
        metadata jsonb,
        embedding vector(1536),
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL
      );
    `);
    console.log('✅ knowledge_embeddings table created or verified!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Table creation failed:', err);
    process.exit(1);
  }
}

testTable();
