import { sql, type SQL } from 'drizzle-orm';
import {
	boolean,
	customType,
	integer,
	pgTable,
	primaryKey,
	text,
	timestamp,
	unique
} from 'drizzle-orm/pg-core';
import { user } from './auth.schema';

export * from './auth.schema';

/** Postgres' searchable-text type. Only ever filled in by the database (see the posts table). */
const tsvector = customType<{ data: string }>({
	dataType() {
		return 'tsvector';
	}
});

export type PostStatus = 'draft' | 'published' | 'scheduled' | 'archived';

export const categories = pgTable('categories', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	slug: text('slug').notNull().unique(),
	description: text('description'),
	color: text('color'),
	showOnHome: boolean('show_on_home').notNull().default(false),
	homeOrder: integer('home_order').notNull().default(0),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const tags = pgTable('tags', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	slug: text('slug').notNull().unique(),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const authors = pgTable('authors', {
	id: text('id').primaryKey(),
	userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
	displayName: text('display_name').notNull(),
	/** The name readers see on stories, when it should differ from `displayName` (the dashboard name). */
	publicName: text('public_name'),
	slug: text('slug').unique(),
	bio: text('bio'),
	role: text('role').notNull().default('writer'),
	avatarUrl: text('avatar_url'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const posts = pgTable('posts', {
	id: text('id').primaryKey(),
	slug: text('slug').notNull().unique(),
	title: text('title').notNull(),
	subtitle: text('subtitle'),
	excerpt: text('excerpt'),
	tldr: text('tldr').array(),
	content: text('content').notNull().default(''),
	/** The story as plain text, written whenever the content is saved. Feeds search. */
	searchBody: text('search_body'),
	/**
	 * What search looks in, weighted: title (A), subtitle (B), excerpt and In brief (C), story text
	 * (D). The database rebuilds it by itself whenever those change. The search_unaccent and
	 * search_array_text helpers are created in migration 0019.
	 */
	searchVector: tsvector('search_vector').generatedAlwaysAs(
		(): SQL => sql`
			setweight(to_tsvector('english', search_unaccent(coalesce(${posts.title}, ''))), 'A') ||
			setweight(to_tsvector('english', search_unaccent(coalesce(${posts.subtitle}, ''))), 'B') ||
			setweight(to_tsvector('english', search_unaccent(coalesce(${posts.excerpt}, '') || ' ' || search_array_text(${posts.tldr}))), 'C') ||
			setweight(to_tsvector('english', search_unaccent(coalesce(${posts.searchBody}, ''))), 'D')`
	),
	/** Every real word in the story, unstemmed. The typo fixer looks words up here. */
	searchWords: tsvector('search_words').generatedAlwaysAs(
		(): SQL => sql`
			to_tsvector('simple', search_unaccent(
				coalesce(${posts.title}, '') || ' ' || coalesce(${posts.subtitle}, '') || ' ' ||
				coalesce(${posts.excerpt}, '') || ' ' || search_array_text(${posts.tldr}) || ' ' ||
				coalesce(${posts.searchBody}, '')))`
	),
	featuredImage: text('featured_image'),
	isFeatured: boolean('is_featured').notNull().default(false),
	status: text('status').notNull().default('draft').$type<PostStatus>(),
	publishedAt: timestamp('published_at'),
	authorId: text('author_id')
		.notNull()
		.references(() => authors.id),
	categoryId: text('category_id').references(() => categories.id),
	readingTime: integer('reading_time'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const postTags = pgTable(
	'post_tags',
	{
		postId: text('post_id')
			.notNull()
			.references(() => posts.id, { onDelete: 'cascade' }),
		tagId: text('tag_id')
			.notNull()
			.references(() => tags.id, { onDelete: 'cascade' })
	},
	(t) => [primaryKey({ columns: [t.postId, t.tagId] })]
);

export const settings = pgTable('settings', {
	key: text('key').primaryKey(),
	value: text('value').notNull(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

/** Counters behind the sign-in lock and the sign-up limits. One row per thing being counted. */
export const rateLimits = pgTable('rate_limits', {
	key: text('key').primaryKey(),
	count: integer('count').notNull().default(0),
	windowStart: timestamp('window_start').notNull().defaultNow()
});

export const readHistory = pgTable(
	'read_history',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		postSlug: text('post_slug').notNull(),
		postTitle: text('post_title').notNull(),
		coverImageUrl: text('cover_image_url'),
		readAt: timestamp('read_at').defaultNow().notNull()
	},
	(table) => [unique().on(table.userId, table.postSlug)]
);

export const bookmarks = pgTable(
	'bookmarks',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		postSlug: text('post_slug').notNull(),
		postTitle: text('post_title').notNull(),
		coverImageUrl: text('cover_image_url'),
		savedAt: timestamp('saved_at').defaultNow().notNull()
	},
	(table) => [unique().on(table.userId, table.postSlug)]
);

export type CommentStatus = 'pending' | 'approved' | 'rejected';

export const emailSends = pgTable('email_sends', {
	id: text('id').primaryKey(),
	resendEmailId: text('resend_email_id'),
	type: text('type').notNull(),
	toEmail: text('to_email').notNull(),
	userId: text('user_id'),
	subject: text('subject').notNull(),
	lastEvent: text('last_event'),
	sentAt: timestamp('sent_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const comments = pgTable('comments', {
	id: text('id').primaryKey(),
	postSlug: text('post_slug').notNull(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	body: text('body').notNull(),
	status: text('status').notNull().default('pending').$type<CommentStatus>(),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});
