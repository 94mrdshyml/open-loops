import type { SQL } from 'drizzle-orm';
import { and, count, desc, eq, ilike, inArray, lte, ne, notInArray, or, sql } from 'drizzle-orm';
import { generateId } from '$lib/server/db/generate-id';
import { db } from '$lib/server/db/client';
import { authors, categories, postTags, posts, settings, tags } from '$lib/server/db/schema';
import { articleToText } from '$lib/server/article-text';
import { authorPublicName } from '$lib/server/queries/authors';
import { logger, startTimer } from '$lib/server/logger';

const SLOW_QUERY_MS = 500;
import type { PostStatus } from '$lib/server/db/schema';
import type {
	AdminPost,
	AdminPostDetail,
	CategoryWithCount,
	PostDetail,
	PostListItem,
	SiteSettings
} from '$lib/types/index';

// ─── Shared select shape ──────────────────────────────────────────

const listSelect = {
	slug: posts.slug,
	title: posts.title,
	subtitle: posts.subtitle,
	coverImageUrl: posts.featuredImage,
	publishedAt: posts.publishedAt,
	readingTimeMinutes: posts.readingTime,
	categoryName: categories.name,
	categorySlug: categories.slug,
	categoryColor: categories.color,
	authorName: authorPublicName,
	authorAvatarUrl: authors.avatarUrl,
	authorSlug: authors.slug,
	authorBio: authors.bio,
	authorRole: authors.role
};

type ListRow = {
	slug: string;
	title: string;
	subtitle: string | null;
	coverImageUrl: string | null;
	publishedAt: Date | null;
	readingTimeMinutes: number | null;
	categoryName: string | null;
	categorySlug: string | null;
	categoryColor: string | null;
	authorName: string | null;
	authorAvatarUrl: string | null;
	authorSlug: string | null;
	authorBio: string | null;
	authorRole: string | null;
};

function toListItem(row: ListRow): PostListItem {
	return {
		slug: row.slug,
		title: row.title,
		subtitle: row.subtitle,
		coverImageUrl: row.coverImageUrl,
		publishedAt: row.publishedAt,
		readingTimeMinutes: row.readingTimeMinutes,
		category:
			row.categoryName && row.categorySlug
				? { name: row.categoryName, slug: row.categorySlug, color: row.categoryColor }
				: null,
		author: row.authorName
			? {
					name: row.authorName,
					avatarUrl: row.authorAvatarUrl,
					slug: row.authorSlug,
					bio: row.authorBio,
					role: row.authorRole
				}
			: null
	};
}

// ─── Query functions ──────────────────────────────────────────────

const FEATURED_FALLBACK_COUNT = 4;

/** Every published post marked as featured, newest first. Pass `limit` to cap the list. */
export async function getFeaturedPosts(limit?: number): Promise<PostListItem[]> {
	const query = db
		.select(listSelect)
		.from(posts)
		.leftJoin(categories, eq(posts.categoryId, categories.id))
		.leftJoin(authors, eq(posts.authorId, authors.id))
		.where(and(eq(posts.status, 'published'), eq(posts.isFeatured, true)))
		.orderBy(desc(posts.publishedAt))
		.$dynamic();

	const rows = await (limit ? query.limit(limit) : query);

	if (rows.length > 0) return (rows as ListRow[]).map(toListItem);

	// Fallback: most recent published posts
	return getPosts({ limit: limit ?? FEATURED_FALLBACK_COUNT });
}

export async function getFeaturedPost(categorySlug?: string): Promise<PostListItem | null> {
	const baseWhere = categorySlug
		? and(eq(posts.status, 'published'), eq(categories.slug, categorySlug))
		: eq(posts.status, 'published');

	const featuredWhere = categorySlug
		? and(
				eq(posts.status, 'published'),
				eq(posts.isFeatured, true),
				eq(categories.slug, categorySlug)
			)
		: and(eq(posts.status, 'published'), eq(posts.isFeatured, true));

	const featured = await db
		.select(listSelect)
		.from(posts)
		.leftJoin(categories, eq(posts.categoryId, categories.id))
		.leftJoin(authors, eq(posts.authorId, authors.id))
		.where(featuredWhere)
		.orderBy(desc(posts.publishedAt))
		.limit(1);

	if (featured.length > 0) return toListItem(featured[0] as ListRow);

	const rows = await db
		.select(listSelect)
		.from(posts)
		.leftJoin(categories, eq(posts.categoryId, categories.id))
		.leftJoin(authors, eq(posts.authorId, authors.id))
		.where(baseWhere)
		.orderBy(desc(posts.publishedAt))
		.limit(1);

	return rows.length === 0 ? null : toListItem(rows[0] as ListRow);
}

export async function getPosts(params?: {
	categorySlug?: string;
	limit?: number;
	offset?: number;
}): Promise<PostListItem[]> {
	const limit = params?.limit ?? 12;
	const offset = params?.offset ?? 0;

	const whereClause = params?.categorySlug
		? and(eq(posts.status, 'published'), eq(categories.slug, params.categorySlug))
		: eq(posts.status, 'published');

	const rows = await db
		.select(listSelect)
		.from(posts)
		.leftJoin(categories, eq(posts.categoryId, categories.id))
		.leftJoin(authors, eq(posts.authorId, authors.id))
		.where(whereClause)
		.orderBy(desc(posts.publishedAt))
		.limit(limit)
		.offset(offset);

	return (rows as ListRow[]).map(toListItem);
}

export async function getPostBySlug(slug: string): Promise<PostDetail | null> {
	const elapsed = startTimer();
	try {
		const rows = await db
			.select({
				id: posts.id,
				categoryId: posts.categoryId,
				updatedAt: posts.updatedAt,
				...listSelect,
				excerpt: posts.excerpt,
				tldr: posts.tldr,
				content: posts.content
			})
			.from(posts)
			.leftJoin(categories, eq(posts.categoryId, categories.id))
			.leftJoin(authors, eq(posts.authorId, authors.id))
			.where(and(eq(posts.slug, slug), eq(posts.status, 'published')))
			.limit(1);

		const ms = elapsed();
		if (ms > SLOW_QUERY_MS) {
			logger.warn('db.slow_query', { durationMs: ms, meta: { fn: 'getPostBySlug', slug } });
		}

		if (rows.length === 0) return null;
		const row = rows[0];

		const tagRows = await db
			.select({ name: tags.name, slug: tags.slug })
			.from(postTags)
			.innerJoin(tags, eq(postTags.tagId, tags.id))
			.where(eq(postTags.postId, row.id));

		return {
			id: row.id,
			categoryId: row.categoryId,
			updatedAt: row.updatedAt,
			...toListItem(row as ListRow),
			content: row.content,
			excerpt: row.excerpt,
			tldr: row.tldr,
			tags: tagRows
		};
	} catch (e) {
		logger.error('db.query_failed', {
			durationMs: elapsed(),
			meta: { fn: 'getPostBySlug', slug },
			error: e
		});
		throw e;
	}
}

type RelatedRow = ListRow & { id: string };

export async function getRelatedPosts(
	postId: string,
	categoryId: string | null,
	limit = 3
): Promise<PostListItem[]> {
	const relatedSelect = { id: posts.id, ...listSelect };

	if (categoryId) {
		const sameCategory = await db
			.select(relatedSelect)
			.from(posts)
			.leftJoin(categories, eq(posts.categoryId, categories.id))
			.leftJoin(authors, eq(posts.authorId, authors.id))
			.where(
				and(eq(posts.status, 'published'), eq(posts.categoryId, categoryId), ne(posts.id, postId))
			)
			.orderBy(desc(posts.publishedAt))
			.limit(limit);

		if (sameCategory.length >= limit) {
			return (sameCategory as RelatedRow[]).map(toListItem);
		}

		const needed = limit - sameCategory.length;
		const excludeIds = [postId, ...(sameCategory as RelatedRow[]).map((r) => r.id)];

		const backfill = await db
			.select(relatedSelect)
			.from(posts)
			.leftJoin(categories, eq(posts.categoryId, categories.id))
			.leftJoin(authors, eq(posts.authorId, authors.id))
			.where(and(eq(posts.status, 'published'), notInArray(posts.id, excludeIds)))
			.orderBy(desc(posts.publishedAt))
			.limit(needed);

		return [
			...(sameCategory as RelatedRow[]).map(toListItem),
			...(backfill as RelatedRow[]).map(toListItem)
		];
	}

	const rows = await db
		.select(relatedSelect)
		.from(posts)
		.leftJoin(categories, eq(posts.categoryId, categories.id))
		.leftJoin(authors, eq(posts.authorId, authors.id))
		.where(and(eq(posts.status, 'published'), ne(posts.id, postId)))
		.orderBy(desc(posts.publishedAt))
		.limit(limit);

	return (rows as RelatedRow[]).map(toListItem);
}

export async function getPostTags(
	postId: string
): Promise<{ id: string; name: string; slug: string }[]> {
	const rows = await db
		.select({ id: tags.id, name: tags.name, slug: tags.slug })
		.from(postTags)
		.innerJoin(tags, eq(postTags.tagId, tags.id))
		.where(eq(postTags.postId, postId));

	return rows;
}

export async function getAllCategoriesAdmin(): Promise<CategoryWithCount[]> {
	const rows = await db
		.select({
			id: categories.id,
			name: categories.name,
			slug: categories.slug,
			color: categories.color,
			postCount: count(posts.id)
		})
		.from(categories)
		.leftJoin(posts, eq(posts.categoryId, categories.id))
		.groupBy(categories.id, categories.name, categories.slug, categories.color)
		.orderBy(categories.name);
	return rows as CategoryWithCount[];
}

export async function getCategories(): Promise<CategoryWithCount[]> {
	const postCount = count(posts.id);

	const rows = await db
		.select({
			id: categories.id,
			name: categories.name,
			slug: categories.slug,
			color: categories.color,
			postCount
		})
		.from(categories)
		.innerJoin(posts, and(eq(posts.categoryId, categories.id), eq(posts.status, 'published')))
		.groupBy(categories.id, categories.name, categories.slug, categories.color)
		.orderBy(desc(postCount));

	return rows as CategoryWithCount[];
}

export async function getPostCount(params?: { categorySlug?: string }): Promise<number> {
	if (params?.categorySlug) {
		const rows = await db
			.select({ total: count(posts.id) })
			.from(posts)
			.leftJoin(categories, eq(posts.categoryId, categories.id))
			.where(and(eq(posts.status, 'published'), eq(categories.slug, params.categorySlug)));
		return rows[0]?.total ?? 0;
	}

	const rows = await db
		.select({ total: count(posts.id) })
		.from(posts)
		.where(eq(posts.status, 'published'));
	return rows[0]?.total ?? 0;
}

export async function getSiteSettings(): Promise<SiteSettings> {
	const rows = await db.select().from(settings);
	return Object.fromEntries(rows.map((r) => [r.key, r.value])) as SiteSettings;
}

/** True when the post has at least one TL;DR point. An empty array counts as none. */
const hasTldrSql = sql<boolean>`coalesce(cardinality(${posts.tldr}), 0) > 0`;

/** How many published stories have no TL;DR yet. */
export async function countPublishedMissingTldr(): Promise<number> {
	const [row] = await db
		.select({ total: count(posts.id) })
		.from(posts)
		.where(and(eq(posts.status, 'published'), sql`not ${hasTldrSql}`));
	return row?.total ?? 0;
}

/** The newest published story with no TL;DR, skipping any ids in `excludeIds`. */
export async function getNextPostMissingTldr(
	excludeIds: string[]
): Promise<{ id: string; title: string } | null> {
	const conditions: (SQL | undefined)[] = [eq(posts.status, 'published'), sql`not ${hasTldrSql}`];
	if (excludeIds.length > 0) conditions.push(notInArray(posts.id, excludeIds));

	const [row] = await db
		.select({ id: posts.id, title: posts.title })
		.from(posts)
		.where(and(...conditions))
		.orderBy(desc(posts.publishedAt))
		.limit(1);
	return row ?? null;
}

export async function getAdminPosts(params?: {
	status?: PostStatus;
	categorySlug?: string;
	search?: string;
	tldr?: 'missing' | 'present';
	limit?: number;
	offset?: number;
	authorId?: string;
}): Promise<{ posts: AdminPost[]; total: number }> {
	const limit = params?.limit ?? 20;
	const offset = params?.offset ?? 0;

	const conditions: (SQL | undefined)[] = [];
	if (params?.status) conditions.push(eq(posts.status, params.status));
	if (params?.tldr === 'present') conditions.push(hasTldrSql);
	if (params?.tldr === 'missing') conditions.push(sql`not ${hasTldrSql}`);
	if (params?.categorySlug) conditions.push(eq(categories.slug, params.categorySlug));
	if (params?.search) {
		const s = `%${params.search}%`;
		conditions.push(or(ilike(posts.title, s), ilike(posts.subtitle, s)));
	}
	if (params?.authorId) conditions.push(eq(authors.userId, params.authorId));

	const whereClause = and(...conditions);

	const adminSelect = {
		id: posts.id,
		title: posts.title,
		subtitle: posts.subtitle,
		slug: posts.slug,
		status: posts.status,
		publishedAt: posts.publishedAt,
		updatedAt: posts.updatedAt,
		featuredImage: posts.featuredImage,
		isFeatured: posts.isFeatured,
		hasTldr: hasTldrSql,
		authorName: authors.displayName,
		categoryName: categories.name,
		categorySlug: categories.slug,
		categoryColor: categories.color
	};

	const [rows, countRows] = await Promise.all([
		db
			.select(adminSelect)
			.from(posts)
			.leftJoin(categories, eq(posts.categoryId, categories.id))
			.leftJoin(authors, eq(posts.authorId, authors.id))
			.where(whereClause)
			.orderBy(desc(posts.updatedAt))
			.limit(limit)
			.offset(offset),
		db
			.select({ total: count(posts.id) })
			.from(posts)
			.leftJoin(categories, eq(posts.categoryId, categories.id))
			.leftJoin(authors, eq(posts.authorId, authors.id))
			.where(whereClause)
	]);

	return {
		posts: rows as AdminPost[],
		total: countRows[0]?.total ?? 0
	};
}

export async function getAdminPostById(id: string): Promise<AdminPostDetail | null> {
	const rows = await db
		.select({
			id: posts.id,
			title: posts.title,
			subtitle: posts.subtitle,
			slug: posts.slug,
			excerpt: posts.excerpt,
			tldr: posts.tldr,
			content: posts.content,
			featuredImage: posts.featuredImage,
			isFeatured: posts.isFeatured,
			status: posts.status,
			publishedAt: posts.publishedAt,
			authorId: posts.authorId,
			authorUserId: authors.userId,
			categoryId: posts.categoryId,
			readingTime: posts.readingTime
		})
		.from(posts)
		.leftJoin(authors, eq(posts.authorId, authors.id))
		.where(eq(posts.id, id))
		.limit(1);

	if (rows.length === 0) return null;
	const row = rows[0];

	const tagRows = await db
		.select({
			id: tags.id,
			name: tags.name,
			slug: tags.slug,
			createdAt: tags.createdAt,
			updatedAt: tags.updatedAt
		})
		.from(postTags)
		.innerJoin(tags, eq(postTags.tagId, tags.id))
		.where(eq(postTags.postId, id));

	return { ...row, tags: tagRows };
}

export async function setPostFeatured(id: string, featured: boolean): Promise<void> {
	await db
		.update(posts)
		.set({ isFeatured: featured, updatedAt: new Date() })
		.where(eq(posts.id, id));
}

export async function getPostOwnerUserId(postId: string): Promise<string | null> {
	const [row] = await db
		.select({ authorUserId: authors.userId })
		.from(posts)
		.leftJoin(authors, eq(posts.authorId, authors.id))
		.where(eq(posts.id, postId))
		.limit(1);
	return row?.authorUserId ?? null;
}

/**
 * Saves the TL;DR points on the post. Pass null to clear them.
 * Does not touch updatedAt: adding a summary should not reorder the admin list or move
 * the post's sitemap date.
 */
export async function setPostTldr(id: string, points: string[] | null): Promise<void> {
	await db
		.update(posts)
		.set({ tldr: points && points.length > 0 ? points : null })
		.where(eq(posts.id, id));
}

export async function getPostTldrSource(id: string): Promise<{
	content: string;
	status: PostStatus;
	tldr: string[] | null;
	slug: string;
	title: string;
	subtitle: string | null;
	publishedAt: Date | null;
} | null> {
	const [row] = await db
		.select({
			content: posts.content,
			status: posts.status,
			tldr: posts.tldr,
			slug: posts.slug,
			title: posts.title,
			subtitle: posts.subtitle,
			publishedAt: posts.publishedAt
		})
		.from(posts)
		.where(eq(posts.id, id))
		.limit(1);
	return row ?? null;
}

export interface CreatePostData {
	title: string;
	subtitle?: string | null;
	slug: string;
	excerpt?: string | null;
	content: string;
	featuredImage?: string | null;
	isFeatured?: boolean;
	status: PostStatus;
	publishedAt?: Date | null;
	authorId: string;
	categoryId?: string | null;
	readingTime?: number | null;
}

export async function createPost(data: CreatePostData): Promise<string> {
	const elapsed = startTimer();
	const id = generateId('pst');
	try {
		await db.insert(posts).values({
			id,
			title: data.title,
			subtitle: data.subtitle ?? null,
			slug: data.slug,
			excerpt: data.excerpt ?? null,
			content: data.content,
			searchBody: articleToText(data.content),
			featuredImage: data.featuredImage ?? null,
			isFeatured: data.isFeatured ?? false,
			status: data.status,
			publishedAt: data.publishedAt ?? null,
			authorId: data.authorId,
			categoryId: data.categoryId ?? null,
			readingTime: data.readingTime ?? null
		});
		return id;
	} catch (e) {
		logger.error('db.query_failed', {
			durationMs: elapsed(),
			meta: { fn: 'createPost', slug: data.slug },
			error: e
		});
		throw e;
	}
}

export type UpdatePostData = Partial<Omit<CreatePostData, 'authorId'>>;

export async function updatePost(id: string, data: UpdatePostData): Promise<void> {
	const elapsed = startTimer();
	try {
		await db
			.update(posts)
			.set({
				...data,
				// Search reads a plain-text copy of the story, so keep it in step with the content
				...(data.content !== undefined ? { searchBody: articleToText(data.content) } : {}),
				updatedAt: new Date()
			})
			.where(eq(posts.id, id));
	} catch (e) {
		logger.error('db.query_failed', {
			durationMs: elapsed(),
			meta: { fn: 'updatePost', id },
			error: e
		});
		throw e;
	}
}

export async function upsertPostTags(postId: string, tagIds: string[]): Promise<void> {
	const elapsed = startTimer();
	try {
		await db.delete(postTags).where(eq(postTags.postId, postId));
		if (tagIds.length > 0) {
			await db.insert(postTags).values(tagIds.map((tagId) => ({ postId, tagId })));
		}
	} catch (e) {
		logger.error('db.query_failed', {
			durationMs: elapsed(),
			meta: { fn: 'upsertPostTags', postId },
			error: e
		});
		throw e;
	}
}

/**
 * Publishes every scheduled post that is due and returns their ids. One statement claims the
 * posts, so two checks at the same moment cannot both publish (and announce) the same story.
 */
export async function publishScheduledPosts(): Promise<string[]> {
	const claimed = await db
		.update(posts)
		.set({ status: 'published', updatedAt: new Date() })
		.where(and(eq(posts.status, 'scheduled'), lte(posts.publishedAt, new Date())))
		.returning({ id: posts.id });

	return claimed.map((row) => row.id);
}

export async function getPostTitlesBySlugs(slugs: string[]): Promise<Map<string, string>> {
	if (slugs.length === 0) return new Map();
	const rows = await db
		.select({ slug: posts.slug, title: posts.title })
		.from(posts)
		.where(inArray(posts.slug, slugs));
	return new Map(rows.map((p) => [p.slug, p.title]));
}

export async function getPostsByTag(
	tagSlug: string,
	params?: { limit?: number; offset?: number }
): Promise<PostListItem[]> {
	const limit = params?.limit ?? 20;
	const offset = params?.offset ?? 0;

	const rows = await db
		.select(listSelect)
		.from(posts)
		.innerJoin(postTags, eq(postTags.postId, posts.id))
		.innerJoin(tags, eq(postTags.tagId, tags.id))
		.leftJoin(categories, eq(posts.categoryId, categories.id))
		.leftJoin(authors, eq(posts.authorId, authors.id))
		.where(and(eq(posts.status, 'published'), eq(tags.slug, tagSlug)))
		.orderBy(desc(posts.publishedAt))
		.limit(limit)
		.offset(offset);

	return (rows as ListRow[]).map(toListItem);
}

export async function getPostCountByTag(tagSlug: string): Promise<number> {
	const rows = await db
		.select({ total: count(posts.id) })
		.from(posts)
		.innerJoin(postTags, eq(postTags.postId, posts.id))
		.innerJoin(tags, eq(postTags.tagId, tags.id))
		.where(and(eq(posts.status, 'published'), eq(tags.slug, tagSlug)));
	return rows[0]?.total ?? 0;
}

export async function getPostsByAuthor(
	authorSlug: string,
	params?: { limit?: number; offset?: number }
): Promise<PostListItem[]> {
	const limit = params?.limit ?? 20;
	const offset = params?.offset ?? 0;

	const rows = await db
		.select(listSelect)
		.from(posts)
		.leftJoin(categories, eq(posts.categoryId, categories.id))
		.leftJoin(authors, eq(posts.authorId, authors.id))
		.where(and(eq(posts.status, 'published'), eq(authors.slug, authorSlug)))
		.orderBy(desc(posts.publishedAt))
		.limit(limit)
		.offset(offset);

	return (rows as ListRow[]).map(toListItem);
}

export async function getCategoryBySlug(slug: string): Promise<CategoryWithCount | null> {
	const postCount = count(posts.id);

	const rows = await db
		.select({
			id: categories.id,
			name: categories.name,
			slug: categories.slug,
			color: categories.color,
			description: categories.description,
			postCount
		})
		.from(categories)
		.leftJoin(posts, and(eq(posts.categoryId, categories.id), eq(posts.status, 'published')))
		.where(eq(categories.slug, slug))
		.groupBy(
			categories.id,
			categories.name,
			categories.slug,
			categories.color,
			categories.description
		)
		.limit(1);

	return rows.length === 0 ? null : (rows[0] as CategoryWithCount);
}

// ─── IndexNow ─────────────────────────────────────────────────────

export interface StoryPublicInfo {
	slug: string;
	status: PostStatus;
	categorySlug: string | null;
}

/** What the public site needs to know about a story to tell search engines about it. */
export async function getStoryPublicInfo(id: string): Promise<StoryPublicInfo | null> {
	const [row] = await db
		.select({ slug: posts.slug, status: posts.status, categorySlug: categories.slug })
		.from(posts)
		.leftJoin(categories, eq(posts.categoryId, categories.id))
		.where(eq(posts.id, id))
		.limit(1);
	return row ?? null;
}

export async function getStoryPublicInfos(ids: string[]): Promise<StoryPublicInfo[]> {
	if (ids.length === 0) return [];
	return db
		.select({ slug: posts.slug, status: posts.status, categorySlug: categories.slug })
		.from(posts)
		.leftJoin(categories, eq(posts.categoryId, categories.id))
		.where(inArray(posts.id, ids));
}

/** Every public page for published stories, their categories and the home page. */
export async function getPublicSitePaths(): Promise<string[]> {
	const rows = await db
		.select({ slug: posts.slug, categorySlug: categories.slug })
		.from(posts)
		.leftJoin(categories, eq(posts.categoryId, categories.id))
		.where(eq(posts.status, 'published'));
	const paths = new Set<string>(['/', '/categories', '/about']);
	for (const row of rows) {
		paths.add(`/posts/${encodeURIComponent(row.slug)}`);
		if (row.categorySlug) paths.add(`/categories/${encodeURIComponent(row.categorySlug)}`);
	}
	return [...paths];
}
