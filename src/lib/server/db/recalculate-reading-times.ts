/**
 * Recalculate reading_time for all posts.
 *
 * Run with:
 *   $env:DATABASE_URL = "your-neon-url"
 *   npx tsx src/lib/server/db/recalculate-reading-times.ts
 */
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { calculateReadingTime } from '../../utils/reading-time';
import { posts } from './schema';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const db = drizzle(neon(databaseUrl));

async function main() {
	const allPosts = await db
		.select({ id: posts.id, content: posts.content, title: posts.title })
		.from(posts);

	console.log(`Recalculating reading times for ${allPosts.length} posts…`);

	let updated = 0;
	for (const post of allPosts) {
		let parsed: unknown = post.content;
		if (typeof post.content === 'string') {
			try {
				parsed = JSON.parse(post.content);
			} catch {
				// content is plain text or unparseable — use as-is
			}
		}
		const readingTime = calculateReadingTime(parsed);
		await db.update(posts).set({ readingTime, updatedAt: new Date() }).where(eq(posts.id, post.id));

		console.log(`  [${post.id}] "${post.title}" → ${readingTime} min`);
		updated++;
	}

	console.log(`Done. Updated ${updated} posts.`);
	process.exit(0);
}

main().catch((err) => {
	console.error('Error:', err);
	process.exit(1);
});
