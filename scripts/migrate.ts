import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { neon } from '@neondatabase/serverless';
import { articleToText } from '../src/lib/server/article-text';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL must be set');

const sql = neon(url);
const db = drizzle(sql);

await migrate(db, { migrationsFolder: './drizzle/migrations' });
console.log('Migrations applied successfully');

// Search reads a plain-text copy of each story. Stories saved before search existed have none, so
// fill it in here. It only touches stories with no copy yet, so running this again changes nothing.
const unfilled = await sql`SELECT id, content FROM posts WHERE search_body IS NULL`;
for (const row of unfilled) {
	await sql`UPDATE posts SET search_body = ${articleToText(String(row.content))} WHERE id = ${row.id}`;
}
console.log(`Search text filled in for ${unfilled.length} stories`);
