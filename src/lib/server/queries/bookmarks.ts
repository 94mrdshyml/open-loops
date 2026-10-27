import { and, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { bookmarks } from '$lib/server/db/schema';
import { generateId } from '$lib/server/db/generate-id';

export async function savePost(
	userId: string,
	postSlug: string,
	postTitle: string,
	coverImageUrl: string | null | undefined
): Promise<void> {
	await db
		.insert(bookmarks)
		.values({
			id: generateId('bkm'),
			userId,
			postSlug,
			postTitle,
			coverImageUrl: coverImageUrl ?? null
		})
		.onConflictDoNothing();
}

export async function unsavePost(userId: string, postSlug: string): Promise<void> {
	await db
		.delete(bookmarks)
		.where(and(eq(bookmarks.userId, userId), eq(bookmarks.postSlug, postSlug)));
}

export async function isPostSaved(userId: string, postSlug: string): Promise<boolean> {
	const rows = await db
		.select({ id: bookmarks.id })
		.from(bookmarks)
		.where(and(eq(bookmarks.userId, userId), eq(bookmarks.postSlug, postSlug)))
		.limit(1);
	return rows.length > 0;
}

export async function getSavedPosts(
	userId: string
): Promise<{ postSlug: string; postTitle: string; coverImageUrl: string | null; savedAt: Date }[]> {
	return db
		.select({
			postSlug: bookmarks.postSlug,
			postTitle: bookmarks.postTitle,
			coverImageUrl: bookmarks.coverImageUrl,
			savedAt: bookmarks.savedAt
		})
		.from(bookmarks)
		.where(eq(bookmarks.userId, userId))
		.orderBy(desc(bookmarks.savedAt));
}
