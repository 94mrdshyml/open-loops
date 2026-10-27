import { count, eq, sql } from 'drizzle-orm';
import { generateId } from '$lib/server/db/generate-id';
import { db } from '$lib/server/db/client';
import { authors, posts, user } from '$lib/server/db/schema';
import { slugify } from '$lib/utils/slugify';
import type { Author, AuthorWithEmail } from '$lib/types/index';

/** The name readers see: the public name when one is set, otherwise the dashboard name. */
export const authorPublicName = sql<string>`coalesce(${authors.publicName}, ${authors.displayName})`;

export async function getAllAuthors(): Promise<Author[]> {
	return db.select().from(authors).orderBy(authors.displayName);
}

export async function getAuthorByUserId(userId: string): Promise<Author | null> {
	const rows = await db.select().from(authors).where(eq(authors.userId, userId)).limit(1);
	return rows[0] ?? null;
}

export async function getAuthorBySlug(slug: string): Promise<Author | null> {
	const rows = await db.select().from(authors).where(eq(authors.slug, slug)).limit(1);
	return rows[0] ?? null;
}

export async function getAuthorById(id: string): Promise<AuthorWithEmail | null> {
	const rows = await db
		.select({
			id: authors.id,
			userId: authors.userId,
			displayName: authors.displayName,
			publicName: authors.publicName,
			slug: authors.slug,
			bio: authors.bio,
			role: authors.role,
			avatarUrl: authors.avatarUrl,
			createdAt: authors.createdAt,
			updatedAt: authors.updatedAt,
			email: user.email
		})
		.from(authors)
		.leftJoin(user, eq(authors.userId, user.id))
		.where(eq(authors.id, id))
		.limit(1);

	if (rows.length === 0) return null;
	const row = rows[0];
	return { ...row, email: row.email ?? null };
}

export interface NewAuthorData {
	displayName: string;
	publicName?: string | null;
	bio?: string | null;
	role?: string;
	avatarUrl?: string | null;
	userId?: string | null;
}

async function uniqueSlug(base: string): Promise<string> {
	const slug = slugify(base);
	const existing = await db.select({ slug: authors.slug }).from(authors);
	const slugs = new Set(existing.map((r) => r.slug));
	if (!slugs.has(slug)) return slug;
	let i = 2;
	while (slugs.has(`${slug}-${i}`)) i++;
	return `${slug}-${i}`;
}

export async function createAuthor(data: NewAuthorData): Promise<string> {
	const id = generateId('aut');
	const slug = await uniqueSlug(data.displayName);
	await db.insert(authors).values({
		id,
		displayName: data.displayName,
		publicName: data.publicName ?? null,
		slug,
		bio: data.bio ?? null,
		role: data.role ?? 'writer',
		avatarUrl: data.avatarUrl ?? null,
		userId: data.userId ?? null
	});
	return id;
}

export async function ensureAuthorProfile(userId: string, displayName: string): Promise<void> {
	const existing = await getAuthorByUserId(userId);
	if (existing) return;
	await createAuthor({ displayName, userId });
}

export async function updateAuthor(id: string, data: Partial<NewAuthorData>): Promise<string> {
	await db
		.update(authors)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(authors.id, id));
	return id;
}

export async function deleteAuthor(id: string): Promise<{ success: true } | { error: string }> {
	const postRows = await db
		.select({ total: count(posts.id) })
		.from(posts)
		.where(eq(posts.authorId, id));
	if ((postRows[0]?.total ?? 0) > 0) {
		return { error: 'Author has posts — reassign before deleting' };
	}
	await db.delete(authors).where(eq(authors.id, id));
	return { success: true };
}

export async function getAllAuthorsWithPostCount(): Promise<(Author & { postCount: number })[]> {
	const all = await db.select().from(authors).orderBy(authors.displayName);
	const counts = await db
		.select({ authorId: posts.authorId, total: count(posts.id) })
		.from(posts)
		.groupBy(posts.authorId);
	const countMap = new Map(counts.map((r) => [r.authorId, r.total]));
	return all.map((a) => ({ ...a, postCount: countMap.get(a.id) ?? 0 }));
}
