import { and, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { authors, categories, postTags, posts, tags } from '$lib/server/db/schema';
import { authorPublicName } from '$lib/server/queries/authors';

// What the public API sends, field by field. Nothing is passed on as a whole row, so a column
// added to a table later stays private until it is added here on purpose. Only published stories
// are ever read.

export interface ApiStory {
	id: string;
	slug: string;
	url: string;
	title: string;
	subtitle: string | null;
	coverImageUrl: string | null;
	publishedAt: string | null;
	readingTimeMinutes: number | null;
	category: { name: string; slug: string } | null;
	author: { name: string; slug: string | null } | null;
}

export interface ApiStoryDetail extends ApiStory {
	updatedAt: string | null;
	excerpt: string | null;
	tldr: string[];
	tags: { name: string; slug: string }[];
	contentHtml: string;
}

const storySelect = {
	id: posts.id,
	slug: posts.slug,
	title: posts.title,
	subtitle: posts.subtitle,
	coverImageUrl: posts.featuredImage,
	publishedAt: posts.publishedAt,
	readingTimeMinutes: posts.readingTime,
	categoryName: categories.name,
	categorySlug: categories.slug,
	authorName: authorPublicName,
	authorSlug: authors.slug
};

interface StoryRow {
	id: string;
	slug: string;
	title: string;
	subtitle: string | null;
	coverImageUrl: string | null;
	publishedAt: Date | null;
	readingTimeMinutes: number | null;
	categoryName: string | null;
	categorySlug: string | null;
	authorName: string | null;
	authorSlug: string | null;
}

function toApiStory(row: StoryRow, siteOrigin: string): ApiStory {
	return {
		id: row.id,
		slug: row.slug,
		url: `${siteOrigin}/posts/${row.slug}`,
		title: row.title,
		subtitle: row.subtitle,
		coverImageUrl: row.coverImageUrl,
		publishedAt: row.publishedAt?.toISOString() ?? null,
		readingTimeMinutes: row.readingTimeMinutes,
		category:
			row.categoryName && row.categorySlug
				? { name: row.categoryName, slug: row.categorySlug }
				: null,
		author: row.authorName ? { name: row.authorName, slug: row.authorSlug } : null
	};
}

/** Published stories, newest first. Pass a category slug to keep to one topic. */
export async function listPublishedStories(
	siteOrigin: string,
	params: { categorySlug?: string; limit: number; offset: number }
): Promise<ApiStory[]> {
	const rows = await db
		.select(storySelect)
		.from(posts)
		.leftJoin(categories, eq(posts.categoryId, categories.id))
		.leftJoin(authors, eq(posts.authorId, authors.id))
		.where(
			params.categorySlug
				? and(eq(posts.status, 'published'), eq(categories.slug, params.categorySlug))
				: eq(posts.status, 'published')
		)
		.orderBy(desc(posts.publishedAt))
		.limit(params.limit)
		.offset(params.offset);

	return rows.map((row) => toApiStory(row, siteOrigin));
}

/** One published story with its text. A draft, scheduled or archived story is the same as none. */
export async function getPublishedStory(
	siteOrigin: string,
	id: string
): Promise<ApiStoryDetail | null> {
	const [row] = await db
		.select({
			...storySelect,
			updatedAt: posts.updatedAt,
			excerpt: posts.excerpt,
			tldr: posts.tldr,
			content: posts.content
		})
		.from(posts)
		.leftJoin(categories, eq(posts.categoryId, categories.id))
		.leftJoin(authors, eq(posts.authorId, authors.id))
		.where(and(eq(posts.id, id), eq(posts.status, 'published')))
		.limit(1);

	if (!row) return null;

	const tagRows = await db
		.select({ name: tags.name, slug: tags.slug })
		.from(postTags)
		.innerJoin(tags, eq(postTags.tagId, tags.id))
		.where(eq(postTags.postId, row.id));

	return {
		...toApiStory(row, siteOrigin),
		updatedAt: row.updatedAt?.toISOString() ?? null,
		excerpt: row.excerpt,
		tldr: row.tldr ?? [],
		tags: tagRows,
		contentHtml: row.content
	};
}
