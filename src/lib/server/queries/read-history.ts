import { desc, eq } from 'drizzle-orm';
import { generateId } from '$lib/server/db/generate-id';
import { db } from '$lib/server/db/client';
import { readHistory } from '$lib/server/db/schema';

export async function recordReadHistory(
	userId: string,
	post: { slug: string; title: string; coverImageUrl: string | null }
): Promise<void> {
	await db
		.insert(readHistory)
		.values({
			id: generateId('rh'),
			userId,
			postSlug: post.slug,
			postTitle: post.title,
			coverImageUrl: post.coverImageUrl,
			readAt: new Date()
		})
		.onConflictDoUpdate({
			target: [readHistory.userId, readHistory.postSlug],
			set: { readAt: new Date() }
		});
}

export async function getReadHistory(
	userId: string,
	limit = 20
): Promise<
	Array<{ postSlug: string; postTitle: string; coverImageUrl: string | null; readAt: Date }>
> {
	const rows = await db
		.select({
			postSlug: readHistory.postSlug,
			postTitle: readHistory.postTitle,
			coverImageUrl: readHistory.coverImageUrl,
			readAt: readHistory.readAt
		})
		.from(readHistory)
		.where(eq(readHistory.userId, userId))
		.orderBy(desc(readHistory.readAt))
		.limit(limit);

	return rows;
}
