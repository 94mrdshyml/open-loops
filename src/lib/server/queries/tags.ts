import { count, eq } from 'drizzle-orm';
import { generateId } from '$lib/server/db/generate-id';
import { db } from '$lib/server/db/client';
import { postTags, posts, tags } from '$lib/server/db/schema';
import { slugify } from '$lib/utils/slugify';
import type { Tag, TagCount, TagWithCount } from '$lib/types/index';

export async function getAllTags(): Promise<Tag[]> {
	return db.select().from(tags).orderBy(tags.name);
}

export async function getAllTagsWithCounts(): Promise<TagWithCount[]> {
	const all = await db.select().from(tags).orderBy(tags.name);
	const counts = await db
		.select({ tagId: postTags.tagId, total: count(postTags.postId) })
		.from(postTags)
		.groupBy(postTags.tagId);
	const countMap = new Map(counts.map((r) => [r.tagId, r.total]));
	return all.map((t) => ({ ...t, postCount: countMap.get(t.id) ?? 0 }));
}

/** Every tag that has at least one live story, with the number of live stories. */
export async function getPublishedTagCounts(): Promise<TagCount[]> {
	return db
		.select({ name: tags.name, slug: tags.slug, postCount: count(posts.id) })
		.from(tags)
		.innerJoin(postTags, eq(postTags.tagId, tags.id))
		.innerJoin(posts, eq(postTags.postId, posts.id))
		.where(eq(posts.status, 'published'))
		.groupBy(tags.id)
		.orderBy(tags.name);
}

export async function getTagBySlug(slug: string): Promise<Tag | null> {
	const rows = await db.select().from(tags).where(eq(tags.slug, slug)).limit(1);
	return rows[0] ?? null;
}

export async function getTagById(id: string): Promise<Tag | null> {
	const rows = await db.select().from(tags).where(eq(tags.id, id)).limit(1);
	return rows.length === 0 ? null : rows[0];
}

export async function upsertTag(name: string): Promise<Tag> {
	const slug = slugify(name);
	const existing = await db.select().from(tags).where(eq(tags.slug, slug)).limit(1);
	if (existing.length > 0) return existing[0];
	const [created] = await db
		.insert(tags)
		.values({ id: generateId('tag'), name: name.trim(), slug })
		.returning();
	return created;
}

export async function updateTag(id: string, data: { name: string }): Promise<string> {
	const slug = slugify(data.name);
	await db
		.update(tags)
		.set({ name: data.name.trim(), slug, updatedAt: new Date() })
		.where(eq(tags.id, id));
	return id;
}

/** Move every post from `sourceId` onto `targetId`, then remove the source tag. */
export async function mergeTag(sourceId: string, targetId: string): Promise<{ success: true }> {
	const rows = await db
		.select({ postId: postTags.postId })
		.from(postTags)
		.where(eq(postTags.tagId, sourceId));

	if (rows.length === 0) {
		await db.delete(tags).where(eq(tags.id, sourceId));
		return { success: true };
	}

	// One batch so a failure cannot leave posts half moved. Deleting the source tag also removes
	// its post_tags rows (cascade).
	await db.batch([
		db
			.insert(postTags)
			.values(rows.map((r) => ({ postId: r.postId, tagId: targetId })))
			.onConflictDoNothing(),
		db.delete(tags).where(eq(tags.id, sourceId))
	]);
	return { success: true };
}

export async function deleteTag(id: string): Promise<{ success: true }> {
	await db.delete(postTags).where(eq(postTags.tagId, id));
	await db.delete(tags).where(eq(tags.id, id));
	return { success: true };
}
